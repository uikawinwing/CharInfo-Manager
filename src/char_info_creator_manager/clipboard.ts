export type ClipboardCopyMethod = 'clipboard' | 'fallback';

export type ClipboardCopyDependencies = {
  writeText: (text: string) => Promise<void>;
  fallbackCopy: (text: string) => boolean;
};

export async function copyTextWithFallback(
  text: string,
  dependencies: ClipboardCopyDependencies,
): Promise<ClipboardCopyMethod> {
  try {
    await dependencies.writeText(text);
    return 'clipboard';
  } catch (clipboardError) {
    if (dependencies.fallbackCopy(text)) return 'fallback';
    throw clipboardError;
  }
}

export function copyTextWithDocumentSelection(text: string): boolean {
  const textarea = document.createElement('textarea');
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute('aria-hidden', 'true');
  Object.assign(textarea.style, {
    position: 'fixed',
    inset: '0 auto auto -9999px',
    width: '1px',
    height: '1px',
    opacity: '0',
  });

  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
    if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
  }
}
