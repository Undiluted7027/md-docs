import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import type { PluggableList } from 'unified';
import { CodeBlock } from './CodeBlock.tsx';
import { containsMathDelimiter, loadMathPlugins, type MathPlugins } from './mathPlugins.ts';
import { PropertiesPanel } from './PropertiesPanel.tsx';
import { previewHeadingComponents } from './SectionHeading.tsx';
import { remarkCallouts } from './remarkCallouts.ts';
import { headingIdPrefix, useSectionLinkNavigation } from './sectionLinks.ts';

// Stable references so react-markdown does not rebuild its pipeline needlessly.
// KaTeX (remark-math + rehype-katex) is not here: it loads on demand for
// documents that contain math, see `mathPlugins.ts`.
const baseRemarkPlugins = [remarkFrontmatter, remarkGfm, remarkCallouts];
const baseRehypePlugins: PluggableList = [[rehypeSlug, { prefix: headingIdPrefix }]];
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

  const needsMath = containsMathDelimiter(source);
  const [mathPlugins, setMathPlugins] = useState<MathPlugins | null>(null);

  useEffect(() => {
    if (!needsMath || mathPlugins) return;
    let active = true;
    void loadMathPlugins().then((plugins) => {
      if (active) setMathPlugins(plugins);
    });
    return () => {
      active = false;
    };
  }, [needsMath, mathPlugins]);

  const remarkPlugins = mathPlugins
    ? [...baseRemarkPlugins, ...mathPlugins.remark]
    : baseRemarkPlugins;
  const rehypePlugins = mathPlugins
    ? [...mathPlugins.rehype, ...baseRehypePlugins]
    : baseRehypePlugins;

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
