import { useEffect, useRef, useState } from 'react';
import type { SaveStatus } from '../collaboration/checkpoints.ts';
import { createEditorSession, type ConnectionStatus } from '../collaboration/session.ts';
import { MarkdownPreview } from './MarkdownPreview.tsx';

export function DocumentEditor({ documentName }: { documentName: string }) {
  const container = useRef<HTMLDivElement>(null);
  const session = useRef<ReturnType<typeof createEditorSession>>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('Connecting…');
  const [save, setSave] = useState<SaveStatus>('Unsaved changes');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const parent = container.current;
    if (!parent) return; // the ref is always attached once mounted; this narrows the type
    session.current = createEditorSession({
      container: parent,
      documentName,
      onConnectionStatus: setConnection,
      onSaveStatus: setSave,
      onTitleChange: setTitle,
      onContentChange: setContent,
      onLoaded: () => {
        setLoaded(true);
      },
    });
    return () => {
      session.current?.destroy();
      session.current = null;
    };
  }, [documentName]);

  return (
    <>
      <header className="document-header">
        <input
          aria-label="Document title"
          className="document-title"
          disabled={!loaded}
          value={title}
          onChange={(event) => session.current?.setTitle(event.target.value)}
        />
        <p role="status">
          {connection} · {save}
        </p>
      </header>
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
      <p className="note">Keep this URL. Anyone with it can read and edit the document.</p>
    </>
  );
}
