import { useEffect, useRef, useState } from 'react';
import type { SaveStatus } from '../collaboration/checkpoints.ts';
import { CollaborationControls } from '../collaboration/CollaborationControls.tsx';
import type { Participant } from '../collaboration/presence.ts';
import { createEditorSession, type ConnectionStatus } from '../collaboration/session.ts';
import { MarkdownPreview } from './MarkdownPreview.tsx';

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
        <input
          aria-label="Document title"
          className="document-title"
          disabled={!loaded}
          value={title}
          onChange={(event) => session.current?.setTitle(event.target.value)}
          onKeyDown={handleTitleUndo}
        />
        <p role="status">
          {connection} · {save}
        </p>
      </header>
      <CollaborationControls
        participants={participants}
        canUndo={undoState.canUndo}
        canRedo={undoState.canRedo}
        onUndo={() => session.current?.undo()}
        onRedo={() => session.current?.redo()}
      />
      <div className="document-workspace">
        <section aria-label="Markdown source">
          <h2>Markdown</h2>
          <div className="editor" ref={container} />
        </section>
        <section>
          <h2>Preview</h2>
          <MarkdownPreview source={content} />
        </section>
      </div>
    </>
  );
}
