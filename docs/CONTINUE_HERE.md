# CONTINUE HERE — Quire

## Latest completed work — Step 31

Quire now has a simplified user-facing framework while retaining the deeper research tools underneath.

- Primary navigation: **Home → Research → Ideas → Thesis → Progress**.
- Specialist workflows remain available under **More tools** rather than competing in the main navigation.
- The thesis editor keeps a Word-style ribbon: **Home, Insert, References, Evidence, Review, AI Assist**.
- Evidence-aware writing actions now include **Check against source**, **Find opposing evidence**, **Mark as my idea**, and **Check interpretation**.
- Writing context is preserved when moving to research/evidence/review tools so the user can return to the active section.
- This remains frontend-first. Do not activate or connect the Supabase backend yet; the user's Customer Roster project must remain isolated.

## Next build direction

Continue simplifying the workflow around the five-stage mental model: **Discover → Understand → Organise → Write → Review**. The next priority is a contextual right-side writing assistant that surfaces relevant library evidence and interpretation warnings without forcing the user to leave the manuscript.

## Safety / continuity

Do not remove the existing advanced modules. Hide complexity contextually and reuse the existing library, reader, evidence graph, appraisal, analysis, supervision, readiness and export systems. Before backend activation, review the separate Supabase project/configuration so Quire cannot share tables, storage or credentials with Customer Roster.

# Continue Here

## Current position

**Current step: Step 30 — Unified Writing Workspace & Academic Ribbon**

Status: **reconciliation/refinement in progress**.

Latest saved refinement: Step 30’s continuous writing loop is now wired end-to-end at code level. Search my library performs a real contextual filter from the selected claim and offers “Cite in writing”; zero matches lead naturally to scholarly evidence discovery; citation insertion preserves the writing position; Library/Reader/Review expose a global return path to the originating section; and manuscript Copilot requests are handled in Writing Review without silent manuscript edits.

Do not start Step 31 yet.

## What was verified

- Repository: `jasonfenech118-ctrl/quire`, main branch.
- Steps 1–29 have corresponding implementation in the repository.
- Submission Readiness is already implemented and documented.
- `writing-ribbon.js`, `evidence-discovery.js`, `research-journey.js` and `submission-readiness.js` are loaded by `index.html`.
- The writing ribbon already contains actions for inserting references, searching the library, finding/linking evidence, checking claims, improving academic wording, reviewing a section, explaining an argument, chal