import { useEffect, useRef, useState } from 'react';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { MarkdownPreview } from '../documents/MarkdownPreview.tsx';

const exampleSource = `# A weekend worth writing about

A short plan, made **together**.

## Saturday

- [x] Pick a walking route
- [ ] Find a place for lunch
- [ ] Leave room for a detour

> A plan is a starting point.
`;

/** A local example using the product's editor and renderer, without a shared session. */
export default function EditorExample() {
  const container = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(exampleSource);
  const [mobileView, setMobileView] = useState<'source' | 'preview'>('source');

  useEffect(() => {
    if (!container.current) return;
    const editor = new EditorView({
      parent: container.current,
      doc: exampleSource,
      extensions: [
        markdown(),
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          'aria-label': 'Try editing Markdown',
          'aria-describedby': 'example-note',
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setSource(update.state.doc.toString());
        }),
      ],
    });
    return () => {
      editor.destroy();
    };
  }, []);

  return (
    <>
      <div className="landing-example-frame">
        <header className="landing-example-header">
          <span className="landing-example-filename">weekend-plans.md</span>
          <span>Editable example</span>
        </header>
        <div className="landing-view-switch" role="group" aria-label="Example view">
          <button
            type="button"
            aria-pressed={mobileView === 'source'}
            aria-controls="example-source"
            onClick={() => {
              setMobileView('source');
            }}
          >
            Markdown
          </button>
          <button
            type="button"
            aria-pressed={mobileView === 'preview'}
            aria-controls="example-preview"
            onClick={() => {
              setMobileView('preview');
            }}
          >
            Live preview
          </button>
        </div>
        <div className="landing-example-panes" data-view={mobileView}>
          <div id="example-source" className="landing-example-source">
            <h3>Markdown</h3>
            <div ref={container} />
          </div>
          <div id="example-preview" className="landing-example-preview">
            <h3>Live preview</h3>
            <MarkdownPreview source={source} sectionLinks={false} />
          </div>
        </div>
      </div>
      <p id="example-note">
        Try editing the source. This example stays in this tab and isn’t saved.
      </p>
    </>
  );
}
