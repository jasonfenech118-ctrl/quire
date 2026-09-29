# Quire Critical Appraisal & Quality Assessment — Step 25

Step 25 adds structured critical appraisal to individual Research Library papers and carries the resulting judgement into Research Synthesis.

## Principle

Quire does not convert methodological quality into a single numeric score.

An appraisal records:

- appraisal domain set
- domain-by-domain judgement
- domain notes
- overall methodological concern
- study strengths
- important limitations
- applicability to the thesis
- completion timestamp

## Appraisal domain sets

Quire provides structured starting domains for:

- Generic appraisal
- Qualitative studies
- Randomised trials
- Observational studies
- Systematic reviews
- Mixed-methods studies

These are Quire's structured appraisal domains, not reproduced official CASP, JBI, MMAT or Cochrane instruments.

When a university, review protocol or research team requires a specific formal tool, that official tool should still be used.

## Domain judgements

Each domain can be recorded as:

- Yes / adequately addressed
- No / concern identified
- Unclear
- Not applicable

Each domain also supports a paper-specific note.

## Overall judgement

The overall judgement options are:

- Not appraised
- Lower concern
- Some concerns
- Major concerns
- Unclear

The researcher chooses this judgement.

Quire does not calculate the overall judgement automatically from domain answers.

## Paper scope

The appraisal workspace can display:

- all Research Library papers
- papers included through the Search & Screening workflow

This allows both ordinary literature review work and systematic/scoping-review workflows.

## Synthesis integration

The appraisal judgement appears beside each selected paper in the Research Synthesis matrix.

This makes it easier to compare findings alongside the methodological concern recorded for each source.

## Persistence

Critical appraisal records are included in:

- the canonical local-first project store
- project bundles
- structured workspace backup
- Supabase-ready cloud sync

Deleting an article also removes its associated appraisal.

## Cloud schema

Step 25 adds:

`critical_appraisals`

The table is protected by project ownership and row-level security.

## Validation

Step 25 was tested with a simulated qualitative-study appraisal containing:

- domain decisions
- domain notes
- strengths
- limitations
- applicability
- an overall Some Concerns judgement

The appraisal persisted against the correct article and was counted as completed.
