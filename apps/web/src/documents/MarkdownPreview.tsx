import Markdown from 'react-markdown';
import rehypeKatex, { type Options as KatexOptions } from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodeBlock } from './CodeBlock.tsx';
// The `katex` dependency exists only for this stylesheet. Its version must match
// the katex that `rehype-katex` renders with (currently 0.16.x); a mismatched
// stylesheet misaligns the output.
import 'katex/dist/katex.min.css';

// Defined once so react-markdown sees a stable plugin list across renders.
const remarkPlugins = [remarkGfm, remarkMath];

// Documents are untrusted. KaTeX blocks commands that need trust, caps visual
// dimensions, and stops recursive macros after a bounded amount of work.
const katexOptions: KatexOptions = {
  trust: false,
  maxExpand: 1000,
  maxSize: 20,
  errorColor: '#9b2c2c',
};
const rehypePlugins: [typeof rehypeKatex, KatexOptions][] = [[rehypeKatex, katexOptions]];
const components = { pre: CodeBlock };

export function MarkdownPreview({ source }: { source: string }) {
  return (
    <section className="preview" aria-label="Markdown preview">
      <Markdown components={components} remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {source}
      </Markdown>
    </section>
  );
}
