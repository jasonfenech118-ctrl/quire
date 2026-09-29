# CONTINUE HERE — Quire

## Current position

**Steps 31 and 32 are complete.**

Quire now uses one primary product framework:

**Home → Research → Ideas → Thesis → Progress**

and one research-process mental model:

**Discover → Understand → Organise → Write → Review**

Specialist workflows remain available contextually or under grouped **More tools** rather than competing with the main navigation.

## Step 32 completed

- Contextual **Writing Companion** beside the thesis editor.
- **What Quire understands** reflects the apparent meaning of the current paragraph.
- Optional English/clarity guidance for sentence length, repeated connectors, conversational/general wording, precision and overly strong claim language.
- Empty text and short fragments are handled quietly rather than over-corrected.
- Deeper paragraph review separates Meaning, Language & grammar, Academic clarity, Vocabulary, and Evidence & claim caution.
- Conservative wording proposals require explicit acceptance; manuscript text is never silently rewritten.
- Recurring writing habits are learned locally only after substantive samples and are never turned into a language score.
- Writing Companion can be collapsed and its visibility preference is remembered locally.
- Five-stage guided flow derives a **Sensible next step** from project state.
- Event-driven handoffs connect reading → organising → writing → review/evidence checking.
- High-level stage navigation stays on simple primary destinations; specialist screens are surfaced contextually.
- Five-stage controls support keyboard navigation and descriptive accessibility labels.
- Home is simplified around current thesis, recent work, project snapshot and milestones; duplicate Copilot/next-step surfaces were removed.
- **More tools** is grouped into Project, Research, Understand & Organise, and Review & Finish.
- The agreed future feature backlog is preserved in PROJECT_MASTER.

## Next milestone

Define **Step 33** from the agreed backlog before implementation.

Recommended first dependency: **Claim-aware writing & evidence intelligence foundation**.

Why first:
- it builds directly on the Step 32 Writing Companion;
- Quire already has source-linked evidence, exact passages, citations and evidence checking;
- it unlocks later evidence-confidence, contradiction detection and stronger critical-writing guidance;
- it can remain contextual inside Thesis rather than adding another destination.

Proposed Step 33 scope:
1. Detect likely factual/empirical claims in the current paragraph without treating every sentence as a claim.
2. Distinguish likely **researcher interpretation / framing** from statements that probably require evidence.
3. Show claim-level status beside writing: evidence linked, citation present, evidence may be missing, or review needed.
4. Let the researcher open matching existing library evidence before searching externally.
5. Preserve uncertainty: Quire suggests that evidence may be needed; it does not declare unsupported claims as false.
6. Keep all assistance non-destructive and frontend-first.

Do not start Step 34 features until Step 33 is reconciled and usable.

## Product principles to preserve

- The researcher remains the author.
- Never silently rewrite manuscript text.
- Never invent evidence or references.
- Separate the researcher's interpretation from sourced claims.
- Preserve source/page provenance where available.
- Language improvement must preserve intended meaning.
- Prefer clear, precise academic English over ornamental vocabulary.
- The platform should lead naturally from one task to the next rather than requiring the user to remember where tools live.
- Quire should become simpler as it becomes more capable.

## Backend rule

Supabase activation remains deliberately deferred. Do not run SQL or connect Quire to an external Supabase project during the next frontend milestone. The separate Customer Roster project must remain untouched.

## New-chat recovery

Read `README.md`, `docs/PROJECT_MASTER.md`, and this file, then inspect the actual implementation before adding features.

Resume phrase:

> “Continue Quire from docs/CONTINUE_HERE.md. Step 32 is complete; define and implement Step 33 claim-aware writing frontend-first.”
