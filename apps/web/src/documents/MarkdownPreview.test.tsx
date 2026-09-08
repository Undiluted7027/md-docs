import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownPreview } from './MarkdownPreview.tsx';

test('renders GFM while leaving raw HTML inert and removing unsafe links', () => {
  const source = [
    '| Item | Done |',
    '| --- | --- |',
    '| Preview | yes |',
    '',
    '<script>alert("unsafe")</script>',
    '[unsafe](javascript:alert("unsafe"))',
  ].join('\n');

  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html).toContain('<table>');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('javascript:');
});
