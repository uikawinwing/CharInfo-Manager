import { hasStatusPortrait } from '../char_info_shared/characterProfile.ts';
import { projectCharInfoMessage } from '../char_info_viewer/runtime/charInfoMessage.ts';
import { parseCharacterYaml } from '../char_info_viewer/services/yamlParser.ts';
import { matchesCharacterFieldRules } from '../char_info_viewer/services/characterCollapse.ts';
import {
  hasViewerPortrait,
  resolveCharacterVisualConfigWithExtensions,
} from '../char_info_viewer/services/themeService.ts';
import type { CharacterData } from '../char_info_viewer/types';
import { collectCurrentCharacterSnapshots, type CurrentCharacterSnapshot } from './currentCharacterLibrary.ts';
import {
  buildPortraitTarget,
  canSharePortrait,
  mergeGeneratedPortrait,
  mergePortraitHistory,
  mergePortraitAttempt,
  readGeneratedPortrait,
  readPortraitAttempt,
  readPortraitHistory,
  type PortraitAnchor,
  type PortraitTarget,
} from './portraitData.ts';
import { createPortraitJobs, type PortraitJobStatus } from './portraitJobs.ts';
import { createPortraitProvider, saveGeneratedPortrait, PortraitError } from './portraitProvider.ts';
import type { PortraitFormat, PortraitPrompt } from './portraitPrompt.ts';
import type { RuntimeViewState } from './types';

type StorySource = { renderKey: string; content: string };
export type StoryPortrait = { target: PortraitTarget; data: CharacterData; sameNameInMessage: boolean };

export function readStoryPortraits(messageId: number, swipeId: number, cards: readonly StorySource[]) {
  const sources = cards.flatMap(card => {
    const parsed = parseCharacterYaml(card.content);
    const name = parsed.success && typeof parsed.data.姓名 === 'string' ? parsed.data.姓名.trim() : '';
    return parsed.success && name ? [{ card, data: parsed.data, name }] : [];
  });
  const counts = new Map<string, number>();
  sources.forEach(({ name }) => counts.set(name, (counts.get(name) ?? 0) + 1));
  return new Map(
    sources.flatMap(({ card, data, name }) => {
      const sameNameInMessage = counts.get(name)! > 1;
      const target = buildPortraitTarget(
        data,
        { messageId, swipeId, renderKey: card.renderKey },
        false,
        sameNameInMessage,
      );
      return target ? [[card.renderKey, { data, target, sameNameInMessage }] as const] : [];
    }),
  );
}

function chatId(): string {
  const id = SillyTavern.getCurrentChatId();
  if (!id) return '';
  const group = SillyTavern.groupId;
  return JSON.stringify(group ? ['group', group, id] : ['character', SillyTavern.characterId, id]);
}

function getAnchor(messageId: number): PortraitAnchor | undefined {
  if (messageId < 0) return undefined;
  const message = getChatMessages(messageId, { include_swipes: true })[0];
  return message ? { messageId, swipeId: message.swipe_id } : undefined;
}

function latestRelationships(mvuData?: unknown): CurrentCharacterSnapshot[] {
  return collectCurrentCharacterSnapshots(
    mvuData ??
      (typeof Mvu === 'undefined' || getLastMessageId() < 0
        ? null
        : Mvu.getMvuData({ type: 'message', message_id: 'latest' })),
  );
}

function readStoryFloor(anchor: PortraitAnchor): StoryPortrait[] {
  const message = getChatMessages(anchor.messageId)[0];
  if (message?.role !== 'assistant' || message.is_hidden) return [];
  const { cards } = projectCharInfoMessage({
    ...anchor,
    text: message.message,
    maxCards: Number.MAX_SAFE_INTEGER,
  });
  return [...readStoryPortraits(anchor.messageId, anchor.swipeId, cards).values()];
}

function relationshipTarget(character: CurrentCharacterSnapshot, anchor?: PortraitAnchor) {
  return buildPortraitTarget({ ...character.data, 姓名: character.name }, anchor, true)!;
}

function linkStory(story: StoryPortrait, relationships: CurrentCharacterSnapshot[]): PortraitTarget {
  if (story.sameNameInMessage) return story.target;
  const matches = relationships.filter(character => character.name === story.target.name);
  if (matches.length !== 1 || !canSharePortrait(story.data, matches[0].data)) return story.target;
  const linked = relationshipTarget(matches[0], story.target.anchor);
  return { ...linked, prompt: story.target.prompt };
}

