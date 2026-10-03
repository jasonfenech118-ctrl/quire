# Research papers and assignments

Quire projects can be a **thesis / dissertation**, a **research paper** (journal manuscript) or an **assignment** (coursework).

## Where to set it

- **Guided setup** (New research project): step 1 asks *What are you writing?*. Choosing *Research paper* switches the wizard to journal language, asks for article type, target journal, authors, corresponding author, keywords, manuscript and abstract word limits, and shows an editable section structure on the final step.
- **Study Setup → 00 · Document type & structure**: switch type at any time and edit the paper's article type, target journal, authors, corresponding author, affiliations, keywords, reporting guideline (CONSORT, STROBE, COREQ, PRISMA…), abstract word limit and abstract (with a live word count against the limit). Title, research question and methodology stay in the existing setup cards.

## Assignments

Choose *Assignment* in guided setup or in Study Setup → 00. Assignment details:

- Assignment type: essay, report, literature review, case study, reflective account, critical appraisal, research proposal
- Module / course, module code, programme, tutor, student ID / candidate number
- Assignment brief / question and marking criteria / learning outcomes (one per line)
- Word limit, word count tolerance (±%, default 10) and due date

Assignment templates:

| Assignment type | Sections |
| --- | --- |
| Essay | Introduction, Main Body, Conclusion |
| Report | Introduction, Background, Analysis, Recommendations, Conclusion |
| Literature review | Introduction, Search Strategy, Review of the Literature, Discussion, Conclusion |
| Case study | Introduction, Case Overview, Analysis, Discussion, Conclusion |
| Reflective account | Introduction, Description, Reflection, Action Plan, Conclusion |
| Critical appraisal | Introduction, Overview of the Study, Critical Appraisal, Implications for Practice, Conclusion |
| Research proposal | Introduction, Background and Rationale, Aims and Objectives, Methodology, Ethical Considerations, Timeline |

Export produces a coursework cover page (institution, module, assignment type, title, student ID, programme, tutor, word count against the limit, date). Export checks flag a missing module or student ID and a word count outside the limit ± tolerance. The Submission Check lists the marking criteria to check the draft against.

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

## What adapts for papers and assignments

- Navigation and writing view labels (Paper / Assignment, … Map, … Export, Section N).
- Export: manuscript title page (article type, title, authors, affiliations, corresponding author, target journal), abstract followed by keywords, and paper-specific checks (missing authors / journal / keywords, abstract or manuscript over the word limit).
- Submission check, launch readiness and project cards use paper metadata instead of degree / institution.

## Data model and cloud

Projects gain `projectType` (`thesis` | `paper` | `assignment`, default `thesis`), `assignmentDetails` (`assignmentType`, `moduleName`, `moduleCode`, `tutor`, `studentId`, `brief`, `markingCriteria`, `wordTolerance`) and `paperDetails` (`articleType`, `targetJournal`, `authors`, `correspondingAuthor`, `affiliations`, `keywords`, `abstractWordLimit`, `reportingGuideline`). Existing projects remain theses.

For cloud sync, re-run `supabase/schema.sql` once; it adds `project_type`, `paper_details` and `assignment_details` to `thesis_projects`. Until then, sync keeps working but the document type, paper and assignment details stay local only (a console warning says so).
