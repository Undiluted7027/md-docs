import { useState } from 'react';
import { DISPLAY_NAME_MAX_LENGTH } from './presence.ts';

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
    <section className="join-document">
      <h1>Join document</h1>
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
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
          }}
        />
        <button type="submit" disabled={!displayName.trim()}>
          Join document
        </button>
      </form>
      <p className="note">Display names are labels, not verified identities.</p>
    </section>
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
