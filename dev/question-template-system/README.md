# Question Template System Workspace

Date: 2026-07-04

This workspace surveys human-authored production questions and turns the observed patterns into reusable templates for future agent-guided question generation.

The taxonomy described here belongs to the earlier design and is retained as research context.

## Source

- Data source: production Convex `question` table.
- Access method: `bunx convex data question --prod --limit 20000 --format json`.
- Human-created discriminator: `aiGenerated === false`.
- Surveyed production slice: latest 20,000 question rows, from 2025-10-14 through 2026-06-30.
- Human-authored rows in slice: 2,258.

The Convex plugin in this session exposed project guidance tools, but not a live data browser. Production reads were done through the project Convex CLI with Bun, per repository policy.

## Historical reference

These documents preserve the earlier template research. The unused structured taxonomy and its one-off generator have been retired; the live pipeline now uses the question types and source objectives in `src/convex/questionStudio/`.

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

## Recommended First Read

1. `survey/prod-human-question-survey.md`
2. `template-anatomies/README.md`
3. `templates/00-template-index.md`
4. `guidance/agent-generation-playbook.md`
5. `examples/full-production-examples.md`
