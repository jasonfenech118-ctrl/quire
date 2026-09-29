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

## Agreed future feature backlog — after Step 33

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
