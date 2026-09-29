# CONTINUE HERE — Quire

## Current position

**Step 31 — Guided five-destination product framework — complete.**

The primary user-facing framework is **Home → Research → Ideas → Thesis → Progress**. Specialist workflows remain under contextual/secondary tools instead of competing in the main navigation.

**Step 32 — Writing Understanding & Language Coach — in progress.**

## Step 32 implemented so far

- Added a contextual **Writing companion** beside the thesis editor.
- **What Quire understands** reflects back the apparent main idea of the paragraph so the researcher can detect ambiguity or a mismatch in intended meaning.
- **English & clarity** provides conservative local suggestions for long sentences, repeated “and”, conversational/general vocabulary, overly definitive claims and unclear sentence relationships.
- Guidance favours precise natural academic English; it must not encourage complicated vocabulary merely to sound academic.
- Suggestions remain separate from manuscript content and never rewrite automatically.
- **Review current paragraph** hands the paragraph to the existing Writing Review flow for a deeper optional review.
- Existing evidence for the section remains directly below the companion so language help does not displace source awareness.
- Deeper paragraph review is now separated into **Meaning understood**, **Language & grammar**, **Academic clarity**, **Vocabulary**, and **Evidence & claim caution**.
- Conservative before/after wording proposals appear only when a straightforward local edit is available; applying one requires an explicit **Accept** action in Writing Review.
- Recurring writing habits are tracked locally (for example long linked sentences or repeated “and”) and surfaced gently after enough samples; Quire deliberately does not assign an English score.
- Replaced the competing eight-step research strip with one five-stage mental model: **Discover → Understand → Organise → Write → Review**.
- The research-flow strip now derives a **Sensible next step** from actual project state (papers, highlights/notes, evidence links and writing) instead of acting as static navigation.
- Five-stage flow is responsive and keeps specialist tools underneath the simpler user-facing framework.
- Contextual workflow handoffs are now event-driven: highlight captured → **Organise evidence**; evidence assigned to a destination → **Use it in writing**; evidence linked to a thesis section → **Continue writing**; writing review → **Check evidence** when evidence issues are detected, otherwise **Continue writing**.
- The agreed future feature set is preserved in PROJECT_MASTER under four areas: Intelligent Writing, Evidence Intelligence, Research Memory and Guided Thesis Workflow.
- Writing Companion is now collapsible; the user's Show/Hide preference is stored locally.
- Companion QA behavior was tightened: empty writing gets a neutral prompt, very short fragments are treated as unfinished thoughts, and recurring-pattern learning still requires a substantive sample.
- **More tools** retains specialist capability but is no longer a flat list; tools are grouped as Project, Research, Understand & Organise, and Review & Finish.

## Next exact work

1. Review Home for duplicated cards/actions that repeat primary navigation or the new sensible-next-step guidance.
2. Perform final code-level Step 32 coherence/accessibility QA across the companion, five-stage flow, handoffs and grouped specialist tools.
3. If QA is clean, mark Step 32 complete in PROJECT_MASTER/README and define the first milestone from the agreed future backlog before implementing it.
4. Keep Step 32 frontend-first and local. Do not activate Supabase.

## Product principles to preserve

- The researcher remains the author.
- Never silently rewrite manuscript text.
- Never invent evidence or references.
- Separate the researcher's interpretation from sourced claims.
- Preserve source/page provenance where available.
- Language improvement must preserve intended meaning.
- Prefer clear, precise academic English over ornamental vocabulary.
- The platform should lead naturally from one task to the next rather than requiring the user to remember where tools live.

## Backend rule

Supabase activation remains deliberately deferred. Do not run SQL or connect Quire to an external Supabase project during Step 32. The separate Customer Roster project must remain untouched.

## New-chat recovery

Read `README.md`, `docs/PROJECT_MASTER.md`, and this file, then inspect the Step 32 implementation before adding features.

Resume phrase:

> “Continue Quire Step 32 from docs/CONTINUE_HERE.md. Keep the writing companion optional, meaning-preserving and frontend-first.”
