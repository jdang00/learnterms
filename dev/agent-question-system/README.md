# Agent Question System

This workspace is the agent-optimized version of the broader question template survey. It keeps the useful cognitive taxonomy, but conforms it to the current Question Studio generation surface.

## Live Constraints

- Output type is `multiple_choice`.
- Live candidate generation currently expects 3-5 options.
- Live candidate generation currently expects exactly one correct answer.
- Multi-select is treated as config-ready, but disabled until the candidate schema and generation output permit multiple correct answers.
- Fill-in-the-blank, matching, media interpretation, and true/false are not standalone supported formats here.
- Context should focus on the class name and source topic. Do not use class code, chapter title, or module title as generation-facing context.

## Design Principles

- `reasoningOrder` stays the coarse dial: `first`, `second`, or `third`.
- Cognitive template is a planning label, not a schema field.
- Format policy is small: single-best multiple choice now; multi-select later.
- Review is a pass in the agent workflow, not a loose rubric page.
- Reproducibility is explicit: frozen inputs, deterministic ordering, manifests, and no runtime regex classification.
- Regex classifiers may be used only for example fixing or curation, never for live template routing.

## Files

- `config/agent-question-system.json`: structured configuration for supported formats, cognitive templates, order mapping, review thresholds, and reproducibility rules.
- `config/reproducibility-manifest.example.json`: example manifest for generated docs or curated example sets.
- `prompt-cards/cognitive-templates.md`: compact prompt cards for the cognitive templates that remain useful under the multiple-choice surface.
- `prompt-cards/stem-patterns.md`: stem examples grouped by reasoning order and cognitive template.
- `prompt-cards/format-policy.md`: exact format contract for current and future agent output.
- `passes/generation-pass.md`: how an agent should plan and draft a question.
- `passes/review-pass.md`: the quality rubric converted into an explicit review step.
- `passes/reproducibility-pass.md`: deterministic data, example, and doc-generation requirements.
- `examples/example-curation-policy.md`: how examples should be curated without turning regexes into production classifiers.

## Relationship To The Survey System

The broader workspace at `dev/question-template-system/` remains useful for research and examples. This workspace is the narrower operational layer for agent generation. If the two disagree, prefer this workspace for live Question Studio behavior.
