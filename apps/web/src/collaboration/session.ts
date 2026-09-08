import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
  WebSocketStatus,
  type onStatelessParameters,
  type onStatusParameters,
  type onSyncedParameters,
  type onUnsyncedChangesParameters,
} from '@hocuspocus/provider';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import * as Y from 'yjs';
import { Checkpoints, type SaveStatus } from './checkpoints.ts';
import {
  normalizeDisplayName,
  participantColor,
  participantsFromAwareness,
  type Participant,
} from './presence.ts';
import { createDocumentUndoManager } from './undo.ts';

export type ConnectionStatus =
  'Connecting…' | 'Connected' | 'Reconnecting…' | 'Document unavailable';

interface EditorSessionOptions {
  container: HTMLElement;
  documentName: string;
  displayName: string;
  onConnectionStatus: (status: ConnectionStatus) => void;
  onSaveStatus: (status: SaveStatus) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onParticipantsChange: (participants: Participant[]) => void;
  onUndoStateChange: (state: { canUndo: boolean; canRedo: boolean }) => void;
  onLoaded: () => void;
}

/**
 * The CodeMirror editor extensions, adapted from the upstream `basicSetup` in the
 * `codemirror` package. Two deliberate differences: the built-in `history()` is
 * left out and `yUndoManagerKeymap` is added, so that Ctrl/Cmd-Z in the editor
 * drives the shared Y.UndoManager instead of a second, collaboration-unaware undo
 * stack that could revert another participant's edits. Search, lint and
 * autocomplete extras from `basicSetup` are dropped; the POC does not use them.
 */
const editorSetup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  keymap.of([...yUndoManagerKeymap, ...defaultKeymap, ...foldKeymap]),
];

/**
 * Connects a CodeMirror editor to a collaborative document: it reports
 * connection status, unlocks the editor once the document has loaded, drives
 * autosave checkpoints, reports title and content changes, and tears everything
 * down on `destroy()`.
 */
export function createEditorSession(options: EditorSessionOptions) {
  const doc = new Y.Doc();
  const title = doc.getText('title');
  const content = doc.getText('content');
  const editable = new Compartment();
  const titleOrigin = Symbol('local title edit');
  const undoManager = createDocumentUndoManager([title, content], titleOrigin);
  let connected = false;
  let everLoaded = false;
  let disposed = false;

  const websocketProvider = new HocuspocusProviderWebsocket({ url: collaborationUrl() });
  const provider = new HocuspocusProvider({
    websocketProvider,
    name: options.documentName,
    document: doc,
  });
  const awareness = provider.awareness;
  if (!awareness) throw new Error('Collaboration awareness was not created');

  const localColor = participantColor(doc.clientID);
  awareness.setLocalStateField('user', {
    name: normalizeDisplayName(options.displayName),
    color: localColor.color,
    colorLight: localColor.colorLight,
  });

  // The editor stays read-only until the document finishes its first sync.
  const view = new EditorView({
    parent: options.container,
    state: EditorState.create({
      extensions: [
        editorSetup,
        markdown(),
        yCollab(content, awareness, { undoManager }),
        editable.of(EditorState.readOnly.of(true)),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown document' }),
        EditorView.lineWrapping,
      ],
    }),
  });

  const checkpoints = new Checkpoints({
    canSend: () => connected && provider.synced && !provider.hasUnsyncedChanges,
    send: (payload) => {
      provider.sendStateless(payload);
    },
    status: options.onSaveStatus,
  });

  provider.on('status', ({ status }: onStatusParameters) => {
    if (disposed) return;
    connected = status === WebSocketStatus.Connected;
    options.onConnectionStatus(
      connected ? 'Connected' : everLoaded ? 'Reconnecting…' : 'Connecting…',
    );
    if (!connected) checkpoints.disconnected();
  });
  provider.on('synced', ({ state }: onSyncedParameters) => {
    if (disposed || !state) return;
    if (!everLoaded) {
      everLoaded = true;
      view.dispatch({ effects: editable.reconfigure(EditorState.readOnly.of(false)) });
      options.onLoaded();
    }
    options.onTitleChange(title.toJSON());
    options.onContentChange(content.toJSON());
    checkpoints.ready();
  });
  provider.on('unsyncedChanges', ({ number }: onUnsyncedChangesParameters) => {
    if (!disposed && number === 0) checkpoints.ready();
  });
  provider.on('stateless', ({ payload }: onStatelessParameters) => {
    if (!disposed) checkpoints.receive(payload);
  });
  provider.on('authenticationFailed', () => {
    if (!disposed) options.onConnectionStatus('Document unavailable');
  });

  const reportParticipants = () => {
    options.onParticipantsChange(
      participantsFromAwareness(awareness.getStates(), awareness.clientID),
    );
  };
  const reportUndoState = () => {
    options.onUndoStateChange({
      canUndo: undoManager.undoStack.length > 0,
      canRedo: undoManager.redoStack.length > 0,
    });
  };

  const onDocUpdate = () => {
    checkpoints.changed();
  };
  const onTitleUpdate = () => {
    options.onTitleChange(title.toJSON());
  };
  const onContentUpdate = () => {
    options.onContentChange(content.toJSON());
  };
  doc.on('update', onDocUpdate);
  title.observe(onTitleUpdate);
  content.observe(onContentUpdate);
  awareness.on('change', reportParticipants);
  undoManager.on('stack-item-added', reportUndoState);
  undoManager.on('stack-item-popped', reportUndoState);
  undoManager.on('stack-cleared', reportUndoState);
  reportParticipants();
  reportUndoState();
  provider.attach();

  return {
    setTitle(nextTitle: string) {
      doc.transact(() => {
        replaceText(title, nextTitle);
      }, titleOrigin);
    },
    undo() {
      undoManager.undo();
    },
    redo() {
      undoManager.redo();
    },
    destroy() {
      disposed = true;
      checkpoints.destroy();
      doc.off('update', onDocUpdate);
      title.unobserve(onTitleUpdate);
      content.unobserve(onContentUpdate);
      awareness.off('change', reportParticipants);
      undoManager.off('stack-item-added', reportUndoState);
      undoManager.off('stack-item-popped', reportUndoState);
      undoManager.off('stack-cleared', reportUndoState);
      view.destroy();
      provider.destroy();
      websocketProvider.destroy();
      undoManager.destroy();
      doc.destroy();
    },
  };
}

/**
 * Applies `next` to a Y.Text by rewriting only the span that actually changed:
 * skip the shared prefix, skip the shared suffix, replace the middle. Deleting
 * and reinserting the whole string instead would make concurrent title edits
 * from two users concatenate their full values rather than merge, so this keeps
 * the title behaving like the CRDT-merged content editor.
 */
export function replaceText(text: Y.Text, next: string) {
  const current = text.toJSON();

  let start = 0;
  const shared = Math.min(current.length, next.length);
  while (start < shared && current[start] === next[start]) start += 1;

  let endCurrent = current.length;
  let endNext = next.length;
  while (endCurrent > start && endNext > start && current[endCurrent - 1] === next[endNext - 1]) {
    endCurrent -= 1;
    endNext -= 1;
  }

  if (endCurrent > start) text.delete(start, endCurrent - start);
  if (endNext > start) text.insert(start, next.slice(start, endNext));
}

function collaborationUrl() {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}/collaboration`;
}
