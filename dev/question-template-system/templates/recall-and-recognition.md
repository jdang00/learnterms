# Recall And Recognition Templates

## `recall.definition`

Use when the learner should retrieve a named concept, structure, definition, abbreviation, or high-yield association.

### Stem Patterns

- `What is the name of [definition or phenomenon]?`
- `[Description] is known as which of the following?`
- `Which term refers to [definition]?`
- `The [landmark/object/process] is called the _____.`

### Guidance

- Keep the stem short unless context is necessary.
- Make distractors the same semantic class as the correct answer.
- Avoid pure trivia unless the course clearly expects exact recall.
- The rationale should give one memory hook or contrast, not just repeat the answer.

### Production Example

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 1

Type: `fill_in_the_blank`

Stem:

> What is the name of the area on either side of the horopter that allows a "buffer" of retinal disparity before perceiving diplopia?

Accepted answers:

- `exact:Panum's Fusional Area`
- `exact:Panum's Space`
- `exact:Panum's Area`
- `exact:Panum's`
- `exact:Panum`

Rationale:

> This small amount of "allowed" disparity is the basis for stereopsis.

## `recall.threshold`

Use when the learner must know a number, range, cutoff, value, timeline, formula, or dose.

### Stem Patterns

- `What is the threshold for [normal/abnormal criterion]?`
- `What range is expected for [measurement]?`
- `At what [value/time/dose] does [condition/action] become relevant?`
- `Which value best represents [clinical cutoff]?`

### Guidance

- Prefer ranges only when the source uses ranges.
- Include units in every option.
- Use plausible neighboring numbers as distractors.
- When possible, tie the number to interpretation or management in the rationale.

### Production Example

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 1

Type: `multiple_choice`

Stem:

> What is the threshold for normal stereoacuity in the adult population?

Options:

- `40"` correct
- `60"`
- `100"`
- `20"`
- `30"`

Rationale:

> 95% of the population has a stereoacuity of 40 arc seconds or better. If the patient is 40" or better, they are considered normal.

## `recognition.feature`

Use when the learner should identify a correct feature, sign, finding, property, or association.

### Stem Patterns

- `Which of the following is true about [topic]?`
- `Which finding is associated with [condition]?`
- `Which feature best identifies [entity]?`
- `Which statement correctly describes [process]?`

### Guidance

- Keep options parallel.
- Include one or more near-misses that are true of related topics but false here.
- Avoid "all of the above" unless the course already uses it heavily.
- The rationale should state why the correct feature belongs and why the tempting distractor does not.

## `recognition.feature_set`

Use when the category has multiple true features and students benefit from seeing the full boundary of the category.

### Stem Patterns

- `Which of the following do [items] have in common?`
- `Which findings are associated with [condition]?`
- `Select the correct associations for [topic].`
- `Which statements are true regarding [topic]?`

### Guidance

- Use multi-select only when each option can be evaluated independently.
- Do not mix one high-confidence correct option with several vague options.
- Keep the correct set defensible from the same source.
- The rationale should organize the category, not merely list the right answers.

### Production Example

Note: source option wording is preserved below; do not copy spelling or grammar issues into new generated questions.

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `multiple_choice`, multi-select

Stem:

> Which of the following do visuoscopy, the Macular Integrity Tester, and the After-image Transfer all have in common?

Options:

- They are done binocularly
- They are done monocularly correct
- They test for eccentric fixation correct
- They test for anomalous correspondence
- They rely on foveal fixation phenomenon correct
- You must do all these test at near

Rationale:

> Visuoscopy, the Macular Integrity Tester, and After-image Transfer are diagnostic tools designed to identify and measure eccentric fixation using subjective or objective monocular fixation patterns. These tests rely on foveal markers, such as Haidinger's brushes or the foveal reflex, to determine if a non-foveal point is being used for steady monocular fixation.
