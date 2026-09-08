import type { SaveStatus } from './checkpoints.ts';
import type { ConnectionStatus } from './session.ts';

interface DocumentStatusProps {
  connection: ConnectionStatus;
  save: SaveStatus;
  loaded: boolean;
}

export function DocumentStatus({ connection, save, loaded }: DocumentStatusProps) {
  return (
    <div className="document-status">
      <p role="status" aria-live="polite">
        <span>Connection: {connection}</span>
        <span>Save: {save}</span>
      </p>
      <RecoveryNotice connection={connection} save={save} loaded={loaded} />
    </div>
  );
}

interface RecoveryNoticeProps {
  connection: ConnectionStatus;
  save: SaveStatus;
  loaded: boolean;
}

function RecoveryNotice({ connection, save, loaded }: RecoveryNoticeProps) {
  if (!loaded && connection === 'Connecting…') {
    return <p className="recovery-note">Waiting for the server before opening the editor.</p>;
  }
  if (connection === 'Reconnecting…') {
    return (
      <p className="recovery-note">
        Keep this tab open. You can continue editing and export your work while reconnection is in
        progress.
      </p>
    );
  }
  if (save === 'Save failed — retrying') {
    return (
      <p className="recovery-note">
        Your changes remain in this tab and can be exported while saving retries.
      </p>
    );
  }
  return null;
}
