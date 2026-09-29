# Quire Research Data & Analysis Workspace — Step 26

Step 26 keeps de-identified analytic decisions and thesis-ready findings connected to research objectives and writing destinations.

## Scope and data-safety boundary

Quire is not designed to be the primary store for identifiable participant or patient source data.

The Analysis workspace explicitly asks the researcher to keep identifiable or regulated datasets in the approved research-data environment.

Quire stores analytic structures such as:

- codes and categories
- variables and coding rules
- de-identified analytic memos
- aggregate statistical results
- qualitative findings
- mixed-methods integration findings
- review / meta-analysis outcomes
- evidence-synthesis findings

## Adaptive study modes

The available analysis-item types adapt to Study Setup.

### Qualitative

- Code / category
- Qualitative finding
- Analytic memo

### Quantitative

- Variable
- Quantitative analysis / result
- Analytic memo

### Mixed methods

- qualitative codes and findings
- quantitative variables and results
- mixed-methods integration findings
- analytic memos

### Systematic review / meta-analysis

- Review / meta-analysis outcome
- Evidence-synthesis finding
- Analytic memo

## Traceability

Each analysis item can link to:

- a research objective
- a thesis section

This supports the path:

`analysis result → research objective → writing destination`

## Status

Analysis items can be marked:

- Draft
- Ready for writing
- Verified / checked

The Verified state is researcher-controlled.

Quire does not independently certify that an analysis is statistically or methodologically correct.

## Persistence

Analysis items are included in:

- the canonical local-first project store
- project bundles
- structured workspace backup
- Supabase-ready cloud sync

If a linked thesis section is deleted, the analysis record is retained and its section link is cleared.

## Cloud schema

Step 26 adds:

`analysis_items`

The table is protected by project ownership and row-level security.

## Validation

Step 26 finished with:

- application JavaScript syntax checks passing
- no duplicate HTML IDs
- a single canonical Data & Analysis workspace
- analysis records persisting in the project bundle
- thesis-section linking tested
- cloud schema and RLS present
