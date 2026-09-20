# Generation Pass

This pass turns source material into a draft that fits the live agent output contract.

## Inputs

- Class name.
- Source topic title.
- Retrieved source excerpts and citations.
- Requested `reasoningOrder`.
- Optional focus notes from the user.
- `config/agent-question-system.json`.

Do not use class code, chapter title, or module title as generation context.

## Steps

1. Confirm the requested `reasoningOrder`.
2. Pick one cognitive template that fits that order and the source.
3. Use `format.single_best` unless multi-select is explicitly enabled in config and the runtime supports it.
4. Draft a concise stem using `prompt-cards/stem-patterns.md` and only the context required by the template.
5. Create 3-5 parallel options.
6. Choose exactly one correct option in the current live profile.
7. Write a rationale that teaches the transfer rule, not just the answer.
8. Attach source citations in the allowed metadata fields.
9. Run the review pass before saving or returning the candidate.

## Template Selection

Do not classify source text with regexes. Choose templates from the explicit order, source meaning, and prompt-card guidance.

Good selection signals:

- First-order: the source supports one fact, definition, feature, association, or threshold.
- Second-order: the source supports one-step application, mechanism, comparison, sequence, or interpretation.
- Third-order: the source supports diagnosis, management, safety decisions, or integration of multiple facts.

## Drafting Contract

The draft must match the current candidate shape:

```json
{
	"type": "multiple_choice",
	"stem": "...",
	"options": ["...", "...", "...", "..."],
	"correctAnswers": ["exact option text"],
	"rationale": "...",
	"reasoningOrder": "first"
}
```

The correct answer string must exactly match one option string.

## Common Rewrites

- Fill-in-the-blank request -> `recall.definition` or `recall.threshold` single-best multiple choice.
- Matching request -> `discrimination.compare` or `sequence.timeline` single-best classification/order question.
- Media interpretation request -> `interpretation.test` only if the relevant observation is present in text.
- True/false request -> rewrite as a misconception or boundary single-best question with 3-5 options.
- Multi-select request while disabled -> ask for the best defining feature or best supported statement.
