import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MarkdownPreview } from './MarkdownPreview.tsx';
import { containsMathDelimiter } from './mathPlugins.ts';

afterEach(cleanup);

test('only treats a document with a dollar sign as needing math', () => {
  expect(containsMathDelimiter('# Notes\n\nNothing to compute here.')).toBe(false);
  expect(containsMathDelimiter('The budget is $5.')).toBe(true);
});

test('loads KaTeX and renders inline and display math', async () => {
  const source = ['Euler wrote $e^{i\\pi} + 1 = 0$.', '', '$$', '\\int_0^1 x^2 \\, dx', '$$'].join(
    '\n',
  );
  const view = render(<MarkdownPreview source={source} />);

  await waitFor(() => {
    expect(view.container.querySelector('.katex')).not.toBeNull();
  });
  expect(view.container.querySelector('.katex-display')).not.toBeNull();
  expect(view.container.textContent).toContain('Euler wrote');
});

test('renders escaped and unmatched dollar signs as text', async () => {
  const source = String.raw`The total is \$12. An unmatched $20 remains readable.`;
  const view = render(<MarkdownPreview source={source} />);

  // The delimiter check is loose, so KaTeX still loads; nothing becomes math.
  await waitFor(() => {
    expect(view.container.textContent).toContain(
      'The total is $12. An unmatched $20 remains readable.',
    );
  });
  expect(view.container.querySelector('.katex')).toBeNull();
});

test('shows invalid math locally without hiding surrounding content', async () => {
  const source = ['Before the expression.', '', '$\\frac{1}{$', '', 'After the expression.'].join(
    '\n',
  );
  const view = render(<MarkdownPreview source={source} />);

  await waitFor(() => {
    expect(view.container.querySelector('.katex-error')).not.toBeNull();
  });
  expect(view.container.textContent).toContain('Before the expression.');
  expect(view.container.textContent).toContain('After the expression.');
});

test('keeps the untrusted KaTeX limits: no trusted commands, capped size, bounded expansion', async () => {
  const source = [
    String.raw`$\includegraphics{https://example.com/tracker.png}$`,
    '',
    String.raw`$\rule{500em}{500em}$`,
    '',
    String.raw`$\def\loop{\loop}\loop$`,
  ].join('\n');
  const view = render(<MarkdownPreview source={source} />);

  await waitFor(() => {
    expect(view.container.querySelector('.katex-error')).not.toBeNull();
  });
  const html = view.container.innerHTML;
  expect(html).not.toContain('<img');
  expect(html).not.toMatch(/border-right-width:\s*500em/u);
  expect(html).toMatch(/border-right-width:\s*20em/u);
});
