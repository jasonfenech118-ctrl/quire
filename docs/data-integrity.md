# Quire Data Integrity & Migration Hardening — Step 25

Step 25 adds a versioned migration and referential-integrity layer to Quire's canonical local data store.

## Why this exists

Quire now contains many connected record types:

- projects
- study setup
- objectives
- chapters and sections
- articles, highlights and notes
- themes and evidence links
- milestones and progress snapshots
- supervisor review rounds and section versions
- literature-search plans and search runs
- screening records
- critical appraisals
- AI threads and messages

As Quire evolves, older local states and restored backups may not contain every newer collection or field. Records can also become inconsistent if a browser session is interrupted during an older build or if a historic backup contains references to records that no longer exist.

Step 25 prevents those inconsistencies from silently spreading.

## Schema version

The local store keeps the original Quire store identifier for compatibility, but now also records:

```
schemaVersion: 2
```

The current schema version is exposed as:

```js
QuireStore.schemaVersion
```

Older version-1 states are migrated automatically when they are first loaded.

## Version 1 → version 2 migration

The migration normalises newer collections and important record shapes, including:

- missing workflow arrays
- old highlight `text` values into `highlightedText`
- missing PDF anchors
- old note content into `body`
- section content, status and numeric word counts
- article reading status
- article citation metadata
- migration history

A migration entry is stored in `migrationHistory`.

## Automatic recovery copy

Before an automatic schema migration or automatic integrity repair changes the stored workspace, Quire attempts to save one local emergency recovery copy.

The recovery record contains:

- timestamp
- reason
- complete structured Quire state

To avoid exhausting small browser-storage quotas, Quire only keeps the recovery copy when the serialized payload is within a safe localStorage size threshold.

Only the most recent migration recovery copy is retained.

## Integrity audit

```js
QuireStore.auditIntegrity()
```

checks the canonical store without modifying it.

The audit checks relationships including:

- active project → real project
- study setup → project
- chapter → project
- section → chapter
- subsection → valid parent section
- highlight → article
- note → article / highlight
- article-theme links
- evidence sources and targets
- AI message → AI thread
- supervisor feedback → review/chapter/section
- section version → section
- search run → search plan
- screening record → article
- critical appraisal → article

It also detects duplicate IDs and duplicate records that should be unique per parent, such as one study setup per project.

## Safe repair

```js
QuireStore.repairIntegrity()
```

repairs supported inconsistencies.

Repair behaviour is conservative:

- invalid optional references are cleared;
- orphan required child records are removed;
- duplicate unique records keep the most recently updated record;
- invalid active-project references fall back to an available project;
- evidence links with no valid evidence source are removed;
- duplicate article/theme links are collapsed.

A recovery copy is attempted before repair.

## Backup restore hardening

Structured Quire backups now use:

```
backupVersion: 2
```

The backup also reports the Quire schema version.

Backup sanitisation now recognises all current workflow collections, including:

- search plans
- search runs
- screening records
- critical appraisals

Restored backups are passed through the same migration and integrity preparation layer before becoming the active workspace.

## Cloud sync protection

Before Quire pushes structured data to Supabase, it performs an integrity audit.

If an inconsistency is detected, Quire runs the safe repair process locally before the cloud push continues.

Cloud pull already passes through `replaceState()`, so downloaded data also receives migration and integrity preparation before it becomes active.

## Account diagnostics

**Account & cloud → Backup & system check** now includes:

- Run diagnostics
- Repair data relationships
- Restore migration recovery

Diagnostics show:

- current Quire schema version
- relationship integrity
- whether a migration recovery copy exists
- browser storage / PDF / cloud checks

## Offline cache

The application-shell cache is bumped to `quire-shell-v25` so browsers do not continue serving a pre-migration data layer after this upgrade.

## Design principle

Quire should never treat a silently broken relationship graph as normal.

When possible it should:

1. detect the inconsistency;
2. preserve a recovery point;
3. repair only what can be repaired deterministically;
4. report the result;
5. prevent broken data from being propagated to cloud storage.
