# CONTINUE HERE — Quire

## Current position

**Steps 1–33 are implemented. Step 22 backend activation remains deliberately deferred.**

Primary destinations: **Home → Research → Ideas → Thesis → Progress**

Research journey: **Discover → Understand → Organise → Write → Review**

## Step 33 completed and checked

**Claim-Aware Writing & Evidence Intelligence Foundation** is integrated into the existing Writing Companion.

- Separates obvious researcher framing/signposting from likely empirical/factual claims.
- Does not force every sentence into a claim category.
- Recognises obvious in-text citations.
- Detects when related evidence is already linked to the active thesis section.
- Searches saved highlights for possible existing evidence.
- Opens the existing evidence-linking workflow for matching passages.
- Uses cautious language when evidence may be missing; a heuristic flag is never presented as proof that a statement is false.
- Reuses the established Step 14 Evidence Check primitives rather than creating a competing evidence model.
- Empty and short-fragment states are guarded.

Code-level reconciliation passed: module loaded, UI mount present, all claim statuses represented, evidence-link workflow reused, and evidence-check primitives exported.

## Automated milestone sequence

Continue one numbered step at a time. Implement, inspect/test, reconcile documentation, then proceed.

- **Step 34 — Claim-level Evidence Confidence.** Build a transparent qualitative confidence profile from source passage match, direct section linkage, citation presence, appraisal context and possible contradiction. Never collapse this into a simplistic scientific-validity score.
- **Step 35 — Structured “Why do I care?” Paper Intelligence.** Turn existing grounded article analysis into thesis-useful study/findings/limitations/relevance/destination/passage cards.
- **Step 36 — Contradiction & Counter-Evidence Workspace.** Extend existing negation/direction checks across multiple saved sources and surface disagreements without claiming one source is correct.
- **Step 37 — Critical Writing Coach.** Distinguish description, comparison, interpretation and critique; prompt for limitations, alternative explanations and cross-source synthesis.
- **Step 38 — Reading Assistant for Selected Passages.** Explain selected text simply or academically and show relevance, limitations and relation to the research question using grounded source context.
- **Step 39 — Research Memory & Natural-Language Recall.** Search papers, highlights, notes and prior ideas with provenance-preserving results.
- **Step 40 — Idea Provenance.** Mark whether a thought originated as researcher idea, source-derived note/highlight, supervisor feedback, analysis memo or brainstorming item.
- **Step 41 — Living Argument Map.** Maintain research question → objectives → themes → arguments → claims → supporting/counter evidence → thesis sections using existing graph relationships.
- **Step 42 — Supervisor Review Package.** Assemble changes, unresolved questions, weak-evidence areas and revision actions from existing review/version data.
- **Step 43 — End-of-Session Checkpoint.** Summarise completed work, unresolved questions and the best starting point next time, locally and non-destructively.
- **Step 44 — Integrated Value & UX Audit.** Re-test the full Discover → Understand → Organise → Write → Review journey, accessibility and duplication; then identify additional high-value milestones before implementation.

## Development rules

- The researcher remains the author.
- Never silently rewrite manuscript text.
- Never invent evidence or references.
- Separate researcher interpretation from sourced claims.
- Preserve source/page provenance.
- Prefer precise natural academic English over ornamental wording.
- Heuristics must communicate uncertainty.
- Reuse existing models/workflows before adding screens.
- Quire should become simpler as it becomes more capable.
- Keep work frontend-first/local.
- **Do not activate Supabase, run SQL, or touch the separate Customer Roster project.**

## Recovery

Read `README.md`, `docs/PROJECT_MASTER.md`, and this file, then inspect the current milestone implementation before changing it.

Resume phrase:

> “Continue Quire autonomously from docs/CONTINUE_HERE.md. Complete and QA each numbered frontend milestone before proceeding; do not activate Supabase.”
