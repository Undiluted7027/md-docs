import { useEffect, useRef, useState } from 'react';
import type { Participant } from './presence.ts';
import { DocumentIcon } from '../documents/DocumentChrome.tsx';

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
        <div className="document-history-actions" role="group" aria-label="Edit history">
          <button type="button" className="secondary-button" disabled={!canUndo} onClick={onUndo}>
            <DocumentIcon name="undo" /> Undo
          </button>
          <button type="button" className="secondary-button" disabled={!canRedo} onClick={onRedo}>
            <DocumentIcon name="redo" /> Redo
          </button>
        </div>
        <button
          type="button"
          className="secondary-button document-export"
          disabled={!canExport}
          onClick={onExport}
        >
          <DocumentIcon name="export" /> Export Markdown
        </button>
      </div>

      <div className="document-participants">
        <h2>Participants ({participants.length})</h2>
        <ul className="participant-list">
          {participants.map((participant) => (
            <li key={participant.clientId}>
              <span
                className="participant-color"
                style={{ backgroundColor: participant.color }}
                aria-hidden="true"
              />
              <span className="participant-name">
                {participant.name}
                {participant.isLocal && ' (you)'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="document-share">
        <button
          type="button"
          aria-describedby="document-link-access"
          onClick={() => {
            void copyEditLink();
          }}
        >
          <DocumentIcon name="link" /> Copy edit link
        </button>
        <span className="copy-status" role="status">
          {copyStatus === 'copied' && 'Link copied'}
          {copyStatus === 'failed' && 'Could not copy link'}
        </span>
      </div>

      <p className="note document-link-access" id="document-link-access">
        Anyone with this link can read and edit the document and its title.
      </p>
    </aside>
  );
}
