# Review Pass

The quality rubric is a required review pass. The reviewer either accepts, revises, or rejects each candidate before it is saved.

## Input

- Draft candidate question.
- Source excerpts and citations.
- Class name.
- Requested `reasoningOrder`.
- Selected cognitive template, if available as planning metadata.
- `config/agent-question-system.json`.

## Output

Match the live review shape when possible:

```json
{
	"candidateIndex": 0,
	"verdict": "accept",
	"reasons": ["..."],
	"sourceSupport": "strong",
	"answerQuality": "clear",
	"revisedStem": "...",
	"revisedRationale": "..."
}
```

Use `revisedStem` and `revisedRationale` only when the candidate can be safely repaired without changing the answer contract. If options or the correct answer need to change, mark `revise` and explain why.

## Required Checks

### 1. Schema Compatibility

- `type` is `multiple_choice`.
- Options are 3-5 strings.
- Current live profile has exactly one correct answer.
- Correct answer exactly matches one option.
- Stem and rationale are within expected length.

Reject unsupported formats instead of trying to smuggle them through.

### 2. Source Support

- Every factual claim in the stem, correct answer, and rationale is supported.
- The answer does not require hidden media, missing context, or unstated assumptions.
- Citations point to the source that actually supports the answer.

### 3. Cognitive Fit

- The question tests the requested `reasoningOrder`.
- The selected cognitive template matches the learner task.
- First-order questions do not become patient cases.
- Third-order questions include enough context to justify integration.

### 4. Answer Contract

- One option is clearly best under current live constraints.
- Distractors are wrong for meaningful reasons.
- Options are parallel in category, length, and specificity.
- Numeric options include units and do not mix units casually.

### 5. Rationale Teaching Value

- The rationale explains why the answer is correct.
- It also explains the main distinction, mechanism, threshold, or trap.
- It does not merely restate the answer.
- It does not mention source documents, pages, slides, citations, or RAG.

### 6. Context Scrub

- Student-facing text uses class context only when useful.
- Remove class code, module title, chapter label, and survey-only context.
- Remove local humor when it obscures the learning point.

### 7. Safety

- Reject unsafe management claims that are not source-supported.
- Do not overstate contraindications or risks.
- If a management answer depends on a constraint, the stem must include that constraint.

## Scoring

Score 0-2 for each dimension.

| Dimension            | 0                | 1                    | 2                      |
| -------------------- | ---------------- | -------------------- | ---------------------- |
| Schema compatibility | invalid          | repairable           | valid                  |
| Source support       | unsupported      | partial              | directly supported     |
| Cognitive fit        | wrong task       | weak fit             | clear fit              |
| Distractors          | random           | plausible but uneven | meaningful near-misses |
| Rationale            | absent/repeats   | partial              | teaches transfer rule  |
| Precision and safety | ambiguous/unsafe | mostly clear         | clear and safe         |

Recommended verdict:

- 10-12: accept.
- 7-9: revise.
- 0-6: reject.

Override to reject for unsupported format, unsupported answer, hidden media dependency, contradictory rationale, or unsafe invented management.
