# Quire Project Master

This file is the durable source of truth for continuing Quire across ChatGPT conversations.

## Product goal

Quire is a connected postgraduate research and thesis workspace that keeps planning, literature, evidence, analysis, writing, supervision and finalisation in one understandable research journey. The interface should be intuitive enough that the researcher does not need to remember which disconnected tool contains the next action.

## Development rule

Quire is currently **frontend-first**. Continue building and testing the local/browser experience with local/mock/project data. The Supabase integration code may remain in the repository, but external Supabase activation, schema execution and backend migration are deliberately deferred until the frontend workflow is approved.

Do not execute SQL or connect Quire to an external Supabase project as part of ordinary frontend steps.

## Reconciled roadmap

- Steps 1–8: research/data/PDF foundation — implemented.
- Steps 9–16: thesis workflow, evidence, citations, review, synthesis and methodology — implemented.
- Step 17: OCR for scanned PDFs — implemented.
- Step 18: Live Thesis Map — implemented.
- Step 19: Progress Intelligence — implemented.
- Step 20: Supervisor & Revision Workflow — implemented.
- Step 21: Thesis Export — implemented.
- Step 22: Real Cloud Backend — integration code complete; external activation deliberately deferred.
- Step 23: Final Product Polish — implemented.
- Step 24: Guided Project Launch — implemented.
- Step 25: Data Integrity & Migration Hardening — implemented.
- Step 26: Literature Search & Screening Workflow — implemented.
- Step 27: Critical Appraisal & Quality Assessment — implemented.
- Step 28: Research Data & Analysis Workspace — implemented.
- Step 29: Submission Readiness & Integrity — implemented and documented.
- Step 30: Unified Writing Workspace & Academic Ribbon — implemented.
- Step 31: Guided five-destination product framework — implemented; primary navigation simplified to Home, Research, Ideas, Thesis and Progress while specialist tools remain available contextually.
- Step 32: Writing Understanding & Language Coach + Guided Research Flow — implemented.
- Step 33: Claim-Aware Writing & Evidence Intelligence Foundation — implemented.
- Step 34: Claim-Level Evidence Confidence — implemented.
- Step 35: Structured Thesis-Value Paper Intelligence — implemented.
- Step 36: Contradiction & Counter-Evidence Synthesis — implemented.
- Step 37: Critical Writing Coach — implemented.
- Step 38: Selected-Passage Reading Assistant — implemented.
- Step 39: Provenance-Aware Research Memory Search — implemented.
- Step 40: Persistent Ideas & Provenance — implemented.
- Step 41: Living Argument Map — implemented.
- Step 42: Supervisor Review Package — implemented.
- Step 43: End-of-Session Checkpoint — implemented.
- Step 44: Integrated Value & UX Audit — implemented.
- Step 45: Better Idea Capture & Source-to-Idea Handoffs — implemented.
- Step 46: Research Memory Answer Builder — implemented.
- Step 47: Personal Writing Growth Centre — implemented.
- Step 48: Provenance Chain Inspector — implemented.
- Step 49: Contextual Command Palette — implemented.
- Step 50: Frontend Release Readiness — code-level audit complete; real browser/device QA remains a separate validation task.

## Step 32 — implemented

The writing workspace now helps the researcher express their own thinking more clearly without taking authorship away from them. Beside the manuscript, Quire can:
- reflect back what it understands the current paragraph to mean, allowing the researcher to detect ambiguity;
- surface optional grammar, sentence-structure, clarity and vocabulary guidance while the researcher writes;
- favour precise natural academic English over unnecessarily complex vocabulary;
- identify overly long sentences, repeated connectors, conversational wording and claims whose certainty may exceed the evidence;
- keep all proposed wording separate from the manuscript until the researcher explicitly accepts or applies a change;
- connect deeper paragraph review to the existing Writing Review/evidence workflows;
- support adaptive guidance based on recurring writing patterns, without presenting a simplistic language score.

