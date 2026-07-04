# Question Template System Workspace

Date: 2026-07-04

This workspace surveys human-authored production questions and turns the observed patterns into reusable templates for future agent-guided question generation.

The live Question Studio pipeline still uses `reasoningOrder` (`first`, `second`, `third`) as its stored coarse taxonomy. The cognitive and format templates in this workspace are finer authoring labels underneath that order system, not current schema fields.

## Source

- Data source: production Convex `question` table.
- Access method: `bunx convex data question --prod --limit 20000 --format json`.
- Human-created discriminator: `aiGenerated === false`.
- Surveyed production slice: latest 20,000 question rows, from 2025-10-14 through 2026-06-30.
- Human-authored rows in slice: 2,258.

The Convex plugin in this session exposed project guidance tools, but not a live data browser. Production reads were done through the project Convex CLI with Bun, per repository policy.

## Structured Taxonomy

- Source of truth: `src/convex/questionStudio/templateTaxonomy.ts`.
- It exports the 12 cognitive templates, 6 format templates, the reasoning-order mapping, and compact prompt-card helpers.
- The markdown anatomy pages are generated documentation. Edit the structured taxonomy first, then rerun `bun dev/question-template-system/scripts/build-template-anatomies.mjs`.
- The generator script keeps only production-example selection heuristics and markdown rendering.

## Folder Map

- `survey/prod-human-question-survey.md`: counts, patterns, and recommended template taxonomy.
- `templates/00-template-index.md`: short index of all proposed template types.
- `templates/recall-and-recognition.md`: recall, definition, recognition, and cloze templates.
- `templates/discrimination-and-mechanism.md`: comparison, discrimination, mechanism, and causal chain templates.
- `templates/application-diagnosis-and-management.md`: diagnosis, interpretation, management, safety, and contraindication templates.
- `templates/quantitative-sequencing-and-formats.md`: numeric thresholds, sequencing, true/false, matching, fill-in-the-blank, and multi-select.
- `template-anatomies/`: one directory per template, each with 12 compact content examples, anatomy notes, instructions, and considerations.
- `guidance/agent-generation-playbook.md`: how agents should pick and instantiate templates.
- `guidance/template-prompt-cards.md`: compact prompt cards generated from the structured taxonomy for future prompt injection.
- `guidance/quality-rubric.md`: review rubric for accepting, revising, or rejecting generated questions.
- `examples/full-production-examples.md`: cleaned example set from the human production question bank.
- `scripts/build-template-anatomies.mjs`: local generator used to build the per-template anatomy pages from the structured taxonomy and sampled production JSON.

## Recommended First Read

1. `survey/prod-human-question-survey.md`
2. `template-anatomies/README.md`
3. `templates/00-template-index.md`
4. `guidance/agent-generation-playbook.md`
5. `examples/full-production-examples.md`
