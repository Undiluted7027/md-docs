import { useRef, useState } from 'react';
import { createDocument } from '../documents/api.ts';

export function CreateDocument() {
  const pending = useRef(false);
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  async function create() {
    // Guard immediately, including clicks before React renders the disabled state.
    if (pending.current) return;
    pending.current = true;
    setCreating(true);
    setFailed(false);
    try {
      const document = await createDocument();
      location.assign(`/documents/${document.id}`);
    } catch {
      pending.current = false;
      setCreating(false);
      setFailed(true);
    }
  }

  return (
    <div className="landing-create">
      <div className="landing-actions">
        <button
          id="create-document"
          type="button"
          className="landing-primary"
          aria-describedby="edit-link-note"
          disabled={creating}
          onClick={() => void create()}
        >
          {creating ? 'Creating…' : 'Create document'}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 19 19 5M5 5h14v14" />
          </svg>
        </button>
        <a className="landing-text-link" href="#try-editor">
          Try the editor
        </a>
      </div>
      <p id="edit-link-note" className="landing-access-note">
        Anyone with the edit link can read and edit. Use it for non-sensitive documents.
      </p>
      <p className="landing-create-status" role="status">
        {creating ? 'Opening your document. The server may take a moment to wake up.' : ''}
      </p>
      {failed && (
        <p className="landing-create-error" role="alert">
          The server may still be starting. Wait a moment and try again.
        </p>
      )}
    </div>
  );
}
