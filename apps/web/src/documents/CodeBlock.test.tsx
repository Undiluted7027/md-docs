import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownPreview } from './MarkdownPreview.tsx';
import { highlightCode } from './highlightCode.ts';
import { supportedHighlightLanguage } from './highlightLanguages.ts';
import { hasMermaidConfiguration, renderMermaid } from './renderMermaid.ts';

test('recognizes the supported code fence names and aliases', () => {
  expect(supportedHighlightLanguage('typescript')).toBe('typescript');
  expect(supportedHighlightLanguage('TS')).toBe('typescript');
  expect(supportedHighlightLanguage('js')).toBe('javascript');
  expect(supportedHighlightLanguage('bash')).toBe('shellscript');
  expect(supportedHighlightLanguage('py')).toBe('python');
  expect(supportedHighlightLanguage('rust')).toBeUndefined();
});

test('leaves unknown and unlabelled fences as plain code', () => {
  const source = ['```rust', 'fn main() {}', '```', '', '```', '<plain>', '```'].join('\n');
  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html).toContain('class="language-rust"');
  expect(html).toContain('fn main() {}');
  expect(html).toContain('&lt;plain&gt;');
  expect(html).not.toContain('highlighted-code');
});

test('highlights supported code and escapes HTML-shaped source', async () => {
  const html = await highlightCode('const label = "<script>";', 'typescript');

  expect(html).toContain('class="shiki github-dark"');
  expect(html).toContain('<span');
  expect(html).toContain('&#x3C;script>');
  expect(html).not.toContain('<script>');
});

test('rejects Mermaid configuration before loading the renderer', async () => {
  const directive = '%%{init: { "securityLevel": "loose" }}%%\ngraph TD\nA-->B';
  const frontmatter = '---\nconfig:\n  htmlLabels: true\n---\ngraph TD\nA-->B';

  expect(hasMermaidConfiguration(directive)).toBe(true);
  expect(hasMermaidConfiguration(frontmatter)).toBe(true);
  expect(hasMermaidConfiguration('graph TD\nA-->B')).toBe(false);
  let rejection: unknown;
  try {
    await renderMermaid(directive);
  } catch (error) {
    rejection = error;
  }
  expect(rejection).toBeInstanceOf(Error);
  if (rejection instanceof Error) expect(rejection.message).toContain('configuration is disabled');
});
