import { useEffect, useRef, useState } from 'react';
import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup } from 'codemirror';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { createCheckpoints, type SaveStatus } from './checkpoints.ts';

export function Editor() {
  const container = useRef<HTMLDivElement>(null);
  const [connection, setConnection] = useState('Connecting…');
  const [save, setSave] = useState<SaveStatus>('Unsaved changes');

  useEffect(() => {
    if (!container.current) return;
    const document = new Y.Doc();
    const editable = new Compartment();
    let connected = false;
    let loaded = false;
    let disposed = false;
    const checkpoints = createCheckpoints({
      canSend: () => connected && provider.synced && !provider.hasUnsyncedChanges,
      send: (payload) => {
        provider.sendStateless(payload);
      },
      status: setSave,
    });
    const provider = new HocuspocusProvider({
      url: `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/collaboration`,
      name: 'poc-document',
      document,
      awareness: null,
      onStatus({ status }) {
        if (disposed) return;
        connected = status === WebSocketStatus.Connected;
        setConnection(connected ? 'Connected' : loaded ? 'Reconnecting…' : 'Connecting…');
        if (!connected) checkpoints.disconnected();
      },
      onSynced({ state }) {
        if (disposed || !state) return;
        loaded = true;
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
        if (!disposed) setConnection('Document unavailable');
      },
    });
    const changed = () => {
      checkpoints.changed();
    };
    document.on('update', changed);
    const view = new EditorView({
      parent: container.current,
      state: EditorState.create({
        extensions: [
          basicSetup,
          markdown(),
          yCollab(document.getText('content'), null),
          editable.of(EditorState.readOnly.of(true)),
          EditorView.contentAttributes.of({ 'aria-label': 'Markdown document' }),
          EditorView.lineWrapping,
        ],
      }),
    });
    return () => {
      disposed = true;
      checkpoints.destroy();
      document.off('update', changed);
      view.destroy();
      provider.destroy();
      document.destroy();
    };
  }, []);

  return (
    <>
      <p role="status">
        {connection} · {save}
      </p>
      <div className="editor" ref={container} />
      <p className="note">
        Local development document. Offline edits remain in this tab until saved.
      </p>
    </>
  );
}
