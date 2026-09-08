import { useEffect, useRef, useState } from 'react';
import type { SaveStatus } from './checkpoints.ts';
import { createEditorSession, type ConnectionStatus } from './session.ts';

export function Editor() {
  const container = useRef<HTMLDivElement>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('Connecting…');
  const [save, setSave] = useState<SaveStatus>('Unsaved changes');

  useEffect(() => {
    const parent = container.current;
    if (!parent) return; // the ref is always attached once mounted; this narrows the type
    const session = createEditorSession({
      container: parent,
      documentName: 'poc-document',
      onConnectionStatus: setConnection,
      onSaveStatus: setSave,
    });
    return () => {
      session.destroy();
    };
  }, []);

  return (
    <>
      <p role="status">
        {connection} · {save}
      </p>
      <div className="editor" ref={container} />
      <p className="note">
        Local development document. Offline edits remain in this tab until saved.
      </p>
    </>
  );
}
