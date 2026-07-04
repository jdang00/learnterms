# Reproducibility Pass

This pass prevents the agent system from becoming a moving target.

## Rules

- Do not use "latest production questions" as a reproducible input.
- Use frozen snapshots for surveys, examples, and generated docs.
- Record a manifest for every generated artifact.
- Sort deterministically.
- Keep template definitions in structured config.
- Do not use regex classifiers for live template routing.

## Manifest

Every generated doc or curated example set should have a companion manifest with:

```json
{
	"systemVersion": "2026-07-04.agent-optimized.v1",
	"inputSnapshot": "prod-question-snapshot-YYYY-MM-DD.json",
	"inputHash": "sha256:...",
	"configHash": "sha256:...",
	"selectionSeed": "agent-question-system-v1",
	"selectedTemplateIds": ["recall.definition", "mechanism.causal"],
	"generatedAt": "2026-07-04T00:00:00.000Z"
}
```

Use a real timestamp for auditability, but never use timestamps as a source of ordering.

## Deterministic Selection

Use this precedence:

1. Explicit curated example IDs from a manifest.
2. Manual template assignment.
3. Stable sort by `templateId`, `className`, `topicTitle`, and a stem hash.
4. Seeded sampling only if balancing is required.

Do not sort by object iteration order, filesystem order, or "latest" unless the manifest records the exact snapshot and sort key.

## Regex Policy

Regex may be used only for example fixing:

- Finding candidate examples that might belong to a template.
- Detecting unsupported legacy examples such as matching or fill-in-the-blank.
- Auditing old docs for raw IDs, hashes, or survey-only fields.

Regex results must be manually reviewed before they become examples or template assignments.

Do not use regex for:

- Runtime template selection.
- Reasoning-order selection.
- Distractor strategy selection.
- Deciding whether a generated question passes review.

## Context Reproducibility

Generated examples and prompt cards should store only the context needed by the live agent:

- Keep class name.
- Keep topic title when it is the source topic.
- Drop class code.
- Drop module/chapter labels unless the source text itself requires them.

This avoids coupling the agent prompts to survey-era organization fields.
