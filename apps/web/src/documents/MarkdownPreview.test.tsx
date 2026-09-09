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

test('renders inline and display math', () => {
  const source = ['Euler wrote $e^{i\\pi} + 1 = 0$.', '', '$$', '\\int_0^1 x^2 \\, dx', '$$'].join(
    '\n',
  );

  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html).toContain('class="katex"');
  expect(html).toContain('class="katex-display"');
  expect(html).toContain('Euler wrote');
});

test('keeps escaped and unmatched dollar signs as text', () => {
  const source = String.raw`The total is \$12. An unmatched $20 remains readable.`;

  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html).toContain('The total is $12. An unmatched $20 remains readable.');
  expect(html).not.toContain('class="katex"');
});

test('shows invalid math locally without hiding surrounding content', () => {
  const source = ['Before the expression.', '', '$\\frac{1}{$', '', 'After the expression.'].join(
    '\n',
  );

  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html).toContain('Before the expression.');
  expect(html).toContain('class="katex-error"');
  expect(html).toContain('After the expression.');
});

test('blocks trusted commands and enforces expansion and size limits', () => {
  const source = [
    String.raw`$\includegraphics{https://example.com/tracker.png}$`,
    '',
    String.raw`$\rule{500em}{500em}$`,
    '',
    String.raw`$\def\loop{\loop}\loop$`,
  ].join('\n');

  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html).not.toContain('<img');
  expect(html).not.toContain('border-right-width:500em');
  expect(html).toContain('border-right-width:20em');
  expect(html).toContain('class="katex-error"');
});
