import { useEffect, useState } from 'react';
import { JoinDocument } from '../collaboration/JoinDocument.tsx';
import { documentExists } from './api.ts';
import { DocumentEditor } from './DocumentEditor.tsx';

// 'unavailable' means the server answered and the document is not there;
// 'error' means the check itself failed (offline, server down) and retrying may
// still succeed.
type AccessStatus = 'checking' | 'available' | 'unavailable' | 'error';

export function DocumentPage({ documentId }: { documentId: string }) {
  const [access, setAccess] = useState<AccessStatus>('checking');
  const [attempt, setAttempt] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setAccess('checking');
    void documentExists(documentId)
      .then((exists) => {
        if (active) setAccess(exists ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (active) setAccess('error');
      });
    return () => {
      active = false;
    };
  }, [documentId, attempt]);

  if (access === 'checking') return <p role="status">Opening document…</p>;
  if (access === 'unavailable') return <DocumentUnavailable />;
  if (access === 'error') {
    return (
      <section role="alert">
        <h1>Could not open document</h1>
        <p>The server may still be starting or temporarily unavailable.</p>
        <button
          onClick={() => {
            setAttempt((count) => count + 1);
          }}
        >
          Try again
        </button>
      </section>
    );
  }
  if (!displayName) return <JoinDocument onJoin={setDisplayName} />;
  return <DocumentEditor documentName={documentId} displayName={displayName} />;
}

export function DocumentUnavailable() {
  return (
    <section>
      <h1>Document unavailable</h1>
      <p>Check that you opened the complete edit link.</p>
    </section>
  );
}
