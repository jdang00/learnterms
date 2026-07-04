# Quality Rubric

Use this rubric to review generated questions before saving.

## Accept

Accept when all are true:

- The question tests a clear learning task.
- The answer is unambiguous from the source.
- Distractors are plausible and same-category.
- The rationale teaches why the answer is correct.
- The stem is no longer than needed.
- Numeric values include units.
- Multi-select questions have independently judgeable options.
- Matching sets use homogeneous prompt and answer types.
- Case questions include enough relevant details and no distracting noise.

## Revise

Revise when any are true:

- The question is directionally useful but too generic.
- The rationale only repeats the answer.
- Distractors are too easy, random, or not parallel.
- The stem asks for recall but the source supports a better applied question.
- A numeric threshold is asked without units.
- A clinical action lacks constraints needed to choose safely.
- The question asks "which is true" but multiple options are arguably true.
- The wording relies on local humor that obscures the learning point.

## Reject

Reject when any are true:

- The answer is not supported by the source.
- The question invents facts not present in the source.
- The correct answer depends on hidden media or missing context.
- The stem has a double negative or ambiguous exception.
- The options contain overlapping answers that make grading unfair.
- The rationale contradicts the selected answer.
- The question is pure trivia with no course relevance.
- The question could harm learning by teaching unsafe management.

## Fast Scoring

Score each item 0-2:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Source support | unsupported | partially supported | directly supported |
| Cognitive fit | unclear task | task present but weak | template matches goal |
| Distractors | random | plausible but uneven | plausible near-misses |
| Rationale | absent/repeats | partial explanation | teaches transfer rule |
| Precision | ambiguous | mostly clear | unambiguous and scoped |
| Student value | low | useful | high-yield and memorable |

Recommended action:

- 10-12: accept.
- 7-9: revise.
- 0-6: reject.

## Reviewer Prompts

Use these questions during review:

- What mistake is this question designed to catch?
- Could a learner answer by pattern-matching without understanding?
- Is every wrong option wrong for a meaningful reason?
- Does the rationale explain the decision rule?
- Would a student know whether more than one answer can be correct?
- If a number appears, are the units and clinical use clear?
- If this is a case, which details are diagnostic and which are noise?

