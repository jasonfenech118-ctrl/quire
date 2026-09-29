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

## Next exact work

1. Improve deeper review so it explicitly separates **Meaning understood**, **Language/grammar**, **Academic clarity**, **Vocabulary**, and **Evidence/claim caution**.
2. Add an optional before/after wording proposal that can be copied/applied only by explicit user action.
3. Track recurring writing patterns locally so Quire can identify habits such as long linked sentences or repeated connectors — without giving a simplistic English score.
4. Continue simplifying transitions around **Discover → Understand → Organise → Write → Review**.
5. Keep Step 32 frontend-first and local. Do not activate Supabase.

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
