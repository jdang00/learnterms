# Example Curation Policy

Examples are useful for humans and prompt cards, but they should not become hidden classifiers.

## Curation Workflow

1. Start from a frozen snapshot.
2. Use explicit criteria to find possible examples.
3. Use regex only as a search aid, not as the final labeler.
4. Manually assign `cognitiveTemplate`.
5. Manually assign `formatTemplate`.
6. Strip raw row IDs, hashes, class codes, module titles, and chapter titles from public docs.
7. Keep a private manifest if IDs are needed for traceability.

## Example Fields

Use this compact shape in agent-facing docs:

```json
{
	"className": "Ocular Disease",
	"topicTitle": "Glaucoma medication adverse effects",
	"reasoningOrder": "second",
	"cognitiveTemplate": "mechanism.causal",
	"formatTemplate": "format.single_best",
	"stem": "...",
	"options": ["...", "...", "...", "..."],
	"correctAnswer": "...",
	"rationalePattern": "cause -> intermediate -> outcome"
}
```

Do not include:

- Row IDs.
- Hashes.
- Creation timestamps.
- Class codes.
- Module titles.
- Chapter labels.
- Raw database payloads.

## Unsupported Example Handling

If a good historical example uses an unsupported format:

- Fill-in-the-blank -> rewrite as a single-best term or threshold question.
- Matching -> rewrite as one classification or order decision.
- Media interpretation -> keep only if the visible cue is represented in source text.
- True/false -> rewrite as a misconception boundary question with 3-5 options.

Mark rewritten examples as rewrites, not as raw production examples.

## Anti-Pattern

Do not export a regex map like:

```text
if stem contains "why" -> mechanism.causal
if stem contains "most likely" -> diagnosis.case
```

Those rules are useful for quick search, but they are too brittle for live generation. The agent should choose templates from the source meaning, requested order, and prompt-card guidance.
