# Research papers

Quire projects can now be a **thesis / dissertation** or a **research paper** (journal manuscript).

## Where to set it

- **Guided setup** (New research project): step 1 asks *What are you writing?*. Choosing *Research paper* switches the wizard to journal language, asks for article type, target journal, authors, corresponding author, keywords, manuscript and abstract word limits, and shows an editable section structure on the final step.
- **Study Setup → 00 · Document type & structure**: switch type at any time and edit the paper's article type, target journal, authors, corresponding author, affiliations, keywords, reporting guideline (CONSORT, STROBE, COREQ, PRISMA…), abstract word limit and abstract (with a live word count against the limit). Title, research question and methodology stay in the existing setup cards.

## Structure

Paper templates (by article type):

| Article type | Sections |
| --- | --- |
| Original research | Introduction, Methods, Results, Discussion, Conclusion |
| Qualitative | Introduction, Methods, Findings, Discussion, Conclusion |
| Systematic review / meta-analysis | Introduction, Methods, Results, Discussion, Conclusion |
| Narrative / scoping review | Introduction, Review Methods, Main Themes, Discussion, Conclusion |
| Short communication | Introduction, Methods, Results and Discussion, Conclusion |
| Case report | Introduction, Case Presentation, Discussion, Conclusion |

The structure editor (wizard and Study Setup) can rename, reorder, add and remove parts, for theses as well as papers. `QuireStore.setDocumentStructure()` never deletes a part that already contains writing; it keeps it at the end and reports it.

## What adapts for papers

- Navigation and writing view labels (Paper, Paper Map, Paper Export, Section N).
- Export: manuscript title page (article type, title, authors, affiliations, corresponding author, target journal), abstract followed by keywords, and paper-specific checks (missing authors / journal / keywords, abstract or manuscript over the word limit).
- Submission check, launch readiness and project cards use paper metadata instead of degree / institution.

## Data model and cloud

Projects gain `projectType` (`thesis` | `paper`, default `thesis`) and `paperDetails` (`articleType`, `targetJournal`, `authors`, `correspondingAuthor`, `affiliations`, `keywords`, `abstractWordLimit`, `reportingGuideline`). Existing projects remain theses.

For cloud sync, re-run `supabase/schema.sql` once; it adds `project_type` and `paper_details` to `thesis_projects`. Until then, sync keeps working but the document type and paper details stay local only (a console warning says so).
