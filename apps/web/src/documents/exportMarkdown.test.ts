import { expect, test } from 'bun:test';
import { createMarkdownExport, markdownFilename } from './exportMarkdown.ts';

test('exports the current Markdown exactly without adding the document title', async () => {
  const source = '# Existing heading\n\nCafé ☕ — Euler: $e^{i\\pi} + 1 = 0$\n\nPrice: \\$12\n';
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
