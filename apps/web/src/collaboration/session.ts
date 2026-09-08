import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup } from 'codemirror';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { Checkpoints, type SaveStatus } from './checkpoints.ts';

export type ConnectionStatus =
  | 'Connecting…'
  | 'Connected'
  | 'Reconnecting…'
  | 'Document unavailable';

interface EditorSessionOptions {
  container: HTMLElement;
  documentName: string;
  onConnectionStatus: (status: ConnectionStatus) => void;
  onSaveStatus: (status: SaveStatus) => void;
}

/**
 * Connects a CodeMirror editor to a collaborative document: it reports
 * connection status, unlocks the editor once the document has loaded, drives
 * autosave checkpoints, and tears everything down on `destroy()`. The React
 * component only mounts this and renders the two status strings it reports.
 */
export function createEditorSession(options: EditorSessionOptions) {
  const doc = new Y.Doc();
  const editable = new Compartment();
  let connected = false;
  let everLoaded = false;
  let disposed = false;

  const checkpoints = new Checkpoints({
    canSend: () => connected && provider.synced && !provider.hasUnsyncedChanges,
    send: (payload) => {
      provider.sendStateless(payload);
    },
    status: options.onSaveStatus,
  });

  const provider = new HocuspocusProvider({
    url: collaborationUrl(),
    name: options.documentName,
    document: doc,
    awareness: null,
    onStatus({ status }) {
      if (disposed) return;
      connected = status === WebSocketStatus.Connected;
      options.onConnectionStatus(
        connected ? 'Connected' : everLoaded ? 'Reconnecting…' : 'Connecting…',
      );
      if (!connected) checkpoints.disconnected();
    },
    onSynced({ state }) {
      if (disposed || !state) return;
      everLoaded = true;
      view.dispatch({ effects: editable.reconfigure(EditorState.readOnly.of(false)) });
      checkpoints.ready();
    },
    onUnsyncedChanges({ number }) {
      if (!disposed && number === 0) checkpoints.ready();
    },
    onStateless({ payload }) {
      if (!disposed) checkpoints.receive(payload);
    },
    onAuthenticationFailed() {
      if (!disposed) options.onConnectionStatus('Document unavailable');
    },
  });

  const onDocUpdate = () => {
    checkpoints.changed();
  };
  doc.on('update', onDocUpdate);

  const view = new EditorView({
    parent: options.container,
    state: EditorState.create({
      extensions: [
        basicSetup,
        markdown(),
        yCollab(doc.getText('content'), null),
        editable.of(EditorState.readOnly.of(true)),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown document' }),
        EditorView.lineWrapping,
      ],
    }),
  });

  return {
    destroy() {
      disposed = true;
      checkpoints.destroy();
      doc.off('update', onDocUpdate);
      view.destroy();
      provider.destroy();
      doc.destroy();
    },
  };
}

function collaborationUrl() {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}/collaboration`;
}
