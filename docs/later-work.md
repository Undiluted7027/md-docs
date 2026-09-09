# Markdown Docs: post-POC roadmap

Status: active roadmap, not a delivery commitment

The [proof of concept](./poc-spec.md) is complete and deployed. This document
separates planned tickets from the next product foundations and ideas that still
need evidence.

## How to read this roadmap

- **Planned** work has an open GitHub issue with a defined scope and acceptance
  criteria.
- **Next** work has a clear place in the product sequence but still needs its own
  implementation ticket.
- **Conditional** work should begin only when user behavior demonstrates the need.
- **Operating gates** are safeguards that must arrive before the corresponding
  level of use.

Each implementation ticket should remain an end-to-end feature slice. Complete
and review one slice before beginning the next unless the tickets are explicitly
independent.

## Planned work

The current ticket sequence improves Markdown rendering, explains the product,
and establishes user identity:

1. [#8: Render LaTeX math in Markdown preview](https://github.com/Undiluted7027/md-docs/issues/8)
2. [#9: Render Mermaid diagrams and highlight fenced code](https://github.com/Undiluted7027/md-docs/issues/9)
3. [#10: Add properties, section links, footnotes, and callouts](https://github.com/Undiluted7027/md-docs/issues/10)
4. [#11: Build a proper product landing page](https://github.com/Undiluted7027/md-docs/issues/11)
5. [#12: Add Supabase authentication with email/password and Google](https://github.com/Undiluted7027/md-docs/issues/12)

Ticket #12 establishes a durable user identity. It does not make documents
account-private: edit links remain bearer credentials until ownership and
authorization are implemented on the server.

## Next: ownership and sharing permissions

Take this up immediately after authentication and before asking people to store
sensitive or important documents.

- Give new documents created by a signed-in person a durable owner.
- Enforce authorization for document reads, edits, exports, HTTP operations, and
  live collaboration connections.
- Support separate revocable view and edit links.
- Apply revocation to active collaboration sessions as well as future requests.
- Separate a document's stable identity from its access secrets so links can be
  rotated without replacing the document.
- Store only hashed access tokens where practical.
- Define deletion and its effect on connected participants.

Existing anonymous documents should remain in their current link-access mode.
They have no trustworthy owner to infer. Do not silently assign ownership to the
first signed-in person who opens an old link. A later copy-to-account flow is
safer than claiming the original document.

Start with one owner and revocable links. Named invitations, teams, organizations,
and complex roles can wait for evidence.

## Next: a personal document workspace

Build this after ownership exists, because a dashboard needs a reliable answer to
which documents belong to a person.

- List documents owned by the signed-in person.
- List documents explicitly shared with that person when named sharing exists.
- Show recent documents and support search by title.
- Allow rename, archive, restore, and delete with clear ownership checks.
- Give empty, loading, and unavailable states useful actions.

Start with one searchable list. Add folders or tags only after a flat list becomes
hard to use.

## Next: recovery guarantees

Take this up before users rely on the product for work they cannot easily
recreate.

- Capture human-readable document revisions at deliberate checkpoints.
- Compare revisions and restore one without silently discarding current
  collaborative work.
- Define retention for revisions and deleted documents.
- Establish database backup and restore procedures.
- Verify restoration from a real backup rather than assuming collaborative state
  also serves as history.

Version history and infrastructure backups solve different problems and should be
specified as separate slices.

## Conditional: asynchronous collaboration

Take this up when people use documents for review across different working hours.

- Attach comments to text ranges.
- Keep anchors understandable as nearby text changes or disappears.
- Add replies and resolution before adding a full suggestion mode.
- Add mentions only with a clear notification destination.
- Treat notification delivery and preferences as their own slice.
- Consider suggested edits or approval workflows if direct editing proves too
  permissive.

## Conditional: writing improvements

Use observed editing friction to choose the next small improvement:

- Formatting shortcuts and concise Markdown help
- Synchronized source and preview scrolling
- Find and replace
- Document outline and heading navigation
- Keyboard, screen-reader, touch, and responsive-layout improvements
- A rich-text editing mode

Rich-text editing requires a format decision before implementation: define which
constructs round-trip exactly, which normalize, and how unsupported Markdown
remains editable.

Advanced Markdown should be added selectively. A syntax extension should preserve
the source, degrade understandably in other Markdown tools, solve a demonstrated
writing need, and render safely. Wikilinks and backlinks also require document
lookup, access checks, rename behavior, and unresolved-link handling.

## Conditional: offline work across sessions

Take this up when users need to write while travelling or regularly lose
connectivity.

- Persist pending edits across reloads and browser restarts.
- Open previously loaded documents without a network connection.
- Distinguish local-only work from server-saved work.
- Resolve revoked access, deleted documents, and stale replicas on reconnect.
- Define retention and cleanup of local document data on shared devices.

This extends the POC's open-tab reconnection behavior. It requires an explicit
security model once documents have owners and revocable access.

## Conditional: import, media, and portability

Take this up when exact-source Markdown export no longer covers users' workflows.

- Import `.md` files while preserving their source and selecting a title.
- Upload images and attachments with access controls, file limits, and deletion
  behavior.
- Export documents and their assets as a portable bundle.
- Add another export format only for a specific distribution need.
- Consider Git import or synchronization only after defining ownership and
  conflicts between Git changes and live collaborative edits.

## Conditional: publishing and integrations

Take this up when people want to distribute finished documents outside the
editing experience.

- Publish a deliberate read-only page with an explicit unpublish action.
- Choose whether publication follows the live document or a fixed revision.
- Add templates for repeated document types.
- Add embeds, APIs, or webhooks for concrete integration needs.

Publishing must be an explicit visibility change. Sharing an edit link must never
publish a document accidentally.

## Operating gates

Some operational work belongs beside product features rather than at the end of
the roadmap.

### Before public account creation

- Configure reliable production email delivery for confirmation and password
  recovery.
- Apply sensible authentication and document-creation rate limits.
- Record authentication failures without logging credentials or tokens.
- Document account and document-access limitations honestly.

### Before storing important documents

- Complete ownership and authorization.
- Verify database backups and restoration.
- Define retention and deletion behavior.
- Monitor failed saves and repeated reconnect failures.

### Before meaningful scale

- Establish supported document sizes, participant limits, and latency targets.
- Add storage quotas and abuse controls.
- Test collaboration-state compaction and migrations.
- Decide how multiple server instances coordinate document state before running
  more than one collaboration process.
- Maintain deployment, recovery, and incident procedures.

## Choosing later slices

Watch people use the deployed product for real documents. Record where they lose
trust, cannot find work, leave the product to finish a task, or ask for the same
missing behavior.

Choose the smallest slice that resolves a repeated problem. Give it an explicit
access model, failure behavior, acceptance criteria, and operating assumptions
before implementation. Keep speculative features in this document until that
evidence exists.
