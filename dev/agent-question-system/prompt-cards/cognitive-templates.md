# Cognitive Template Prompt Cards

These cards assume `format.single_best` unless the config explicitly enables multi-select.

## `recall.definition`

- Order fit: first.
- Use when the learner should retrieve a term, structure, abbreviation, or named concept.
- Stem: give a precise definition or description.
- Options: same vocabulary family; one exact term is best.
- Rationale: add the memory hook or boundary that makes the term useful.

## `recall.threshold`

- Order fit: first for direct numbers, second when applying the number.
- Use when the learner needs a cutoff, range, dose, timeline, formula, or criterion.
- Stem: name the measurement and include units.
- Options: nearby plausible values with consistent units.
- Rationale: explain what the threshold changes or how it is used.

## `recognition.feature`

- Order fit: first, or second when inferred from brief data.
- Use when one feature, sign, finding, or association identifies the concept.
- Stem: name the category being recognized.
- Options: adjacent-topic features, not random facts.
- Rationale: explain why the feature belongs.

## `recognition.feature_set`

- Order fit: usually second.
- Current live adaptation: convert to single-best unless multi-select is enabled.
- Use when category boundaries matter across several features.
- Single-best stem: ask for the best defining feature or best excluded feature.
- Multi-select stem: ask for all independently true features only when enabled.

## `discrimination.compare`

- Order fit: second, or third inside cases.
- Use when the learner must separate near-neighbor diseases, tests, treatments, pathways, or categories.
- Stem: name the comparison axis.
- Options: common confusions that share surface features.
- Rationale: draw the boundary explicitly.

## `mechanism.causal`

- Order fit: second.
- Use when the learner must know why a finding, effect, or outcome happens.
- Stem: ask why/how, not only what.
- Options: plausible but wrong causal stories.
- Rationale: trace cause -> intermediate -> outcome.

## `diagnosis.case`

- Order fit: third.
- Use when the learner must infer a diagnosis from a compact presentation.
- Stem: include signal clues and only relevant negatives.
- Options: common look-alikes.
- Rationale: map each decisive clue to the diagnosis.

## `interpretation.test`

- Order fit: second for one-step data interpretation, third when integrated with diagnosis or management.
- Use for text-described measurements, labs, fields, exam findings, or test results.
- Do not require hidden media or images.
- Options: plausible interpretations of the same data.
- Rationale: name the cue that supports the interpretation.

## `management.next_step`

- Order fit: third.
- Use when the learner must choose treatment, referral, monitoring, counseling, or follow-up.
- Stem: include the constraints that change the action.
- Options: actions that would be reasonable if a key detail changed.
- Rationale: explain why the chosen action fits the constraints.

## `safety.contraindication`

- Order fit: first for named contraindications, second for harm mechanism, third when safety changes management.
- Use when the learner must identify what to avoid or what risk matters most.
- Stem: make the safety frame explicit.
- Options: less urgent or wrong-context risks.
- Rationale: explain the harm being avoided without overstating risk.

## `sequence.timeline`

- Order fit: second.
- Use for one-step order, next-step, first-event, or stage-timing decisions.
- Do not use matching until matching is supported.
- Options: plausible adjacent stages or steps.
- Rationale: explain why the order matters.

## `negative.exception`

- Disabled by default.
- Use only when identifying the exception is itself the learning objective.
- Avoid double negatives.
- If used, make `NOT` or `EXCEPT` visually clear and review for ambiguity.
