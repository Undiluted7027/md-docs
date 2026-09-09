import { useEffect, useState } from 'react';
import { JoinDocument } from '../collaboration/JoinDocument.tsx';
import { documentExists } from './api.ts';
import { DocumentEditor } from './DocumentEditor.tsx';
import { DocumentIcon, DocumentWelcome } from './DocumentChrome.tsx';
import { DocumentUnavailable } from './DocumentUnavailable.tsx';

// 'unavailable' means the server answered and the document is not there;
// 'error' means the check itself failed (offline, server down) and retrying may
// still succeed.
type AccessStatus = 'checking' | 'available' | 'unavailable' | 'error';

export default function DocumentPage({ documentId }: { documentId: string }) {
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

  if (access === 'checking')
    return (
      <DocumentWelcome>
        <section className="document-gate" role="status">
          <span className="document-gate-icon document-opening">
            <DocumentIcon name="page" />
          </span>
          <p className="document-eyebrow">JUST A MOMENT</p>
          <h1>Opening document…</h1>
          <p>Getting your shared space ready. The server may take a moment to wake up.</p>
        </section>
      </DocumentWelcome>
    );
  if (access === 'unavailable') return <DocumentUnavailable />;
  if (access === 'error') {
    return (
      <DocumentWelcome>
        <section className="document-gate" role="alert">
          <span className="document-gate-icon">
            <DocumentIcon name="link" />
          </span>
          <p className="document-eyebrow">LET’S TRY THAT AGAIN</p>
          <h1>Could not open document</h1>
          <p>The server may still be starting or temporarily unavailable.</p>
          <button
            onClick={() => {
              setAttempt((count) => count + 1);
            }}
          >
            Try again <DocumentIcon name="arrow" />
          </button>
        </section>
      </DocumentWelcome>
    );
  }
  if (!displayName) return <JoinDocument onJoin={setDisplayName} />;
  return <DocumentEditor documentName={documentId} displayName={displayName} />;
}
