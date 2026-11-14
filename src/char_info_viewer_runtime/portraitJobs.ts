import type { PortraitTarget } from './portraitData.ts';
import type { PortraitPrompt } from './portraitPrompt.ts';
import { PortraitError, type PortraitPhase, type PortraitProvider, type PortraitStage } from './portraitProvider.ts';

export type PortraitJobStatus = {
  key: string;
  name: string;
  phase: PortraitPhase;
  description?: string;
  sentPrompt?: PortraitPrompt;
  requestPrompt?: PortraitPrompt;
  imageUrl?: string;
  issue?: { stage: PortraitStage; code: string; message: string };
};

export const PORTRAIT_PHASE_LABELS: Record<PortraitPhase, string> = {
  queued: '等待生成',
  rewriting: '改写提示词',
  requesting: '请求中',
  generating: '生成中',
  saving: '保存中',
  completed: '已完成',
  failed: '失败',
};

type Job = { target: PortraitTarget; description: string; finalPrompt?: PortraitPrompt; automatic: boolean };
type PortraitJobDependencies = {
  provider(): PortraitProvider;
  isCurrent(target: PortraitTarget): boolean;
  hasAuthoredImage(target: PortraitTarget): Promise<boolean>;
  claimAutomatic(target: PortraitTarget): boolean;
  save(data: string, id: string, signal: AbortSignal): Promise<string>;
  bind(target: PortraitTarget, url: string): void;
  report(target: PortraitTarget, status: PortraitJobStatus | undefined): void;
  timeoutMs?: number;
};

export function createPortraitJobs(deps: PortraitJobDependencies) {
  const queue: Job[] = [];
  let active: { job: Job; controller: AbortController } | undefined;

  function report(job: Job, phase: PortraitPhase, details: Pick<PortraitJobStatus, 'sentPrompt' | 'requestPrompt' | 'imageUrl' | 'issue'> = {}) {
    deps.report(job.target, {
      key: job.target.key,
      name: job.target.name,
      phase,
      description: job.description,
      ...details,
    });
  }

  async function run(job: Job, controller: AbortController) {
    const { target } = job;
    const { signal } = controller;
    let stage: PortraitStage = '资料';
    let sentPrompt: PortraitPrompt | undefined;
    let requestPrompt: PortraitPrompt | undefined;
    const stale = () =>
      new PortraitError('关联角色', 'TARGET_CHANGED', '角色资料或消息页已变化，请在当前角色卡重新发起。');
    const checkCurrent = () => {
      signal.throwIfAborted();
      if (!deps.isCurrent(target)) throw stale();
    };
    const timer = setTimeout(
      () =>
        controller.abort(
          new PortraitError(stage, 'REQUEST_TIMEOUT', '等待超时，请检查酒馆和生图扩展的任务状态后重试。'),
        ),
      deps.timeoutMs ?? 5 * 60_000,
    );
    let onAbort: () => void;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      await Promise.race([
        aborted,
        (async () => {
          checkCurrent();
          if (await deps.hasAuthoredImage(target)) {
            deps.report(target, undefined);
            return;
          }
          checkCurrent();
          stage = '生图扩展';
          const provider = deps.provider();
          const unavailable = provider.availability();
          if (unavailable) throw unavailable;
          if (job.automatic && !deps.claimAutomatic(target)) {
            deps.report(target, undefined);
            return;
          }
          const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
            byte.toString(16).padStart(2, '0'),
          ).join('');
          let prompt = job.finalPrompt;
          if (!prompt) {
            stage = '提示词';
            report(job, 'rewriting');
            prompt = await provider.preparePrompt(job.description, provider.format(), signal);
            checkCurrent();
          }
          stage = '生图扩展';
          const backendIssue = provider.availability();
          if (backendIssue) throw backendIssue;
          const data = await provider.generate(prompt, signal, (phase, submitted) => {
            if (signal.aborted) return;
            sentPrompt = prompt;
            if (submitted) requestPrompt = submitted;
            report(job, phase, { sentPrompt, requestPrompt });
          }, target.name);
          checkCurrent();
          if (!data) throw new PortraitError('图片结果', 'EMPTY_IMAGE', '生图扩展未返回图片，请检查扩展后重试。');
          stage = '保存图片';
          report(job, 'saving', { sentPrompt, requestPrompt });
          const url = await deps.save(data, id, signal);
          checkCurrent();
          stage = '关联角色';
          if (await deps.hasAuthoredImage(target)) {
            deps.report(target, undefined);
            return;
          }
          checkCurrent();
          deps.bind(target, url);
          report(job, 'completed', { sentPrompt, requestPrompt, imageUrl: url });
        })(),
      ]);
    } catch (error) {
      const failure =
        error instanceof PortraitError
          ? error
          : new PortraitError(stage, 'PORTRAIT_FAILED', '未能完成这一步，请检查当前聊天和生图扩展后重试。');
      if (failure.code === 'TARGET_CHANGED') deps.report(target, undefined);
      else report(job, 'failed', { sentPrompt, requestPrompt, issue: { stage: failure.stage, code: failure.code, message: failure.message } });
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort!);
    }
  }

  function next() {
    if (active) return;
    const job = queue.shift();
    if (!job) return;
    const controller = new AbortController();
    active = { job, controller };
    void run(job, controller).finally(() => {
      active = undefined;
      next();
    });
  }

  return {
    enqueue(target: PortraitTarget, description: string, automatic = false, finalPrompt?: PortraitPrompt) {
      const normalized = (finalPrompt?.tags ?? description).trim();
      if (!normalized || active?.job.target.key === target.key || queue.some(job => job.target.key === target.key))
        return;
      const job = { target, description: description.trim(), finalPrompt, automatic };
      queue.push(job);
      report(job, 'queued');
      next();
    },
    cancel(predicate: (job: Job) => boolean, includeActive = true) {
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        if (!predicate(queue[index])) continue;
        const [job] = queue.splice(index, 1);
        deps.report(job.target, undefined);
      }
      if (includeActive && active && predicate(active.job)) {
        deps.report(active.job.target, undefined);
        active.controller.abort(new PortraitError('关联角色', 'TARGET_CHANGED', '当前角色或消息页已变化。'));
      }
    },
  };
}
