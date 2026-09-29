# Quire Literature Search & Screening — Step 24

Step 24 gives Quire a reproducible literature-search and screening workflow while keeping the Research Library as the single source of truth for papers.

## Search strategy

The Search & Screening workspace stores a project-level literature-search plan with:

- question framework
- concepts
- synonyms / search terms
- databases and sources
- limits / filters
- methodological notes

Supported starting frameworks are:

- PICO
- PCC
- SPIDER
- Custom

Framework labels are scaffolds only. Concepts can be renamed, added or removed.

## Boolean strategy builder

Each concept contains a list of synonyms.

Quire builds a generic Boolean core by:

- joining synonyms within a concept using `OR`
- joining concepts using `AND`
- quoting multi-word phrases

Example:

```
("stoma patients" OR ostomy) AND ("patient education" OR self-management)
```

The generated string is deliberately database-neutral.

Database-specific subject headings, field tags and syntax should still be adapted for PubMed, CINAHL, Scopus, Embase or other platforms.

## Search log

Each real database/source search can be logged with:

- database / source
- search date
- exact query used
- result count
- number imported to Quire
- duplicates removed
- search notes

This creates an audit trail of what was actually run rather than relying only on the current master strategy.

## Screening queue

The screening queue is generated from the active project's Research Library.

Quire does not duplicate article records.

Each article receives one screening record containing:

### Title / abstract decision

- Pending
- Include
- Maybe
- Exclude

### Full-text decision

- Not started
- Include
- Maybe
- Exclude

The reviewer can also store:

- exclusion reason
- screening note
- screening timestamp

Screening decisions do not delete excluded articles from the Research Library.

## Review-flow summary

The workspace derives live counts for:

- records identified from logged searches
- library records
- title/abstract records screened
- full texts assessed
- full-text inclusions
- exclusions
- duplicates logged as removed

This is a working review-flow summary.

It should not be described as a finished PRISMA diagram until all review stages and counts have been checked by the researcher.

## Search-plan persistence

The literature-search plan, search runs and screening records are part of the canonical project store.

They are included in:

- local-first persistence
- structured Quire backup
- project bundles
- Supabase-ready cloud sync

## Cloud schema

Step 24 adds:

- `literature_search_plans`
- `literature_search_runs`
- `screening_records`

All three tables are protected by project ownership and row-level security.

## Data integrity

Deleting a paper also removes its local screening record.

Reference imports continue to use Quire's existing DOI/title deduplication before papers reach the screening queue.

## Validation

Step 24 was tested with a simulated project containing:

- a PICO search strategy
- PubMed search run
- 120 identified records
- 2 imported references
- 1 duplicate removed
- 2 title/abstract screening decisions
- 1 full-text inclusion

The derived flow counts matched those records.
