# Quire Supervisor & Revision Workflow — Step 20

Step 20 adds structured supervisor feedback, review rounds and manuscript version history without allowing feedback to silently overwrite the researcher's writing.

## Review rounds

A review round represents a draft or chapter submitted for supervisor/reviewer feedback.

A round records:

- title
- supervisor / reviewer
- scope: whole thesis or one chapter
- submitted date
- optional response-due date
- notes
- status

Statuses are:

- Draft
- Awaiting feedback
- Feedback received
- Revising
- Complete

Creating a review round immediately stores read-only section snapshots for every section included in the selected scope.

This preserves exactly what the researcher considered to be the submitted draft.

## Supervisor feedback

Feedback is stored separately from manuscript content.

Each feedback item can record:

- review round
- reviewer
- chapter
- section
- selected passage / quotation
- category
- priority
- supervisor comment
- researcher response / revision note
- status

Categories include:

- content
- structure
- methodology
- evidence
- language
- formatting
- other

Statuses are:

- Open
- In progress
- Resolved

Feedback can be reopened after resolution.

## Feedback from the writing editor

The chapter editor now includes **Feedback**.

If manuscript text is selected before opening the feedback control, Quire preserves that selected passage in the feedback record for context.

The manuscript itself is not edited.

A badge shows unresolved feedback associated with the current section.

## Revision queue

The Supervision workspace provides:

- count of open feedback
- count currently in revision
- resolved count
- review-round count
- saved-version count
- filtering by review round
- filtering by feedback status
- direct navigation back to the affected section

## Section versions

The writing editor includes **Versions**.

A researcher can create a named manual snapshot before a substantial revision.

Review rounds also create automatic `review_submission` snapshots.

A section version stores:

- section title
- manuscript HTML
- word count
- section status
- review-round relationship where applicable
- snapshot reason
- creation timestamp

## Safe restore

Restoration is always explicit.

Before Quire restores an older section version it automatically creates a `before_restore` snapshot of the current section.

This gives the researcher a recovery point even if the restore was accidental or the older wording is later reconsidered.

Restoring a version also refreshes the chapter word total and reconciles identifiable inline citations.

## Local deletion consistency

When a section is deliberately deleted, Quire locally cascades removal through:

- evidence links
- AI section threads
- section-specific feedback
- section versions

This mirrors the cloud database's foreign-key behaviour.

## Cloud-ready schema

The Supabase schema now includes:

- `review_rounds`
- `feedback_items`
- `section_versions`

All three use project ownership and row-level security.

The cloud synchronisation layer maps them in both directions.

Because the current Quire Supabase project has not yet been created, these changes are schema-ready and remain local-first for now.

## Researcher control

Supervisor feedback does not:

- rewrite manuscript text;
- accept changes automatically;
- replace the researcher's version history;
- resolve itself.

Quire treats feedback as structured input to the researcher's revision process.
