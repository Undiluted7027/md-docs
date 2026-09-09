# Markdown Docs: proof-of-concept spec

Status: completed and deployed

- Deployed application: [md-docs-bwd.pages.dev](https://md-docs-bwd.pages.dev)
- Deployed API: [md-docs.onrender.com](https://md-docs.onrender.com)

## Purpose

The proof of concept established that two people can comfortably write the same
Markdown document, reconnect after a brief interruption, and return later without
losing acknowledged work.

Markdown remains the source of truth. Preview, collaboration, persistence, and
export all derive from the source without rewriting it.

## Delivered workflow

The POC supports one complete document workflow: create, edit, preview, share,
collaborate, reopen, and export. It does not require an account. Possession of a
document's unguessable edit link grants access.

### Create and reopen a document

- The root page creates a blank Markdown document with an editable title and a
  unique edit URL.
- New documents use “Untitled document” as their initial title.
- Opening the edit URL restores the saved title and content.
- Missing or invalid document links show an unavailable state and never create a
  replacement document.
- People retain their links to revisit documents; the POC has no document
  dashboard.

### Edit and preview

- Desktop layouts show a Markdown source editor beside a rendered preview.
- Narrow layouts provide a source and preview switch.
- The preview supports headings, paragraphs, emphasis, links, lists,
  blockquotes, fenced code blocks, tables, and the other syntax parsed by GFM.
- Preview rendering preserves the source and does not move the editor selection
  or steal focus.
- Embedded HTML and scripts do not execute, and unsafe link protocols are
  rejected.
- Undo and redo apply to the current participant's edits without removing
  another participant's independent work.

### Share and collaborate

- A share action copies the edit link and confirms the result.
- The interface explains that anyone with the link can read and edit the
  document, including its title.
- Participants choose an unverified display name before entering the editor.
- Connected participants, remote cursors, and selections appear with names and
  colors.
- Title and content edits propagate without a refresh.
- Concurrent edits converge through Yjs rather than whole-document
  last-write-wins saves.
- Presence is transient and disappears after a participant disconnects or times
  out.

### Save and reconnect

- The server automatically persists collaborative document state in Postgres.
- The interface distinguishes connecting, connected, reconnecting, unsaved,
  saved, and save-failure states.
- “Saved” means the server acknowledged a database checkpoint that covers the
  client's current edit generation.
- A loaded document remains editable during a temporary connection interruption
  while its tab stays open.
- Reconnection merges pending changes and does not replace them with a stale
  server snapshot.
- Failed saves remain visible and retry while connected.
- Offline edits do not survive closing or reloading the tab.

### Export

- Export downloads the current source as a UTF-8 `.md` file.
- The filename is derived safely from the title and has a fallback.
- Export includes local edits visible in the editor even when persistence is
  pending.
- The collaborative title remains metadata and is not inserted into the Markdown
  body.

## Access model and limitations

Document IDs are random UUIDs that also act as bearer edit tokens. The server
requires an existing token when opening or editing a document and when joining a
collaboration connection. Anyone who can open the document can export its current
source in the browser. Documents are not publicly enumerable.

This model is suitable only for non-sensitive trial documents. There is no owner,
view-only access, revocation, or recovery for a lost link. Signing in, once
implemented, will establish identity but will not change these access guarantees
until the server also implements ownership and authorization.

## Implemented architecture

- React and Vite provide the browser application.
- CodeMirror 6 provides the Markdown source editor.
- Yjs, `y-codemirror.next`, and Hocuspocus provide shared text, presence,
  participant-local undo, and automatic reconnection.
- Bun runs the workspace tooling and the Fastify/Hocuspocus server.
- Drizzle and Postgres persist Yjs binary state in the application-owned
  `md_docs` schema.
- A checkpoint request and reply distinguishes synchronization from durable
  persistence.
- Cloudflare Pages hosts the frontend, Render hosts the server, and Supabase
  hosts Postgres.

The implementation keeps one frontend, one server process, and one database.
Collaborative state remains authoritative, presence remains transient, and the
system does not implement its own conflict-resolution algorithm.

## Delivery record

The POC was delivered and reviewed as five end-to-end slices:

1. [POC 1: collaborative editing and durable persistence](https://github.com/Undiluted7027/md-docs/issues/1)
2. [POC 2: document creation, editing, preview, and reopening](https://github.com/Undiluted7027/md-docs/issues/2)
3. [POC 3: sharing, presence, remote cursors, and participant-local undo](https://github.com/Undiluted7027/md-docs/issues/3)
4. [POC 4: saving, recovery, export, and narrow-screen usability](https://github.com/Undiluted7027/md-docs/issues/4)
5. [POC 5: deployment and validation of the complete workflow](https://github.com/Undiluted7027/md-docs/issues/5)

The closed issues and their completion comments are the verification record for
the automated checks and manual browser walkthroughs.

## Acceptance record

| Scenario | Delivered outcome |
| --- | --- |
| Create and reopen | A new document receives a unique URL; reopening restores its saved title and exact source. |
| Render and export | Supported Markdown renders safely, and export matches the current source. |
| Join from another browser | A second participant joins through the link and sees the same document and presence. |
| Simultaneous edits | Overlapping and separate edits converge on both clients. |
| Participant undo | Undo removes the participant's own edit without removing another participant's work. |
| Temporary disconnect | Both participants can edit during an interruption and converge after reconnection. |
| Durable save | An acknowledged checkpoint survives closing clients and restarting the server. |
| Save failure | A failed write never reports “Saved”; current work remains exportable and retries later. |
| Invalid access | Missing and invalid document tokens cannot read, mutate, or subscribe to document state. |

## Work after the POC

Accounts, ownership, granular permissions, document lists, folders, comments,
version history, rich-text editing, attachments, durable offline access, imports,
integrations, and public publishing were intentionally excluded. The current
sequence and conditions for revisiting them are recorded in
[later-work.md](./later-work.md).
