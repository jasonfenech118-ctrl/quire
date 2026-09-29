# Quire Research Data & Analysis Workspace — Step 26

Step 26 adds a project-level analysis notebook for de-identified analytic structures, results and findings.

## Scope and safety

Quire is not intended to replace an approved research data repository, clinical database, NVivo, SPSS, R or other specialist analysis software.

The workspace is designed for:

- analysis planning
- de-identified analytic summaries
- codes and categories
- variable definitions
- aggregate statistical results
- synthesis outcomes
- interpretation
- analytic memos
- thesis-ready findings

Do not store names, hospital numbers, contact details or other participant/patient identifiers in this workspace.

## Adaptive item types

The available analysis item types adapt to Study Setup.

### Qualitative

- Code / category
- Qualitative finding
- Analytic memo

### Quantitative

- Variable
- Quantitative analysis / result
- Analytic memo

### Mixed methods

- Code / category
- Qualitative finding
- Variable
- Quantitative analysis / result
- Mixed-methods integration finding
- Analytic memo

### Systematic review / meta-analysis

- Review / meta-analysis outcome
- Evidence-synthesis finding
- Analytic memo

If study type is not yet selected, Quire offers a flexible reduced set.

## Qualitative structures

Codes/categories can record:

- definition
- examples / indicators
- analytic memo

Qualitative findings can record:

- interpretation
- de-identified supporting analytic evidence
- related codes/categories
- negative or divergent cases

## Quantitative structures

Variables can record:

- variable type
- analytic role
- unit / scale
- coding / derivation rule

Quantitative analyses can record:

- statistical test / analysis
- variables involved
- aggregate result summary
- effect estimate
- p-value
- confidence interval
- assumptions / diagnostics

Quire stores summaries and analytic decisions, not participant-level values.

## Mixed-methods integration

Integration findings can record:

- qualitative result
- quantitative result
- relationship between strands
- integrated interpretation

Relationship examples include convergence, complementarity, dissonance and expansion.

## Review / meta-analysis structures

Review outcomes can record:

- outcome
- effect measure
- model / synthesis method
- aggregate result
- confidence interval
- heterogeneity
- contributing studies
- interpretation

Evidence-synthesis findings can record interpretation, confidence/certainty, supporting studies and synthesis limitations.

## Thesis links

Every analysis item can optionally link to:

- a research objective
- a specific thesis section

This keeps analysis outputs connected to the question they answer and the manuscript destination where they may be used.

Quire does not insert analysis text into the manuscript automatically.

## Status

Each item can be:

- Draft
- Ready for writing
- Verified / checked

The status is controlled by the researcher.

## Search and activity integration

Analysis items are included in:

- global thesis search
- Dashboard Recent Work
- structured workspace backup

Search results can open the exact analysis item.

## Cloud schema

Step 26 adds:

`analysis_items`

The table stores a flexible JSON payload alongside explicit project, objective, section, kind and status fields.

It is protected by project ownership and row-level security.

## Validation

Step 26 was tested by creating a qualitative finding, linking it to a Results/Findings section, moving it from Ready to Verified and checking the derived analysis summary.
