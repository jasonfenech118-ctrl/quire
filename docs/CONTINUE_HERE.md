# CONTINUE HERE — Quire

## Current position

**Steps 1–55 are implemented in the repository.**

**Step 56 — Manual Frontend Validation Gate — pending.**

### Personal Windows ChatGPT test build — 3 October 2026

An Electron Windows portable build now connects the existing article and writing workflows to OpenAI's official Sign in with ChatGPT SDK. It adds a project assistant with automatic requests, streaming drafts and saved completed replies. Credentials stay in protected native storage; article source IDs are validated against supplied passages, and automatically assembled context excludes clinical analysis datasets.

See `docs/windows-chatgpt.md` for setup, migration, SDK provenance and remaining acceptance checks. Seven automated source/DOM tests passed and the Windows executable was cross-built. Live Windows launch, real account consent/eligibility and graphical PDF interactions remain unverified. This work does not complete Step 56 or activate Supabase.

### Live Step 56 status — updated during browser validation

- **Step 56.1 Primary navigation:** PASSED by the user in the live GitHub Pages app.
- A live first-time-user check then exposed a major UX problem: **Start fresh** cleared content but the experience still felt like an existing thesis and could drop the user too close to writing.
- This finding has now been addressed in code and **requires a live retest before Step 56.2 continues**.

#### Research-first onboarding direction now implemented

Quire must not imply **one paper → start writing**.

The early research journey is now:

**Research area → Search & collect → Read across papers → Compare & appraise → Explore possible gaps → Refine the question → Build the argument → Write → Review**

Key principles:
- A new project begins with a **broad research area / working topic**, not a forced final research question.
- The research question and objectives are allowed to evolve as the literature develops.
- Quire encourages broad reading and cross-paper comparison before suggesting drafting.
- A research gap is treated as a **possible gap signal to test**, never as something Quire invents or confirms automatically.
- The possible-gap action is guarded until multiple papers have actually been reviewed and compared.
- The clean starter project is reconfigured in place instead of silently creating a duplicate project.
- After guided setup, Quire returns to **Home**, not directly to the thesis editor.

#### Research Review Progress now implemented

The former simplistic **reviewed articles / total articles** percentage has been replaced by a transparent, process-based metric.

**Research Review Progress** is weighted across:
- Search foundation — 15%
- Collection & screening — 15%
- Reading & extraction — 25%
- Critical appraisal — 15%
- Comparison & synthesis — 20%
- Coverage & gap exploration — 10%

The app explicitly states that this percentage measures the review process recorded in Quire and **does not mean that the researcher has read that percentage of all literature that exists**.

A separate non-numeric **Literature Maturity** signal is shown:
- Needs broader searching
- Developing
- Beginning to stabilise

“Beginning to stabilise” is explicitly not presented as proof of saturation.

The review score is now used by the Progress data model as well as the visible Home/Progress UI so future progress snapshots stay consistent.

#### Immediate next live test

1. Wait for GitHub Pages to deploy the latest commits.
2. Hard-refresh Quire.
3. Use **Start fresh** again if needed.
4. Confirm the app opens on **Home** with:
   - “Start your research.”
   - “Begin with the area you want to explore.”
   - Research Foundation guidance.
   - Research Review Progress at 0% for a blank project.
   - Literature Maturity = Needs broader searching.
   - Possible-gap action unavailable until papers have been read and compared.
5. Open the guided project setup and confirm it asks for a **research area / working topic**, not a final fixed question.
6. Finish setup and confirm Quire returns to **Home** rather than Thesis.

Only after that live retest should Step 56.2 continue with the real Research → PDF workflow.

### Step 56.2 — Research → PDF workflow preparation

Code-level preparation completed before the live PDF test:
- Fresh Research Library empty state now explains that the goal is to build a **broad literature base**, not find one “perfect” paper.
- Empty Research offers:
  - Plan literature search
  - Upload PDF
  - Add/import references