export function createPortraitRuntime(state: RuntimeViewState, onImageBound: () => void) {
  type Round = {
    chatId: string;
    beforeMessageId: number;
    knownNames: Set<string>;
    receivedId?: number;
    finished?: PortraitAnchor;
    mvuNewNames: Set<string>;
  };
  let round: Round | undefined;
  let historicalThrough = -1;
  const storyNames = new Set<string>();

  const provider = () =>
    createPortraitProvider(
      state.settings.portraitProvider,
      window.parent,
      SillyTavern.extensionSettings?.disabledExtensions,
      state.settings.portraitRewriteInstructions,
      state.settings.portraitOptions,
    );
  const variables = () => getVariables({ type: 'chat' });
  const enabled = () => state.settings.autoGeneratePortraits && state.settings.portraitProvider === 'baibai';

  function isAutomaticBlocked(target: PortraitTarget) {
    const story = target.anchor?.renderKey
      ? readStoryFloor(target.anchor).find(item => item.target.anchor?.renderKey === target.anchor!.renderKey)
      : undefined;
    const character = target.relationship ? latestRelationships().find(item => item.name === target.name) : undefined;
    return [story?.data, character && { ...character.data, 姓名: character.name }].some(data =>
      data && matchesCharacterFieldRules(data, state.settings.autoCollapseRules),
    );
  }

  function updateAvailability() {
    const selected = provider();
    const issue = selected.availability();
    state.portraitAvailability = issue ? { code: issue.code, message: issue.message } : null;
    if (!issue) state.portraitFormat = selected.format();
  }

  function report(target: PortraitTarget, status: PortraitJobStatus | undefined, archive = true) {
    if (target.chatId !== chatId()) return;
    state.portraitJobs = [
      ...(status ? [status] : []),
      ...state.portraitJobs.filter(previous => previous.key !== target.key),
    ].filter((item, index) => index < 24 || (item.phase !== 'completed' && item.phase !== 'failed'));
    if (archive && status && (status.phase === 'completed' || status.phase === 'failed')) {
      try {
        updateVariablesWith(current => mergePortraitHistory(current, status), { type: 'chat' });
      } catch {
        toastr.warning('酒馆未能保存本次立绘历史。');
      }
    }
  }

  const jobs = createPortraitJobs({
    provider,
    isCurrent(target) {
      if (!target.chatId || target.chatId !== chatId()) return false;
      const anchor = target.anchor;
      if (anchor && getAnchor(anchor.messageId)?.swipeId !== anchor.swipeId) return false;
      if (anchor?.renderKey) {
        const story = readStoryFloor(anchor).find(card => card.target.anchor?.renderKey === anchor.renderKey);
        if (
          !story ||
          (target.relationship ? linkStory(story, latestRelationships()).key : story.target.key) !== target.key
        ) {
          return false;
        }
      }
      if (!target.relationship) return true;
      const matches = latestRelationships().filter(character => character.name === target.name);
      return matches.length === 1 && relationshipTarget(matches[0]).key === target.key;
    },
    async hasAuthoredImage(target) {
      const current = variables();
      if (hasStatusPortrait(current, target.name)) return true;
      const visual = await resolveCharacterVisualConfigWithExtensions({ 姓名: target.name }, current);
      return hasViewerPortrait(visual);
    },
    claimAutomatic(target) {
      const current = variables();
      if (!enabled() || isAutomaticBlocked(target) || readPortraitAttempt(current, target.name) || readGeneratedPortrait(current, target.key))
        return false;
      updateVariablesWith(current => mergePortraitAttempt(current, target.name), { type: 'chat' });
      return true;
    },
    save: saveGeneratedPortrait,
    bind(target, url) {
      const updated = updateVariablesWith(current => mergeGeneratedPortrait(current, target.key, url), {
        type: 'chat',
      });
      if (readGeneratedPortrait(updated, target.key) !== url) throw new Error('Generated portrait was not bound');
      state.portraitRevision += 1;
      onImageBound();
    },
    report,
  });

  function updateHistory(beforeMessageId: number) {
    if (beforeMessageId <= historicalThrough) return;
    const messages = getChatMessages(`${historicalThrough + 1}-${beforeMessageId}`, {
      role: 'assistant',
      include_swipes: true,
    });
    for (const message of messages) {
      if (message.is_hidden) continue;
      message.swipes.forEach((text, swipeId) => {
        if (!/<char_info\b/i.test(text)) return;
        const { cards } = projectCharInfoMessage({
          text,
          messageId: message.message_id,
          swipeId,
          maxCards: Number.MAX_SAFE_INTEGER,
        });
        for (const { target } of readStoryPortraits(message.message_id, swipeId, cards).values())
          storyNames.add(target.name);
      });
    }
    historicalThrough = beforeMessageId;
  }

  function finishAutomatic(current: Round, includeStory: boolean) {
    if (round !== current || !enabled() || !current.finished || chatId() !== current.chatId) return;
    const anchor = current.finished;
    if (getAnchor(anchor.messageId)?.swipeId !== anchor.swipeId) return;
    updateHistory(current.beforeMessageId);
    const relationships = latestRelationships();
    const stories = readStoryFloor(anchor);
    const targets = new Map<string, PortraitTarget>();
    if (includeStory) {
      for (const story of stories) {
        if (!story.sameNameInMessage) targets.set(story.target.name, linkStory(story, relationships));
      }
    }
    for (const character of relationships) {
      if (!current.mvuNewNames.has(character.name)) continue;
      const storyMatches = stories.filter(story => story.target.name === character.name);
      if (
        storyMatches.length > 0 &&
        linkStory(storyMatches[0], relationships).key !== relationshipTarget(character).key
      ) {
        targets.delete(character.name);
        continue;
      }
      targets.set(
        character.name,
        storyMatches.length ? linkStory(storyMatches[0], relationships) : relationshipTarget(character, anchor),
      );
    }
    const saved = variables();
    for (const target of targets.values()) {
      if (current.knownNames.has(target.name) || storyNames.has(target.name) || readPortraitAttempt(saved, target.name))
        continue;
      if (readGeneratedPortrait(saved, target.key)) continue;
      if (isAutomaticBlocked(target)) continue;
      jobs.enqueue({ ...target, chatId: current.chatId }, target.prompt, true);
    }
  }

  return {
    history: () => chatId() ? readPortraitHistory(variables()) : [],
    updateAvailability,
    settingsChanged() {
      updateAvailability();
      if (!enabled()) {
        round = undefined;
        jobs.cancel(job => job.automatic, false);
      }
    },
    reset() {
      round = undefined;
      storyNames.clear();
      historicalThrough = -1;
      jobs.cancel(() => true);
      state.portraitJobs = [];
      state.portraitRevision += 1;
    },
    invalidateMessage(messageId: number) {
      if (round?.receivedId === messageId) round = undefined;
      historicalThrough = Math.min(historicalThrough, messageId - 1);
      jobs.cancel(job => job.target.anchor?.messageId === messageId);
    },
    generationStarted(type: string, dryRun: boolean) {
      round =
        !dryRun && type === 'normal' && enabled()
          ? {
              chatId: chatId(),
              beforeMessageId: getLastMessageId(),
              knownNames: new Set(latestRelationships().map(character => character.name)),
              mvuNewNames: new Set(),
            }
          : undefined;
    },
    messageReceived(messageId: number) {
      if (round && messageId > round.beforeMessageId) round.receivedId = messageId;
    },
    generationStopped() {
      round = undefined;
    },
    generationEnded() {
      const current = round;
      if (current?.receivedId === undefined || current.receivedId !== getLastMessageId()) return;
      current.finished = getAnchor(current.receivedId);
      // Let the existing renderer and MVU listeners finish the current event first.
      setTimeout(() => finishAutomatic(current, true), 0);
    },
    mvuUpdated(next: unknown, previous: unknown) {
      const current = round;
      if (!current || !enabled()) return;
      const before = new Set(latestRelationships(previous).map(character => character.name));
      for (const character of latestRelationships(next)) {
        if (!before.has(character.name)) current.mvuNewNames.add(character.name);
      }
      if (current.finished) setTimeout(() => finishAutomatic(current, false), 0);
    },
    storyView(story: StoryPortrait | undefined, current: Record<string, unknown>) {
      if (!story) return undefined;
      const linked = linkStory(story, state.library?.characters ?? []);
      return {
        target: { ...linked, chatId: chatId() },
        url: readGeneratedPortrait(current, linked.key) || readGeneratedPortrait(current, story.target.key),
      };
    },
    libraryView(
      character: CurrentCharacterSnapshot | undefined,
      current: Record<string, unknown>,
      includeAnchor = true,
    ) {
      if (!character) return undefined;
      if (includeAnchor && state.library?.characters.filter(item => item.name === character.name).length !== 1) {
        return undefined;
      }
      const anchor = includeAnchor ? getAnchor(getLastMessageId()) : undefined;
      const target = relationshipTarget(character, anchor);
      return {
        target: { ...target, chatId: chatId() },
        url: readGeneratedPortrait(current, target.key),
      };
    },
    async preparePrompt(target: PortraitTarget, description: string, format: PortraitFormat, signal: AbortSignal) {
      const deadline = AbortSignal.timeout(60_000);
      try {
        return await provider().preparePrompt(description, format, AbortSignal.any([signal, deadline]));
      } catch (error) {
        signal.throwIfAborted();
        const issue = deadline.aborted
          ? new PortraitError('提示词', 'PORTRAIT_REWRITE_TIMEOUT', '改写超时。可以重试，或直接填写生图提示词。')
          : error;
        if (issue instanceof PortraitError && !state.portraitJobs.some(
          job => job.key === target.key && job.phase !== 'completed' && job.phase !== 'failed',
        )) {
          report(target, { key: target.key, name: target.name, phase: 'failed', description, issue });
        }
        throw issue;
      }
    },
    submit(target: PortraitTarget, description: string, finalPrompt: PortraitPrompt) {
      jobs.enqueue(target, description, false, finalPrompt);
    },
    reportImageFailure(target: PortraitTarget, issue: PortraitError) {
      const previous = state.portraitJobs.find(job => job.key === target.key);
      if (previous && previous.phase !== 'completed' && previous.phase !== 'failed') return;
      report(target, { ...previous, key: target.key, name: target.name, phase: 'failed', issue }, false);
    },
  };
}

export type PortraitRuntime = ReturnType<typeof createPortraitRuntime>;
