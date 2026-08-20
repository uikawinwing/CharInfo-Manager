type EjsTemplateRuntimeApi = {
  prepareContext?: (additionalContext?: Record<string, unknown>, lastMessageId?: number) => Promise<Record<string, unknown>>;
  evalTemplate?: (
    code: string,
    context?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<string>;
  evaltemplate?: (
    code: string,
    context?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<string>;
  saveVariables?: () => Promise<void>;
};

type WindowWithEjsTemplate = Window & typeof globalThis & { EjsTemplate?: EjsTemplateRuntimeApi };

function resolveEjsTemplateRuntime(): EjsTemplateRuntimeApi {
  const candidates = [window, window.parent].filter(
    (candidate, index, list): candidate is WindowWithEjsTemplate => !!candidate && list.indexOf(candidate) === index,
  );

  for (const candidate of candidates) {
    try {
      const runtime = candidate.EjsTemplate;
      if (runtime?.prepareContext && (runtime.evalTemplate || runtime.evaltemplate) && runtime.saveVariables) return runtime;
    } catch (_) {
      // parent window may be inaccessible in some host contexts
    }
  }

  throw new Error('未检测到 ST-Prompt-Template 的 EjsTemplate 接口。');
}

async function evaluateCreatorEjs(code: string, debugEnabled: boolean, when: string): Promise<void> {
  const runtime = resolveEjsTemplateRuntime();
  const evaluate = runtime.evalTemplate ?? runtime.evaltemplate;
  if (!runtime.prepareContext || !evaluate || !runtime.saveVariables) {
    throw new Error('EjsTemplate 接口不完整，无法安全执行并保存受管理 EJS。');
  }

  const context = await runtime.prepareContext();
  await evaluate.call(runtime, code, context, {
    logging: debugEnabled,
    when,
  });
  await runtime.saveVariables();
}

export async function evaluateManagedEjs(code: string, debugEnabled = false): Promise<void> {
  await evaluateCreatorEjs(code, debugEnabled, 'char-info-creator-apply');
}

export async function writeStatusGallerySnapshotToCurrentChat(
  characterName: string,
  images: ReadonlyArray<{ title: string; url: string }>,
  debugEnabled = false,
): Promise<void> {
  const path = `status.externalGalleries.partners[${JSON.stringify(characterName)}].images`;
  const code = `<%_\nsetLocalVar(${JSON.stringify(path)}, ${JSON.stringify(images)});\n_%>`;
  await evaluateCreatorEjs(code, debugEnabled, 'char-info-creator-status-gallery-save');
}