- Removed a stale project-switch handler that could overwrite the new Home research-foundation guidance with an old “define your research question” prompt.
- PDF selection flow remains wired for:
  - coloured highlight
  - highlight + note
  - Explain selected passage
  - selected passage → Idea with source/page/excerpt provenance
- Reader handoffs are now **literature-maturity aware**:
  - early-stage evidence capture suggests more reading;
  - developing evidence suggests cross-paper comparison;
  - “Use it in writing” appears only after the review foundation is substantially developed, the literature is beginning to stabilise, a working question exists and at least one possible gap signal has been recorded.
- GitHub Pages offline shell cache bumped to v27.
- Syntax checks passed for app.js, pdf-reader.js, research-foundation.js, research-journey.js, data-model.js and service-worker.js.
- Explain event is handled by copilot.js.
- Idea capture event is handled by brainstorm.js with source-page provenance.

**Still required for Step 56.2:** real-browser test with an actual PDF. Static/code checks do not pass this gate by themselves.



Step 22 backend activation remains deliberately deferred. Do not activate Supabase or touch the separate Customer Roster project.

Primary destinations: **Home → Research → Ideas → Thesis → Progress**

Research journey: **Discover → Understand → Organise → Write → Review**

## What was completed in the autonomous implementation run

### Steps 33–44 — agreed intelligence/workflow backlog
- Step 33 — Claim-Aware Writing & Evidence Intelligence Foundation
- Step 34 — Transparent claim-level evidence confidence profiles
- Step 35 — Grounded “Why do I care?” paper intelligence
- Step 36 — Counter-evidence / possible disagreement synthesis
- Step 37 — Critical Writing Coach
- Step 38 — Selected-passage Reading Assistant
- Step 39 — Provenance-aware Research Memory search
- Step 40 — Persistent Ideas & provenance
- Step 41 — Living Argument Map with arguments and claims
- Step 42 — Supervisor Review Package
- Step 43 — End-of-Session Checkpoint
- Step 44 — Integrated code/UX audit

### Steps 45–55 — added-value roadmap identified after Step 44
- Step 45 — Proper Idea Capture + selected passage → Idea provenance
- Step 46 — Research Memory answer builder
- Step 47 — Personal Writing Growth Centre based only on accepted edits
- Step 48 — Provenance Chain Inspector
- Step 49 — Ctrl/Cmd+K contextual command palette
- Step 50 — Frontend release code-level audit
- Step 51 — In-app workflow diagnostics
- Step 52 — Citation & source integrity preflight
- Step 53 — Research-question drift reflection
- Step 54 — Cross-chapter coherence review
- Step 55 — Submission Pack export

## QA / reconciliation findings from this run

- All 35 local JavaScript modules loaded by the app parsed successfully during the Step 50 audit.
- No duplicate HTML IDs were found in the Step 50 audit.
- Stale Home Copilot event wiring left after the earlier Home simplification was found and fixed.
- Supervisor Review Package QA found a missing helper; it was fixed before Step 42 closed.
- Objective-coverage QA found an incorrect overall-anchor comparison; it was corrected to objective-specific matching before Step 54 closed.
- Provenance Trace QA found a modal lifecycle issue; it was fixed before Step 50 closed.
- New intelligence remains heuristic and communicates uncertainty rather than claiming scientific validity.
- Supabase was not activated or modified.

## Steps 57–64 — research-first expansion implemented

The user chose to continue frontend development now and defer hands-on browser testing until later. Step 56 therefore remains open; the items below are **code-level implemented and QA'd**, not a claim that live browser validation has passed.