Step 32 also consolidates the product around **Discover → Understand → Organise → Write → Review**. The journey derives a sensible next action from project state and completed actions, Home is focused on continuation rather than duplicated tools, the Writing Companion is collapsible with a locally remembered preference, and specialist tools remain available in grouped secondary navigation.

## Step 30 intent

The writing experience should feel familiar and coherent, borrowing the discoverability of a word processor without becoming a clone. The ribbon should expose actions when the researcher needs them: references, library search, evidence discovery/linking, claim checking, academic-language improvement, explanation, critical challenge and evidence-gap detection.

Academic assistance must preserve researcher agency:
- never silently invent evidence or references;
- distinguish the researcher's own ideas from sourced claims;
- preserve meaning when improving language;
- keep source/page provenance when available;
- make suggestions reviewable rather than silently rewriting manuscript content;
- connect writing actions to the existing library, evidence graph, review tools and grounded Copilot.

## Reconciliation standard

A step is not considered complete only because a JavaScript or documentation file exists. Before closing a step, verify:
1. its script/module is loaded by the application;
2. the intended UI is present and reachable;
3. primary controls are wired to real actions;
4. local persistence/data relationships behave as intended;
5. empty/error states do not strand the user;
6. documentation matches the actual implementation;
7. backend-only dependencies are clearly marked if activation is deferred.

## Known reconciliation findings

- The old README contained duplicated Step 26 and conflicting Step 27/29 numbering. This was roadmap drift, not a reason to rebuild those features.
- Submission Readiness exists as both implementation and documentation and is loaded by the application.
- The writing ribbon, research journey and evidence-discovery modules exist and are loaded by the application.
- No obvious TODO/FIXME/coming-soon markers were found in the repository during the current audit.
- Supabase/cloud code exists, but activation is intentionally deferred. Do not interpret code-complete as connected.
- Step 30 must therefore refine and validate the existing writing-ribbon foundation rather than start a second competing implementation.

## Step 33 — implemented

Claim awareness now runs contextually inside the Writing Companion. It distinguishes researcher framing/developing interpretation from likely factual or empirical claims; recognises obvious in-text citations; checks whether related evidence is already linked to the active section; searches saved project highlights for possible matches; and routes the researcher into the existing evidence-linking workflow. Missing-evidence language is deliberately cautious and never treats a heuristic flag as proof that a statement is false.

Step 33 reuses and exposes the existing Evidence Check primitives instead of creating a second evidence model.

## Step 34 — implemented

Claim cards now expose a qualitative **Why this status?** evidence-confidence profile. It shows citation presence, matching saved passages, section linkage, appraisal context and possible direction/negation conflicts separately. Quire explicitly does not combine these signals into a validity or scientific-certainty score.

## Step 35 — implemented

The Article Reader now includes **Why do I care?**, a grounded thesis-value analysis that retrieves exact passages for Study, Findings, Limitations, Thesis relevance and Possible destination. Relevance/destination are explicitly presented as researcher-facing suggestions rather than claims made by the source.

## Step 36 — implemented

The Synthesis workspace now combines researcher-marked contradictory passages with cautious cross-paper contrast detection. Possible disagreements require overlapping finding terms plus differing direction/negation, can be opened as a focused paper pair, and are explicitly presented as comparison prompts rather than proof that studies truly contradict one another.

## Step 37 — implemented

Writing Review now prompts for critical engagement when substantive paragraphs cite sources without explicit comparison, present evidence without visible interpretation, or omit limitations/context/alternative explanations. These prompts are non-destructive and only appear when enough paragraph/evidence context exists.

## Step 38 — implemented

Selected PDF text now exposes an **Explain** action. The reader keeps the exact source passage/page visible and offers separate plain-reading, academic-reading, thesis-relevance and limitation/context prompts. Local mode explicitly avoids presenting an unverified paraphrase as authoritative technical meaning.

## Step 39 — implemented

Global search now acts as lightweight research memory: question scaffolding is ignored, concept coverage is ranked without requiring every query word to match, and results retain visible provenance across papers, source highlights, research notes, thesis text/structure, supervisor feedback and analysis memos.

