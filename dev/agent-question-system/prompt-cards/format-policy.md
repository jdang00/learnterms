# Format Policy

## Current Live Format

Use `format.single_best`.

```text
Output type: multiple_choice
Options: 3-5 strings, usually 4
Correct answers: exactly 1 option string
Correct answer must exactly match one option
Rationale: explain why the selected option is best and why the main near-miss is wrong
```

## Multi-Select

`format.select_all` is config-ready but disabled for the current live worker because the candidate schema currently requires exactly one correct answer.

Enable it only after the candidate schema, candidate coercion, review pass, and insert path all support `correctAnswers.length > 1`.

When enabled:

- The stem must clearly signal multiple answers.
- Every option must be independently judgeable.
- The correct answer set must be complete.
- The rationale must explain the correct set and at least one false option.

## Unsupported Formats

Do not ask agents to generate these as standalone formats:

- `format.fill_blank`
- `format.matching`
- `format.media_interpretation`
- `format.true_false`

True/false claims can sometimes be rewritten as single-best misconception questions with 3-5 options, but they should not be emitted as two-option true/false items.

## Context Policy

Use class name only when course context matters.

Do not include class code, chapter labels, or module titles in agent-facing prompt cards unless a future workflow explicitly needs them. They were useful for survey organization, but they add noise to live generation.

Student-facing text must not mention source documents, notes, pages, slides, citations, or RAG.