- **Step 57 — Living Gap Explorer.** Synthesis now treats gaps as testable hypotheses with statuses: Emerging, Being tested, Narrowed, Supported by current review, Challenged, or Set aside. Supporting/challenging papers and targeted searches remain traceable. There is deliberately no “confirmed gap” status.
- **Step 58 — Gap → Search Iteration.** A possible gap can open a targeted search context in Search & Screening. Suggested terms come only from the researcher's recorded gap text; they are added as a separate search concept rather than overwriting the main search plan. Logged search runs can be linked back to the gap.
- **Step 59 — Research Question Evolution.** Study Setup can record meaningful evidence-led question refinements with previous wording, new wording, rationale, literature basis and optional gap provenance. This is explicit researcher action, not a keystroke log.
- **Step 60 — Working Contribution Builder.** Synthesis can articulate a provisional contribution from the researcher's tested gap, study response and intended significance. Quire structures supplied wording but does not certify novelty.
- **Step 61 — Reading Contribution Checkpoint & Literature Maturity Trend.** Marking a paper reviewed can optionally record what it added: new concept, reinforcement, challenge, method/context insight, background, or little new. Once enough checkpoints exist, Literature Maturity is grounded in these researcher judgements rather than metadata heuristics alone.
- **Step 62 — Research Decision Log.** Study Setup now records major scope, search, eligibility, methodology, analysis, supervision, ethics and structure decisions with rationale and evidence/trigger, including superseded decisions.
- **Step 63 — Search Review Checkpoint.** Search & Screening can record a researcher decision to continue broad searching, move to targeted searches, pause broad searching, or complete the current search stage for now. It never claims universal search completeness or saturation.
- **Step 64 — Supervisor Research Rationale Pack.** Supervision can build/download a research-rationale pack covering review progress, maturity, gap testing, targeted searches, question evolution, working contribution and major research decisions.

### Step 57–64 reconciliation / QA

- All new modules parse successfully.
- All new modules are loaded by index.html.
- No duplicate HTML IDs were found.
- Challenged or set-aside gaps no longer unlock question refinement or writing recommendations.
- PDF writing handoff requires a tested viable gap status (supported or narrowed) in addition to review/maturity/question conditions.
- Contribution and supervisor-pack language explicitly does not certify novelty.
- Search checkpoints explicitly do not certify search completeness or saturation.
- Service-worker shell cache is now **v28** and includes the new modules.
- Supabase remained untouched.

### Current next value direction

The next high-value research-first gap is **literature discovery from the search plan**. Quire can already plan/log searches and has claim-oriented Crossref discovery, but Search & Screening does not yet provide a batch scholarly-candidate discovery workflow. The next implementation should reuse existing Crossref/metadata primitives, clearly label results as discovery candidates, support multi-select import with DOI deduplication, and preserve search provenance.



## Step 56 — exact next work

This gate **cannot honestly be completed by static code inspection alone**.

Perform real-browser/device validation:
1. Desktop walkthrough of Home → Research → Ideas → Thesis → Progress.
2. Mobile/responsive walkthrough.
3. Keyboard-only navigation and Ctrl/Cmd+K command palette.
4. Screen-reader smoke test of primary navigation, writing ribbon, companion and modals.
5. Real PDF: selection → highlight, note, Explain, Idea; reopen provenance source/page.
6. Image-only PDF OCR smoke test.
7. Real thesis editing: companion, claim awareness, evidence linking, writing review, accepted edit → Writing Growth.
8. Ideas: capture, status progression, Trace, thesis handoff.
9. Thesis Map: seven-layer horizontal map, edge rendering, node selection and relationship filters.
10. Supervision package and End-session checkpoint.
11. Backup → restore smoke test and in-app Diagnostics.
12. Word export visual inspection.
13. Print / Save PDF visual inspection.
14. Submission Pack content inspection.

Only after those checks pass should Step 56 be marked complete and backend activation be reconsidered.

## Product principles

- Researcher remains the author.
- No silent manuscript rewrites.
- No invented evidence/references.
- Researcher interpretation stays distinguishable from sourced claims.
- Preserve source/page provenance.
- Heuristics communicate uncertainty.
- Clear academic English over ornamental vocabulary.
- Reuse existing workflows before adding screens.
- Quire should become simpler as it becomes more capable.

## Recovery

Read `README.md`, `docs/PROJECT_MASTER.md`, and this file before changing the repository.

Resume phrase:

> “Continue Quire Step 56 from docs/CONTINUE_HERE.md. Perform real-browser frontend validation; do not activate Supabase until the validation gate is reviewed.”
