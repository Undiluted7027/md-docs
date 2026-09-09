// Must stay first: Testing Library reads `document` when its module loads.
import { registerTestDom, unregisterTestDom } from '../testDom.ts';
import { afterAll, afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownPreview } from './MarkdownPreview.tsx';
import { parseProperties } from './properties.ts';
import { sectionUrl } from './sectionLinks.ts';

beforeEach(() => {
  registerTestDom();
  window.location.hash = '';
});
afterEach(cleanup);
afterAll(unregisterTestDom);

test('reads scalar and flat-list properties only from opening frontmatter', () => {
  const source = [
    '---',
    'status: Draft',
    'priority: 2',
    'published: false',
    'due: 2026-09-09',
    'tags: [docs, shared]',
    '---',
    '# Plan',
  ].join('\n');

  expect(parseProperties(source)).toEqual({
    status: 'valid',
    properties: [
      { name: 'status', value: 'Draft' },
      { name: 'priority', value: 2 },
      { name: 'published', value: false },
      { name: 'due', value: '2026-09-09' },
      { name: 'tags', value: ['docs', 'shared'] },
    ],
  });
  expect(parseProperties(['# Plan', '', '---', 'status: Draft', '---'].join('\n'))).toEqual({
    status: 'none',
  });
  expect(parseProperties('---\nstatus: Draft')).toEqual({ status: 'none' });

  // Trailing whitespace on either fence and CRLF endings still count as
  // frontmatter, matching remark-frontmatter, so the block is not also shown in
  // the body.
  const looseFences = parseProperties('--- \r\nstatus: Draft\r\n---\t\r\n# Plan');
  expect(looseFences).toEqual({
    status: 'valid',
    properties: [{ name: 'status', value: 'Draft' }],
  });
  const html = renderToStaticMarkup(
    <MarkdownPreview source={'--- \nstatus: Draft\n---\n# Plan'} />,
  );
  expect(html).not.toContain('status: Draft');
});

test('keeps property failures local and renders values as inert text', () => {
  const malformed = ['---', 'tags: [docs', '---', '# Body remains'].join('\n');
  const nested = ['---', 'owner:', '  name: Alex', '---', '# Body remains'].join('\n');
  const unsafeText = ['---', 'title: <img src=x onerror=alert(1)>', '---', '# Body'].join('\n');

  const malformedHtml = renderToStaticMarkup(<MarkdownPreview source={malformed} />);
  const nestedHtml = renderToStaticMarkup(<MarkdownPreview source={nested} />);
  const unsafeHtml = renderToStaticMarkup(<MarkdownPreview source={unsafeText} />);

  expect(malformedHtml).toContain('These properties could not be read');
  expect(malformedHtml).toContain('Body remains');
  expect(nestedHtml).toContain('nested or unsupported value');
  expect(nestedHtml).toContain('Body remains');
  expect(unsafeHtml).toContain('&lt;img src=x onerror=alert(1)&gt;');
  expect(unsafeHtml).not.toContain('<img');
});

test('creates prefixed, deterministic IDs for duplicate and hostile heading text', () => {
  const source = ['# Repeat', '# Repeat', '# markdown-source', '# document-properties-title'].join(
    '\n\n',
  );
  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html).toContain('id="document-heading-repeat"');
  expect(html).toContain('id="document-heading-repeat-1"');
  expect(html).toContain('id="document-heading-markdown-source"');
  expect(html).toContain('id="document-heading-document-properties-title"');
  expect(html).not.toContain('<h1 id="markdown-source"');
});

test('copies a section URL and reaches its heading on direct load', async () => {
  const copiedUrls: string[] = [];
  const writeText = mock((url: string) => {
    copiedUrls.push(url);
    return Promise.resolve();
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  const scrollIntoView = mock(() => undefined);
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  window.location.hash = '#document-heading-details';

  const view = render(<MarkdownPreview source="# Details" />);
  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
  await act(async () => {
    fireEvent.click(view.getByRole('button', { name: 'Copy link to this section' }));
    await Promise.resolve();
  });

  expect(writeText).toHaveBeenCalledTimes(1);
  expect(copiedUrls[0]).toEndWith('#document-heading-details');
  expect(
    sectionUrl('document-heading-details', 'https://example.com/documents/test-document'),
  ).toBe('https://example.com/documents/test-document#document-heading-details');
  expect(view.getByRole('button', { name: 'Copy link to this section' }).textContent).toBe(
    'Copied',
  );
});

test('renders repeated footnote references with accessible return links', () => {
  const source = [
    'First reference.[^shared] Another reference.[^shared]',
    '',
    '[^shared]: One shared footnote.',
  ].join('\n');
  const html = renderToStaticMarkup(<MarkdownPreview source={source} />);

  expect(html.match(/data-footnote-ref/g)).toHaveLength(2);
  expect(html).toContain('data-footnotes="true"');
  expect(html).toContain('aria-label="Back to reference 1"');
  expect(html).toContain('aria-label="Back to reference 1-2"');
  expect(html).not.toContain('section-link-button');
});

test('renders the five supported callouts and leaves unknown markers as blockquotes', () => {
  const supported = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']
    .map((type) => `> [!${type}]\n> ${type} content`)
    .join('\n\n');
  const supportedHtml = renderToStaticMarkup(<MarkdownPreview source={supported} />);
  const unknownHtml = renderToStaticMarkup(
    <MarkdownPreview source={'> [!QUESTION]\n> Still a quote'} />,
  );

  expect(supportedHtml.match(/<aside class="markdown-callout/g)).toHaveLength(5);
  for (const label of ['Note', 'Tip', 'Important', 'Warning', 'Caution']) {
    expect(supportedHtml).toContain(`<strong>${label}</strong>`);
  }
  expect(unknownHtml).toContain('<blockquote>');
  expect(unknownHtml).toContain('[!QUESTION]');
  expect(unknownHtml).not.toContain('markdown-callout');
});