## Step 40 — implemented

The Ideas workspace is no longer only static prototype content. Ideas are persisted through the existing local analysis-item store, move through Inbox → Developing themes → Ready for thesis, and carry explicit origin metadata (researcher, source-derived, supervisor, analysis or brainstorming) plus source/page identifiers where available. Ready ideas hand off naturally into thesis writing.

## Step 41 — implemented

The existing Thesis Map now includes persistent ready-for-thesis ideas as **Arguments** and likely empirical/factual sentences from real thesis sections as **Claims**. It connects themes → arguments → claims → evidence → writing where stored or cautiously derivable. Automatically inferred relationships are marked as derived rather than being presented as researcher-authored links.

## Step 42 — implemented

Supervision can now build a review package from recorded project data: changes since the latest review round, unresolved feedback/questions, thesis sections with no recorded evidence link, and active revision actions. The package is downloadable and explicitly does not determine academic quality or supervisor priorities. QA caught and fixed a missing local helper before the step was closed.

## Step 43 — implemented

Home now supports an explicit **End session** checkpoint stored locally per project. It records recent thesis work and notes, unresolved feedback and ready ideas, then provides a direct resume destination for the next session. It has no backend dependency.

## Step 44 — implemented

The integrated audit checked syntax for the newly touched workflow modules, verified that each new module is loaded by the application, and checked direct app-level event bindings against current DOM IDs. It found and fixed stale Home Copilot wiring left behind by the earlier Home simplification.

## Step 45 — implemented

Idea capture now uses an in-app provenance-aware modal rather than browser prompts. Selected PDF passages can be sent directly to Ideas with article ID, page, source label and excerpt preserved.

## Step 46 — implemented

Global Research Memory now includes an expandable **What Quire already knows about this** view. It groups retrieved workspace excerpts by provenance and explicitly states that it is assembling stored records rather than generating new factual claims.

## Step 47 — implemented

A local Personal Writing Growth Centre records only wording edits the researcher explicitly accepts. Lessons are project-scoped, bounded, grouped by recurring area and can be marked mastered by the researcher. Quire explicitly does not turn this into an English score.

## Step 48 — implemented

Ideas now expose a provenance-chain inspector showing stored origin/source/page/excerpt and direct source reopening where possible. It also surfaces likely downstream thesis sections using shared-term matching, clearly labelled as inferred rather than proof that the text originated from the idea.

## Step 49 — implemented

Ctrl/Cmd+K now acts as a find-or-do surface. Alongside workspace search it can surface common contextual actions such as capture idea, continue writing, link evidence, run writing review, save an end-session checkpoint and open progress. Command actions are excluded from Research Memory summaries.

## Step 50 — code-level audit complete

The release audit found no duplicate HTML IDs and successfully parsed all 35 local JavaScript modules. It also found and fixed two concrete regression issues: stale Home Copilot event wiring and an Idea Trace modal lifecycle problem. All newly added modules are loaded from `index.html`.

This is a **code-level** readiness result, not a claim that every interaction has been manually exercised in a real browser/device matrix. Real browser, mobile, keyboard-only and export rendering checks remain valuable before calling the frontend production-ready.

## Next value review — proposed Steps 51–56

- **Step 51 — In-App Workflow Diagnostics.** Extend Diagnostics with checks for the guided journey, active section, evidence graph, Ideas provenance, writing companion modules and local checkpoint/growth stores so regressions can be detected from inside Quire.
- **Step 52 — Citation & Source Integrity Preflight.** Before export, identify citations with missing article records, evidence links with missing source passages, uncited bibliography entries and cited sources absent from the bibliography.
- **Step 53 — Research Question Drift Monitor.** Compare themes, ready arguments, thesis claims and chapter focus with the saved research question/objectives; surface low-overlap areas as reflection prompts, not as invalid content.
- **Step 54 — Cross-Chapter Coherence Review.** Flag repeated claims, terminology inconsistencies, abrupt objective coverage gaps and contradictions between thesis sections for human review.
- **Step 55 — Export Fidelity & Submission Pack.** Add a pre-export package containing readiness report, reference integrity summary, supervisor/revision status and final thesis export metadata.
- **Step 56 — Manual Frontend Validation Gate.** Real-browser desktop/mobile, keyboard-only, screen-reader smoke checks, PDF/OCR interaction checks and Word/PDF export inspection. Backend activation must remain blocked until this gate is reviewed.

