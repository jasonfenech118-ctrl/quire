# Quire Literature Search & Screening Workflow — Step 26

Step 26 makes the literature-search process reproducible inside the same Quire project that holds the papers, notes and thesis writing.

## Search strategy

The **Search & Screening** workspace supports structured concept planning using:

- PICO
- PCC
- SPIDER
- Custom concept frameworks

Each concept can contain multiple synonyms or related search terms.

Quire generates a generic Boolean core string by:

- joining synonyms within a concept using `OR`;
- joining concepts using `AND`;
- quoting multi-word terms where appropriate.

The generated string is deliberately database-neutral. Database-specific subject headings, field tags and syntax should still be adapted for each source.

## Search protocol

The saved search plan records:

- question framework
- concept labels
- terms / synonyms
- databases and sources
- inclusion criteria
- exclusion criteria
- database limits / filters
- strategy notes

The eligibility criteria remain separate from database-applied limits so the review protocol stays auditable.

## Search log

Each actual database/source search can be logged with:

- database or source name
- date searched
- exact query used
- result count
- records imported
- duplicates removed
- notes

Search runs remain linked to the active thesis and its saved search plan.

## Screening

Every Research Library article can have one screening record.

Title/abstract decisions:

- Pending
- Include
- Maybe
- Exclude

Full-text decisions:

- Not started
- Include
- Maybe
- Exclude

Each record can also store:

- exclusion reason
- screening note
- screening timestamp

The exclusion-reason field offers consistent suggestions such as wrong population, wrong design, duplicate and unavailable full text while still allowing free text.

## Flow counts

Quire calculates a PRISMA-style audit summary from real records:

- records identified
- library records
- title/abstract screened
- title/abstract excluded
- full text assessed
- full text excluded
- full text included
- duplicates logged as removed

This is an internal audit aid, not an official PRISMA flow diagram generator.

## Audit CSV

**Export audit CSV** creates one portable file containing:

1. the saved search plan;
2. every logged search run;
3. every article screening record;
4. the current flow summary.

The CSV includes framework, databases, Boolean query, decisions, exclusion reasons, result/import/duplicate counts, eligibility criteria, limits and notes.

This makes the search trail easier to review with a supervisor, archive with project records, or use when writing the methods section.

## Research Library integration

Screening uses the same article records already stored in Quire.

No duplicate screening-only article database is created.

New references imported through BibTeX, RIS or DOI metadata automatically become available in the screening queue.

Removing an article also removes its screening record through the existing local/cloud relationship model.

## Cloud readiness

The Supabase model includes:

- `literature_search_plans`
- `literature_search_runs`
- `screening_records`

Step 26 adds backwards-safe columns to search plans for:

- `inclusion_criteria`
- `exclusion_criteria`

The cloud mapper syncs these fields in both directions.

## Validation

Step 26 was tested with a simulated review project containing:

- a PICO strategy;
- two databases;
- explicit eligibility criteria;
- a logged PubMed run;
- an imported article;
- title/abstract inclusion;
- full-text inclusion.

The resulting flow summary correctly reflected the stored search and screening records.
