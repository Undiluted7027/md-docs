import { expect, test } from 'bun:test';
import { createMarkdownExport, markdownFilename } from './exportMarkdown.ts';

test('exports the current Markdown exactly without adding the document title', async () => {
  const source = [
    '# Existing heading',
    '',
    'Café ☕ — Euler: $e^{i\\pi} + 1 = 0$',
    '',
    'Price: \\$12',
    '',
    '```mermaid',
    'graph TD',
    'A-->B',
    '```',
    '',
    '```ts',
    'const answer = 42;',
    '```',
    '',
  ].join('\n');
  const exported = createMarkdownExport('Planning notes', source);

  expect(exported.filename).toBe('Planning-notes.md');
  expect(exported.blob.type).toBe('text/markdown;charset=utf-8');
  expect(await exported.blob.text()).toBe(source);
});

test('builds safe filenames and falls back when the title is unusable', () => {
  expect(markdownFilename('  Roadmap: Q4 / launch?.md  ')).toBe('Roadmap-Q4-launch.md');
  expect(markdownFilename('...')).toBe('document.md');
  expect(markdownFilename('CON')).toBe('document.md');
});
