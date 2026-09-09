import { useAsyncMarkup } from './useAsyncMarkup.ts';

export type DiagramRenderer = (source: string) => Promise<string>;

const loadAndRenderMermaid: DiagramRenderer = async (source) => {
  const { renderMermaid } = await import('./renderMermaid.ts');
  return renderMermaid(source);
};

export function MermaidDiagram({ source }: { source: string }) {
  return <MermaidDiagramView source={source} render={loadAndRenderMermaid} />;
}

/** The renderer argument keeps asynchronous behavior independently testable. */
export function MermaidDiagramView({
  source,
  render,
}: {
  source: string;
  render: DiagramRenderer;
}) {
  const markup = useAsyncMarkup(source, render);

  if (markup.status === 'ready') {
    return (
      <figure
        className="mermaid-diagram mermaid-diagram-rendered"
        aria-label="Mermaid diagram"
        // Mermaid sanitizes this SVG under `securityLevel: 'strict'`.
        dangerouslySetInnerHTML={{ __html: markup.html }}
      />
    );
  }

  return (
    <figure className="mermaid-diagram mermaid-diagram-source">
      <pre>
        <code className="language-mermaid">{source}</code>
      </pre>
      {markup.status === 'loading' ? (
        <figcaption role="status">Rendering diagram…</figcaption>
      ) : (
        <figcaption role="alert">This diagram could not be rendered. Check its syntax.</figcaption>
      )}
    </figure>
  );
}
