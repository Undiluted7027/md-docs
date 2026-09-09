import { useEffect, useRef, useState } from 'react';
import type { SaveStatus } from '../collaboration/checkpoints.ts';
import { CollaborationControls } from '../collaboration/CollaborationControls.tsx';
import { DocumentStatus } from '../collaboration/DocumentStatus.tsx';
import type { Participant } from '../collaboration/presence.ts';
import { createEditorSession, type ConnectionStatus } from '../collaboration/session.ts';
import { MarkdownPreview } from './MarkdownPreview.tsx';
import { downloadMarkdown } from './exportMarkdown.ts';
import { DocumentIcon } from './DocumentChrome.tsx';

type DocumentView = 'source' | 'preview';

interface DocumentEditorProps {
  documentName: string;
  displayName: string;
}

export function DocumentEditor({ documentName, displayName }: DocumentEditorProps) {
  const container = useRef<HTMLDivElement>(null);
  const session = useRef<ReturnType<typeof createEditorSession>>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('Connecting…');
  const [save, setSave] = useState<SaveStatus>('Unsaved changes');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false });
  const [loaded, setLoaded] = useState(false);
  const [documentView, setDocumentView] = useState<DocumentView>('source');

  useEffect(() => {
    const parent = container.current;
    if (!parent) return; // the ref is always attached once mounted; this narrows the type
    session.current = createEditorSession({
      container: parent,
      documentName,
      displayName,
      onConnectionStatus: setConnection,
      onSaveStatus: setSave,
      onTitleChange: setTitle,
      onContentChange: setContent,
      onParticipantsChange: setParticipants,
      onUndoStateChange: setUndoState,
      onLoaded: () => {
        setLoaded(true);
      },
    });
    return () => {
      session.current?.destroy();
      session.current = null;
    };
  }, [documentName, displayName]);

  // The plain <input> has no CodeMirror keymap, so it mirrors yUndoManagerKeymap
  // by hand: Ctrl/Cmd-Z undoes, Ctrl/Cmd-Y and Ctrl/Cmd-Shift-Z redo. Both route
  // to the same shared undo manager the editor and toolbar use.
  function handleTitleUndo(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key !== 'z' && key !== 'y') return;

    event.preventDefault();
    if (key === 'y' || event.shiftKey) session.current?.redo();
    else session.current?.undo();
  }

  return (
    <>
      <header className="document-header">
        <div className="document-title-group">
          <label className="document-eyebrow" htmlFor="document-title">
            SHARED DOCUMENT
          </label>
          <input
            id="document-title"
            aria-label="Document title"
            className="document-title"
            disabled={!loaded}
            value={title}
            placeholder={loaded ? 'Untitled document' : 'Opening document…'}
            onChange={(event) => session.current?.setTitle(event.target.value)}
            onKeyDown={handleTitleUndo}
          />
        </div>
        <DocumentStatus connection={connection} save={save} loaded={loaded} />
      </header>
      <CollaborationControls
        participants={participants}
        canUndo={undoState.canUndo}
        canRedo={undoState.canRedo}
        canExport={loaded}
        onUndo={() => session.current?.undo()}
        onRedo={() => session.current?.redo()}
        onExport={() => {
          downloadMarkdown(title, content);
        }}
      />
      <div className="mobile-view-switch" role="group" aria-label="Document view">
        <button
          type="button"
          className="secondary-button"
          aria-controls="markdown-source"
          aria-pressed={documentView === 'source'}
          onClick={() => {
            setDocumentView('source');
          }}
        >
          <DocumentIcon name="source" /> Source
        </button>
        <button
          type="button"
          className="secondary-button"
          aria-controls="markdown-preview"
          aria-pressed={documentView === 'preview'}
          onClick={() => {
            setDocumentView('preview');
          }}
        >
          <DocumentIcon name="preview" /> Preview
        </button>
      </div>
      {/* data-mobile-view is read only by the narrow-screen CSS, which hides the
          pane that is not selected. On wide screens both panes always show. */}
      <div className="document-workspace" data-mobile-view={documentView}>
        <section id="markdown-source" className="source-pane" aria-label="Markdown source">
          <div className="document-pane-heading">
            <h2>
              <DocumentIcon name="source" /> Markdown
            </h2>
            <span>The way you write</span>
          </div>
          <div className="editor" ref={container} />
        </section>
        <section id="markdown-preview" className="preview-pane">
          <div className="document-pane-heading">
            <h2>
              <DocumentIcon name="preview" /> Live preview
            </h2>
            <span>The way it reads</span>
          </div>
          {loaded && !content && (
            <div className="document-preview-empty">
              <DocumentIcon name="page" />
              <p>Your ideas, taking shape.</p>
              <span>
                Start writing in Markdown.
                <br />
                Your preview appears here as you type.
              </span>
            </div>
          )}
          <MarkdownPreview source={content} />
        </section>
      </div>
      <footer className="document-editor-footer">
        <span>Plain text. Shared space.</span>
        <span>Keep this link to return. Wait for “Saved” before closing.</span>
      </footer>
    </>
  );
}
