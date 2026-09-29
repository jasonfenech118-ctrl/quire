# Quire Guided Research Journey & Evidence-Aware Writing

This usability layer simplifies the growing Quire feature set around one visible workflow:

**Plan → Find → Read → Understand → Organise → Write → Check → Finish**

Advanced workspaces remain available, but the journey bar explains the role of each stage and provides direct navigation.

## Word-style writing ribbon

The chapter editor now uses contextual ribbon tabs:

- Home
- Insert
- References
- Evidence
- Review
- Copilot

The ribbon keeps formatting, references, evidence checking and writing assistance in the place where the thesis is actually being written.

## Evidence discovery

From the References ribbon, **Find evidence** uses a local-first workflow.

### My Library

Quire searches article metadata, abstracts, saved highlights and research notes from the active project.

Relevant saved passages are surfaced with page numbers when available.

### Scholarly web discovery

When local evidence is insufficient, the user can explicitly switch to scholarly web discovery.

The first implementation uses Crossref metadata search to discover candidate scholarly works.

Web results are labelled **NOT YET VERIFIED**.

A discovery result is not treated as evidence merely because its title or metadata appears relevant. The researcher should inspect the abstract/full paper before citing it.

## Claim interpretation check

A paper-specific claim check compares manuscript wording with saved passages from that paper and reports:

- Related support found
- Partial / uncertain support
- Possible contradiction
- Insufficient evidence

The current local check is intentionally conservative and heuristic. It cannot replace reading the paper or a grounded model with access to the full source text.

## Writing-assistance principle

Quire keeps three things distinct:

1. the researcher's argument
2. what the source actually states
3. AI/software suggestions about wording

Writing assistance must not silently add factual claims or turn an unverified discovery result into a citation.

## Next development

The next evidence-aware writing work should deepen this foundation by:

- grounding claim checks against full PDF text, not only saved highlights
- extracting the most relevant page passages for a selected claim
- adding explicit support/contradiction reasoning from grounded AI
- routing imported discovery results directly into reading/highlighting
- making academic-language suggestions accept/reject changes rather than overwriting text
