import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Defined once so react-markdown sees a stable plugin list across renders.
const remarkPlugins = [remarkGfm];

export function MarkdownPreview({ source }: { source: string }) {
  return (
    <section className="preview" aria-label="Markdown preview">
      <Markdown remarkPlugins={remarkPlugins}>{source}</Markdown>
    </section>
  );
}
