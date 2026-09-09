import Markdown from 'react-markdown';
import rehypeKatex, { type Options as KatexOptions } from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { PluggableList } from 'unified';
import { CodeBlock } from './CodeBlock.tsx';
import { PropertiesPanel } from './PropertiesPanel.tsx';
import { previewHeadingComponents } from './SectionHeading.tsx';
import { remarkCallouts } from './remarkCallouts.ts';
import { headingIdPrefix, useSectionLinkNavigation } from './sectionLinks.ts';
// The `katex` dependency exists only for this stylesheet. Its version must match
// the katex that `rehype-katex` renders with (currently 0.16.x); a mismatched
// stylesheet misaligns the output.
import 'katex/dist/katex.min.css';

// Defined once so react-markdown sees a stable plugin list across renders.
const remarkPlugins = [remarkFrontmatter, remarkGfm, remarkMath, remarkCallouts];

// Documents are untrusted. KaTeX blocks commands that need trust, caps visual
// dimensions, and stops recursive macros after a bounded amount of work.
const katexOptions: KatexOptions = {
  trust: false,
  maxExpand: 1000,
  maxSize: 20,
  errorColor: '#9b2c2c',
};
const rehypePlugins: PluggableList = [
  [rehypeKatex, katexOptions],
  [rehypeSlug, { prefix: headingIdPrefix }],
];
const documentComponents = { pre: CodeBlock, ...previewHeadingComponents };
const exampleComponents = { pre: CodeBlock };

export function MarkdownPreview({
  source,
  sectionLinks = true,
}: {
  source: string;
  sectionLinks?: boolean;
}) {
  useSectionLinkNavigation(source, sectionLinks);

  return (
    <section className="preview" aria-label="Markdown preview">
      <PropertiesPanel source={source} />
      <Markdown
        components={sectionLinks ? documentComponents : exampleComponents}
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
      >
        {source}
      </Markdown>
    </section>
  );
}
