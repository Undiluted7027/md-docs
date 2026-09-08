import { useState } from 'react';
import { createDocument } from './api.ts';

export function CreateDocument() {
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  async function create() {
    setCreating(true);
    setFailed(false);
    try {
      const document = await createDocument();
      location.assign(`/documents/${document.id}`);
    } catch {
      setCreating(false);
      setFailed(true);
    }
  }

  return (
    <section className="create-document">
      <h1>Markdown Docs</h1>
      <p>Create a Markdown document you can return to through its private edit link.</p>
      <button type="button" disabled={creating} onClick={() => void create()}>
        {creating ? 'Creating…' : 'Create document'}
      </button>
      {failed && <p role="alert">Could not create a document. Please try again.</p>}
    </section>
  );
}
