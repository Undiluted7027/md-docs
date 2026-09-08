import { useEffect, useRef, useState } from 'react';
import type { Participant } from './presence.ts';

interface CollaborationControlsProps {
  participants: Participant[];
  canUndo: boolean;
  canRedo: boolean;
  canExport: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

export function CollaborationControls({
  participants,
  canUndo,
  canRedo,
  canExport,
  onUndo,
  onRedo,
  onExport,
}: CollaborationControlsProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyEditLink() {
    clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(location.href);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    resetTimer.current = setTimeout(() => {
      setCopyStatus('idle');
    }, 2500);
  }

  return (
    <aside className="collaboration-controls" aria-label="Collaboration controls">
      <div className="document-actions">
        <button type="button" className="secondary-button" disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" className="secondary-button" disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
        <button
          type="button"
          onClick={() => {
            void copyEditLink();
          }}
        >
          Copy edit link
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!canExport}
          onClick={onExport}
        >
          Export Markdown
        </button>
        <span className="copy-status" role="status">
          {copyStatus === 'copied' && 'Link copied'}
          {copyStatus === 'failed' && 'Could not copy link'}
        </span>
      </div>

      <div>
        <h2>Participants ({participants.length})</h2>
        <ul className="participant-list">
          {participants.map((participant) => (
            <li key={participant.clientId}>
              <span
                className="participant-color"
                style={{ backgroundColor: participant.color }}
                aria-hidden="true"
              />
              {participant.name}
              {participant.isLocal && ' (you)'}
            </li>
          ))}
        </ul>
      </div>

      <p className="note">Anyone with this link can read and edit the document and its title.</p>
    </aside>
  );
}
