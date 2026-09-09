import { useCallback } from 'react';
import type { HighlightLanguage } from './highlightCode.ts';
import { useAsyncMarkup } from './useAsyncMarkup.ts';

const loadAndHighlight = async (source: string, language: HighlightLanguage) => {
  const { highlightCode } = await import('./highlightCode.ts');
  return highlightCode(source, language);
};

export function HighlightedCodeBlock({
  source,
  language,
}: {
  source: string;
  language: HighlightLanguage;
}) {
  const render = useCallback((code: string) => loadAndHighlight(code, language), [language]);
  const markup = useAsyncMarkup(source, render);

  if (markup.status === 'ready') {
    return (
      <div
        className="highlighted-code"
        // Shiki escapes source code before producing its highlighted HTML.
        dangerouslySetInnerHTML={{ __html: markup.html }}
      />
    );
  }

  return (
    <pre className="code-block-fallback">
      <code className={`language-${language}`}>{source}</code>
    </pre>
  );
}
