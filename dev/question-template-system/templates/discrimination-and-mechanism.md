# Discrimination And Mechanism Templates

## `discrimination.compare`

Use when the learner must separate two or more similar concepts, tests, diseases, pathways, drugs, or management choices.

### Stem Patterns

- `Which finding best differentiates [A] from [B]?`
- `Which test distinguishes [entity A] from [entity B]?`
- `Which statement is true when comparing [A] and [B]?`
- `Match each [entity] with its distinguishing association.`

### Guidance

- Make the distractors plausible for the neighbor concept.
- Use the rationale to draw the boundary explicitly.
- Avoid asking for "the difference" without naming the axis of comparison.
- If a learner could answer by memorizing a single fact, consider `recognition.feature` instead.

### Production Example

Context: OPT5134 Vision Science II: Sensory Aspects / Quiz 8

Type: `true_false`

Stem:

> Pseudoisochromatic plates can be used to distinguish dichromatic and anomalous trichromatic vision.

Options:

- True
- False correct

Rationale:

> Pseudoisochromatic plates can indicate a color deficiency, but cannot differentiate dichromatic from anomalous trichromatic color deficiency. The anomaloscope is the test that can do this.

## `mechanism.causal`

Use when the learner must understand why something happens, not only that it happens.

### Stem Patterns

- `Why does [finding/action/drug] lead to [outcome]?`
- `Which mechanism explains [phenomenon]?`
- `Which pathway is responsible for [effect]?`
- `Which statement best explains [experimental result]?`

### Guidance

- The correct answer should include a causal link, not just a named fact.
- Distractors should represent common wrong causal stories.
- The rationale should trace the chain: cause -> intermediate -> outcome.
- Good mechanism questions are especially useful after a recall question has established vocabulary.

### Production Example

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `multiple_choice`, multi-select

Stem:

> In Hubel & Wiesel's Occlusion Kittens experiment, which of the following BEST explains what happened regarding when the kittens were deprived of their binocular visual input?

Options:

- If the kittens were visually deprived during the critical period only and allowed binocular vision after the end of that period, their visual cortex would slowly return to normal
- If the kittens were visually deprived during the critical period only and allowed binocular vision after the end of that period, their visual cortex would never recover normal binocularity correct
- Enucleation helped return performance of the deprived eye after the critical period
- Enucleation did not help return performance of the deprived eye after the critical period correct

Rationale:

> Hubel and Wiesel demonstrated that the visual cortex possesses a critical period of high plasticity where neural connections are permanently shaped by sensory experience. If normal binocular input is not established during this specific developmental window, structural changes in ocular dominance columns become permanent and cannot be reversed by subsequent visual experience or surgical interventions like enucleation.

## Mechanism Ladder

Agents should vary mechanism depth:

- Level 1: name the mechanism.
- Level 2: connect mechanism to observed sign.
- Level 3: predict outcome if the mechanism is changed.
- Level 4: compare two mechanisms that produce similar signs.

