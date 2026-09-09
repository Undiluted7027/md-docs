import { useState } from 'react';
import { DISPLAY_NAME_MAX_LENGTH } from './presence.ts';
import { DocumentIcon, DocumentWelcome } from '../documents/DocumentChrome.tsx';

const DISPLAY_NAME_KEY = 'md-docs-display-name';

export function JoinDocument({ onJoin }: { onJoin: (displayName: string) => void }) {
  // Pre-fill from a previous visit, but still require an explicit join so the
  // name other participants will see is confirmed every time.
  const [displayName, setDisplayName] = useState(readSavedDisplayName);

  function submit() {
    const name = displayName.trim();
    if (!name) return;
    saveDisplayName(name);
    onJoin(name);
  }

  return (
    <DocumentWelcome>
      <section className="join-document">
        <span className="document-gate-icon">
          <DocumentIcon name="page" />
        </span>
        <p className="document-eyebrow">YOUR PLACE ON THE PAGE</p>
        <h1>Come on in.</h1>
        <p>Choose the name other participants will see while you are here.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            autoComplete="name"
            autoFocus
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            required
            placeholder="e.g. Alex"
            aria-describedby="display-name-note"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
            }}
          />
          <button type="submit" disabled={!displayName.trim()}>
            Join document <DocumentIcon name="arrow" />
          </button>
        </form>
        <p className="note" id="display-name-note">
          Display names are labels, not verified identities.
        </p>
        <div className="document-access-note">
          <DocumentIcon name="link" />
          <p>
            Anyone with this link can read and edit. Use this space for non-sensitive documents.
          </p>
        </div>
      </section>
    </DocumentWelcome>
  );
}

function readSavedDisplayName() {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveDisplayName(displayName: string) {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  } catch {
    // The name still works for this page when browser storage is unavailable.
  }
}