Do not treat Step 56 as complete from static code inspection alone. External Supabase activation still requires an explicit later decision.

A second product review identified the next high-value frontend milestones:

- **Step 45 — Better Idea Capture & Source-to-Idea Handoffs.** Replace prompt-based idea capture with a proper modal and allow selected/highlighted source material, supervisor feedback and analysis memos to seed a provenance-linked idea.
- **Step 46 — Research Memory Answer Builder.** Build a provenance-preserving “what do I know about X?” summary from retrieved papers/highlights/notes/thesis/feedback without inventing content.
- **Step 47 — Personal Writing Growth Centre.** Activate the latent writing-coach profile/lesson concepts safely, teach recurring grammar/vocabulary patterns and track reviewed/mastered lessons without grading the researcher.
- **Step 48 — Provenance Chain Inspector.** Let the researcher trace an idea/claim backward to its source note/highlight/feedback and forward to thesis sections.
- **Step 49 — Contextual Command Palette.** Turn global search into a keyboard-first “find or do” surface for common research actions without adding navigation.
- **Step 50 — Frontend Release Readiness.** Final responsive/accessibility/data-integrity/export regression audit and explicit decision point before any backend activation.

These milestones should be implemented and QA'd one at a time. Backend activation remains deferred.

Preserve these as approved product directions, but do not implement them as disconnected screens. They should appear contextually inside the five-stage flow.

### Intelligent Writing
- “What am I trying to say?” reflection of rough writing.
- Idea → academic paragraph builder that separates the researcher's idea, claims needing evidence, questions, structure and literature needs.
- Claim-aware writing that identifies statements likely to need references.
- Personal academic-English coaching based on recurring patterns, without a simplistic score.
- Contextual academic vocabulary choices: more precise, cautious, formal or simpler, with meaning differences explained.

### Evidence Intelligence
- Evidence confidence at claim level rather than citation counting.
- Structured “Why do I care?” paper summaries: study, findings, limitations, thesis relevance, possible destination and exact supporting passages.
- Contradiction/counter-evidence detection.
- “Am I being critical enough?” guidance that distinguishes description from comparison, interpretation and critique.
- Reading assistance for selected passages: explain simply/academically, relevance, limitations and relation to the research question.

### Research Memory
- Natural-language recall across papers, highlights, notes and prior ideas.
- Idea provenance: distinguish own idea, source-derived thought, supervisor feedback, highlight and brainstorming origin.
- Automatically maintained argument map connecting research question → objectives → themes → arguments → claims → evidence/counter-evidence → thesis sections.

### Guided Thesis Workflow
- Supervisor review packages with changes, unresolved questions, weak-evidence areas and revision actions.
- End-of-session checkpoint summarising work completed, unresolved questions and the best starting point next time.
- Context-aware next actions throughout Quire so the researcher does not need to remember which tool comes next.

Core rule: Quire should become simpler as it becomes more capable. Hide or remove features that cannot be integrated naturally into the researcher's current context.

## Future roadmap direction

After Step 32, convert the agreed backlog above into numbered milestones in dependency order. Do not implement all features at once. Continue consolidating Quire around Discover → Understand → Organise → Write → Review, with eventual accessibility/device testing, export fidelity and controlled backend activation.

## New-chat recovery

In a new conversation, instruct ChatGPT to read:
1. `README.md`
2. `docs/PROJECT_MASTER.md`
3. `docs/CONTINUE_HERE.md`

Then inspect the actual code for the current step before making changes. The repository is authoritative when old chat transcripts and recollection conflict.
