# Markdown Docs: later work

Status: draft roadmap, not a delivery commitment

The [proof-of-concept spec](./poc-spec.md) defines what we build now. This document records possible follow-up work and the evidence that would justify it. Items here are intentionally excluded from the initial build.

## First follow-up: ownership and sharing permissions

Take this up before expanding beyond a controlled prototype or asking people to store important documents.

- Add sign-in and a durable owner identity.
- Let an owner grant view or edit access, revoke access, and rotate shared links.
- Enforce permissions for document reads, writes, exports, and live collaboration connections. Revocation must also affect existing sessions.
- Decide how anonymous prototype documents can be claimed without allowing someone with a copied edit link to take ownership unexpectedly.
- Define document deletion and its effect on active collaborators.

A first slice could support an owner plus separate revocable view and edit links. Named invitations and organization permissions can follow if users need them.

## Help people find and organize their work

Take this up when users create multiple documents and retaining links becomes frustrating.

- A home page listing owned and shared documents.
- Recent documents, search by title, and basic sorting.
- Rename, archive, delete, and restore flows with clear ownership rules.
- Folders or tags only when a flat document list becomes insufficient.

Start with a searchable list. Defer workspaces and nested folder hierarchies until there is evidence for them.

## Make collaboration useful beyond simultaneous editing

Take this up when people use documents asynchronously or need a review process.

- Comments attached to text ranges, with replies and resolution.
- Reliable comment anchors as surrounding text changes or is deleted.
- Mentions and notifications, with user-controlled delivery preferences.
- Suggested edits or approval workflows if direct editing is too permissive.

Comments are a smaller first step than a complete suggestions mode. Treat notification delivery as its own slice rather than bundling it into the first commenting feature.

## Recover earlier work

Take this up before users rely on the product for work they cannot easily recreate.

- Human-readable revision history and comparisons.
- Restore a prior revision without silently discarding collaborators' current work.
- Backup and restore procedures, with verified recovery tests.
- Clear retention rules for document history and deleted content.

Collaboration state is not automatically a usable version history or a backup. Define these guarantees separately.

## Improve the writing experience

Use observed editing friction to choose among these possibilities:

- Formatting shortcuts and discoverable Markdown help.
- Synchronized editor and preview scrolling.
- Find and replace, document outline, and heading navigation.
- Accessibility improvements informed by keyboard and screen-reader testing.
- Better touch editing and responsive layouts.
- Rich-text editing that preserves Markdown semantics.

Rich-text editing needs its own format decision: which Markdown constructs round-trip exactly, which normalize, and how unsupported syntax is represented. Prototype that behavior before committing to a second editing mode.

## Work offline across sessions

Take this up if users need to write while travelling or routinely lose connectivity.

- Persist pending edits locally across reloads and browser restarts.
- Open previously loaded documents without a network connection.
- Explain local-only versus server-saved state clearly.
- Handle revoked access, deleted documents, and stale local replicas on reconnect.
- Define local data retention and cleanup on shared devices.

This extends the initial prototype's brief, open-tab reconnect support into a durable offline workflow.

## Import, media, and portability

Take this up when plain Markdown export no longer covers users' existing workflows.

- Import `.md` files while preserving source and choosing a title explicitly.
- Upload images and attachments with access controls, storage limits, and deletion behavior.
- Export documents with their assets in a portable bundle.
- Support additional export formats when a specific sharing need warrants them.
- Consider Git import or synchronization only after defining conflict and ownership behavior between Git and live editing.

## Publishing and integrations

Take this up when people want to distribute finished documents or connect them to other tools.

- A deliberately published read-only page with an explicit unpublish action.
- A choice between a fixed published revision and a continuously updated document.
- Embeds, APIs, and webhooks driven by concrete integration needs.
- Templates for repeated document types.

Public publishing should be a distinct action with clear visibility, rather than an accidental consequence of sharing an edit link.

## Operational readiness

Take this up as deployment expands and usage becomes consequential.

- Establish supported document sizes, concurrent participant limits, and measurable latency targets.
- Add monitoring for failed saves, reconnect failures, and collaboration service health.
- Add abuse controls, rate limits, and storage quotas.
- Review token handling, authentication, authorization, rendered content, and dependency risks.
- Plan collaboration state compaction and migrations without breaking existing documents.
- Define deployment, backup, recovery, and incident procedures.

Basic correctness and safe Markdown rendering remain part of the proof of concept. This work establishes the operating guarantees needed for broader use.

## How to choose the next slice

After the prototype, watch two people use it to write a real document. Record where they hesitate, lose trust, or leave the product to finish the task.

Prioritize access and recovery guarantees before broader adoption. Then choose the smallest feature that addresses an observed problem: finding documents, reviewing changes, writing comfortably, or distributing finished work. Turn that feature into a separate spec with an explicit access model and acceptance criteria before implementation.
