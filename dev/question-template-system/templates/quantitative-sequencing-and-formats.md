# Quantitative, Sequencing, And Format Templates

## `sequence.timeline`

Use when the learner must order development, procedure steps, disease stages, neural pathways, or clinical workflow.

### Stem Patterns

- `Match each stage with its timing.`
- `Which event occurs first?`
- `What is the correct sequence for [process]?`
- `At which stage does [finding] appear?`

### Guidance

- Use matching when multiple stages map to multiple times or functions.
- Use single-best-answer when one step is the decision point.
- Rationales should explain the order, not simply restate it.

### Production Example

Note: source prompt wording is preserved below; do not copy spelling or grammar issues into new generated questions.

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `matching`

Stem:

> Match the timeline in which the development of stereo perception in an infant might happen.

Prompts and answers:

- `Simultanous preception` -> `1-3 months`
- `Aversion to rivalry` -> `3 months`
- `Stereopsis develops suddenly` -> `3-5 months`

Rationale:

> Development of binocular vision and stereo perception in infants proceeds from early simultaneous perception, to aversion to rivalry, to rapid stereopsis development around 3-5 months. Before this, alignment is often unstable; around 3-5 months pursuits equalize and stereopsis develops quickly.

## `format.true_false`

Use when a single claim is worth evaluating directly.

### Guidance

- Use true/false for concept boundaries, not easy trivia.
- Avoid absolutes unless the source supports the absolute.
- The rationale must explain why the claim is true or false.

### Production Example

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `true_false`

Stem:

> A person with eccentric fixation does not necessarily have anomalous correspondence, but a person with anomalous correspondence has eccentric fixation.

Options:

- True correct
- False

Rationale:

> Eccentric fixation is a monocular condition where the deviated eye uses a non-foveal point for fixation. Anomalous correspondence is a binocular sensory adaptation where the brain remaps retinotopic connections to pair the fixing eye's fovea with a non-foveal point in the deviating eye. AC creates a pseudo-fovea that will also be used under monocular conditions, so AC implies EF, but EF can occur without AC.

## `format.matching`

Use when a small family of prompts maps cleanly to a small family of answers.

### Guidance

- Use 3-7 prompts unless the source explicitly requires a larger set.
- Keep prompt and answer types homogeneous.
- Avoid one-off trivia mixed into a matching set.
- If answers repeat, make that intentional and clear.

### Production Example

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `matching`

Stem:

> Classify each prompt with whether or not it is characteristic of harmonious or unharmonious correspondence.

Prompts and answers:

- `Angle S is 0` -> `Harmonious`
- `Angle S is smaller than Angle H` -> `Unharmonious`
- `Angle H does not equal Angle A` -> `Unharmonious`
- `Angle A - Angle H = 0` -> `Harmonious`

Rationale:

> In harmonious anomalous correspondence, the angle of anomaly equals the objective angle of strabismus, so the subjective angle is 0. In unharmonious anomalous correspondence, the subjective angle is smaller than the objective angle, meaning angle A and angle H do not agree.

## `format.fill_blank`

Use when exact recall, accepted synonyms, abbreviation variants, or numeric text entry is the target.

### Guidance

- Include accepted spelling, abbreviation, unit, and punctuation variants.
- Prefer `contains:` when the answer is part of a longer phrase.
- Prefer `exact:` when precision matters.
- Avoid fill-in-the-blank when there are many equally valid free-text phrasings.

### Production Example

Context: OPT5203 Ocular Pharmacology / Medical Management of Refractive Error

Type: `fill_in_the_blank`

Stem:

> What is the range of optimal pupil size that you would expect from any one of these drops?

Accepted answers:

- `exact:2-2.5 mm`
- `exact:2.0-2.5 mm`
- `exact:2-2.5`
- `exact:2.0-2.5`

Rationale:

> 2.0-2.5 mm pupils give the ideal pinhole effect: not so large that peripheral aberrations degrade image quality, and not so small that diffraction degrades contrast.

## `format.select_all`

Use when the learner must identify a set of true statements or actions.

### Guidance

- Make every option independently judgeable.
- Avoid "which are correct" when the source only supports one answer.
- The rationale should group the correct answers by principle.
- A generated question should make it clear in the UI/stem when multiple answers may be correct.
