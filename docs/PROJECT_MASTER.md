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
- Step 30: Unified Writing Workspace & Academic Ribbon — existing code foundation; reconciliation/refinement in progress.

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

## Future roadmap direction

After Step 30 is reconciled and approved, future numbered steps should be added here before implementation. Likely areas include deeper contextual academic assistance, research provenance/idea tracing, usability consolidation, accessibility/device testing, export fidelity and eventual controlled backend activation. These are roadmap directions, not yet claims of implementation.

## New-chat recovery

In a new conversation, instruct ChatGPT to read:
1. `README.md`
2. `docs/PROJECT_MASTER.md`
3. `docs/CONTINUE_HERE.md`

Then inspect the actual code for the current step before making changes. The repository is authoritative when old chat transcripts and recollection conflict.
