# Markdown Docs: proof-of-concept spec

Status: draft

## Purpose

Build a shared Markdown document that two people can comfortably write together. Markdown is the source of truth; editing, previewing, sharing, and saving should feel straightforward.

The proof of concept succeeds when two people can write a real document together, reconnect after a brief interruption, and return later without losing acknowledged work.

## Scope

Ship one complete document workflow: create, edit, preview, share, collaborate, reopen, and export. No accounts are required for this prototype. Access is controlled by possession of a document's edit link.

### Create and reopen a document

- The landing page offers a create-document action.
- Creating a document produces a blank Markdown document, an editable title, and a unique edit URL.
- The title defaults to “Untitled document.”
- Opening that URL loads the saved title and content.
- A missing or invalid document link shows a clear unavailable-document state without creating a replacement.
- There is no document dashboard. People retain their links to revisit documents.

### Edit and preview

- Provide a Markdown source editor alongside a rendered preview on desktop.
- On narrow screens, allow switching between source and preview.
- Support headings, paragraphs, emphasis, links, ordered and unordered lists, blockquotes, fenced code blocks, and tables.
- Preserve Markdown source as entered; rendering must not rewrite it.
- Update the preview as content changes without moving the editor selection or stealing focus.
- Render Markdown safely: do not execute embedded HTML or scripts, and reject unsafe link protocols.
- Provide undo and redo for the current participant's edits without undoing another participant's work.

### Share and collaborate

- A share action copies the current document's edit link and confirms that it was copied.
- State clearly that anyone with this link can read and edit the document, including its title.
- Participants choose a display name before entering the editor; names are labels, not verified identities.
- Show connected participants and distinguish their cursors and selections with names and colors.
- Propagate title and content edits without requiring refreshes.
- Concurrent edits must converge to the same result on all connected clients. Do not use whole-document last-write-wins saves.
- Presence is temporary and should disappear after a participant disconnects or times out.

### Save and reconnect

- Persist title and content automatically on the server so that closing all clients does not remove the document.
- Show connection and persistence states: connecting, connected, reconnecting, unsaved changes, saved, and save failure as applicable.
- “Saved” means the server has acknowledged durable persistence, not merely received an update over a socket.
- Allow a loaded document to remain editable during a brief connection interruption while the page stays open.
- Reconnect automatically and merge pending changes with changes made by other participants.
- Never replace pending local changes with a stale server snapshot during reconnect.
- Clearly indicate when edits remain unsaved. Surviving a tab close or reload while offline is outside this prototype's guarantee.

### Export

- Download the current editor content as a UTF-8 `.md` file.
- Derive a safe filename from the title, with a fallback for an empty or unusable title.
- Export includes local edits currently visible in the editor, even if persistence is pending.
- The title is document metadata; do not silently insert it into the Markdown body.

## Access model and boundaries

Use an unguessable edit token in the document URL. Require it for reading, editing, and joining the collaboration session. Documents must not be publicly enumerable.

This is a controlled prototype for non-sensitive documents. There is no owner identity, view-only access, link revocation, or recovery for a lost link. Those require a subsequent access-control feature rather than an implied promise in the UI.

## Implementation constraints

- Use an established collaborative editing engine with a Markdown-capable source editor. Do not implement conflict resolution from scratch.
- Keep collaborative document state authoritative. Preview and export derive from that state; persistence must preserve enough information to merge reconnecting clients correctly.
- Synchronize the title through the same collaboration model or an equally explicit conflict policy.
- Keep presence separate from durable document content.
- Keep the deployment simple: one application, a collaboration service that may share its runtime, and durable storage. No microservice split is required.
- Use TypeScript with inferred types where practical. Avoid `any` and unnecessary abstractions.
- Select the concrete editor, collaboration library, persistence layer, and hosting approach during implementation. This draft does not commit to a stack.
- Follow [AGENTS.md](../AGENTS.md), including obtaining explicit permission before editing configuration files.

## Delivery slices

Each slice should work end to end and remain usable as the next slice is added.

1. **Single-user document:** create a document, edit title and Markdown, preview, persist, reopen, and export. Establish the collaboration-compatible state model here to avoid replacing the save model later.
2. **Shared editing:** join through an edit link, choose a name, see participants and cursors, and merge simultaneous edits.
3. **Persistence and reconnect:** make acknowledgement states accurate, handle temporary disconnects and save failures, and verify recovery across a server restart.

Sharing permissions beyond the edit link belong in [later work](./later-work.md).

## Acceptance criteria

The prototype is complete when these scenarios pass:

| Scenario                  | Required outcome                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Create and reopen         | A new document has a unique URL; reopening it restores the saved title and exact Markdown source.                     |
| Render and export         | Supported Markdown renders correctly, unsafe content cannot execute, and export matches the current source.           |
| Join from another browser | A second participant opens the link, chooses a name, and sees the same document and active participants.              |
| Simultaneous edits        | Edits at overlapping and separate positions converge to identical content on both clients.                            |
| Participant undo          | Undoing a local edit does not remove the other participant's independent edits.                                       |
| Temporary disconnect      | With one page disconnected, both participants edit; reconnection merges the changes and both clients converge.        |
| Durable save              | After “Saved,” closing all clients and restarting the server preserves the document.                                  |
| Save failure              | A failed persistence operation never shows “Saved”; the user sees pending or failed status and can export their work. |
| Invalid access            | Missing or invalid edit tokens cannot read, mutate, or subscribe to document state.                                   |

Use focused automated tests for convergence, persistence acknowledgement, and access checks where practical. Manually verify the two-browser flow, cursor behavior, preview layout, and narrow-screen switching. Avoid tests that simply mirror implementation details.

## Demo

Create a document in one browser and share it with a second browser. Write and edit concurrently, show participant cursors, briefly disconnect one page, make changes in both, and reconnect. Confirm matching content, wait for “Saved,” close both pages, restart the server, and reopen the link. Finish by downloading the Markdown file.

## Explicit exclusions

Accounts, ownership, granular permissions, document lists, folders, comments, version-history UI, rich-text editing, attachments, full offline support, imports, integrations, and public publishing are outside this scope. See [later work](./later-work.md) for the reasons to revisit them.
