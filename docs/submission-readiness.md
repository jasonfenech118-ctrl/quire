# Quire Submission Readiness & Integrity — Step 27

Step 27 brings Quire's structural and integrity checks into one pre-submission workspace.

## Boundary

Submission Readiness does not certify:

- academic quality
- supervisor approval
- ethical compliance
- plagiarism / similarity interpretation
- institutional acceptance

Those remain human and institutional decisions.

Quire checks only the records and relationships it can verify from the active project.

## Derived checks

The workspace currently evaluates:

### Project foundation

- thesis title
- research question
- research objectives
- study design

### Writing & structure

- chapter structure
- written-section completion status
- progress against the saved word target

### Evidence & references

- inline citations pointing to missing library records
- missing core reference metadata
- obvious DOI/title duplicates
- written sections with no evidence links

### Data integrity

- evidence links pointing to missing article, highlight, note or section records

### Search, screening & appraisal

When a formal review workflow is in use:

- pending title/abstract screening
- unresolved Maybe decisions
- excluded papers without exclusion reasons
- included papers without completed appraisal

If no formal screening workflow is in use, Quire records this as informational rather than treating it as an error.

### Methods & analysis

- sparse methodology / analysis planning
- absence of analysis outputs for projects that use the Data & Analysis workspace
- ready/verified analysis items not linked to manuscript sections

### Supervision & timeline

- unresolved supervisor feedback
- overdue active milestones

### Export & final package

- abstract
- degree / programme
- institution
- candidate / author name used for export

## Status types

Each derived check is labelled:

- Clear
- Review
- Blocker
- Information

A Blocker is reserved for a concrete structural integrity failure such as a missing research question or a citation/evidence link pointing to a record that no longer exists.

A Review item means Quire found unfinished or potentially incomplete work that needs researcher judgement.

## Overall summary

The workspace reports:

- structural blockers
- items to review
- checks clear
- open custom checklist items
- last check time

When no structural blockers are detected, Quire still does not state that the thesis is academically ready for submission.

## Institution / local checklist

Researchers can add their own persistent checklist items for requirements Quire cannot infer, such as:

- declarations
- formatting rules
- programme-specific forms
- supervisor sign-off steps
- local similarity-check procedures
- permissions or copyright checks

These items are fully user-controlled.

## Downloadable report

The current readiness state can be downloaded as Markdown.

The report includes:

- project name
- timestamp
- check summary
- every derived check and status
- institution/local checklist items

The report carries an explicit statement that it is a structural/integrity checklist, not formal certification.

## Persistence

Institution-specific checklist items are included in:

- local-first project storage
- project bundles
- structured Quire backups
- Supabase-ready cloud sync

## Cloud schema

Step 27 adds:

`submission_items`

The table is protected by project ownership and row-level security.

## Offline support

The Step 24–27 modules were added to Quire's PWA service-worker shell and the cache version was advanced.

## Validation

Step 27 was tested against a deliberately incomplete project.

The engine correctly classified:

- missing research question as a blocking issue
- incomplete objectives/design/word target/methods/abstract/title-page metadata as review items
- non-use of formal screening as informational
