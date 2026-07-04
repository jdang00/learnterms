# Stem Patterns

These are live-agent stem patterns. They assume `multiple_choice` output and default to single-best answer unless multi-select is explicitly enabled.

Use them as patterns, not rigid wording. Replace bracketed placeholders with source-supported details.

## First-Order Stems

### `recall.definition`

- Which term refers to [definition]?
- [Description] is best described by which term?
- What is the name for [structure/finding/process]?
- Which option correctly defines [term]?
- Which term best matches [brief definition]?
- [Abbreviation] stands for which phrase?

### `recall.threshold`

- Which value is the usual cutoff for [criterion]?
- Which range is expected for [measurement] in [context]?
- At what [value/time] should [interpretation/action] occur?
- Which option best represents the threshold for [condition or decision]?
- Which value would be considered abnormal for [measurement]?
- Which timing is expected for [event/process]?

### `recognition.feature`

- Which finding is most associated with [condition]?
- Which feature best identifies [entity]?
- Which statement correctly describes [topic]?
- Which sign would most support [concept]?
- Which option is a characteristic feature of [condition/process]?
- Which finding would you expect with [condition]?

## Second-Order Stems

### `mechanism.causal`

- Which mechanism explains [phenomenon]?
- Why does [cause] lead to [outcome]?
- Which pathway is responsible for [effect]?
- Which change best accounts for [observed result]?
- Which explanation best connects [finding] to [underlying process]?
- Which mechanism makes [treatment/finding] effective?

### `interpretation.test`

- Which interpretation is most consistent with [measurement/result]?
- What does [test result] most strongly suggest?
- Given [data], which conclusion is best supported?
- Which option best explains the pattern in [described finding]?
- Which diagnosis or process is most consistent with [test pattern]?
- Which result would best support [interpretation]?

### `discrimination.compare`

- Which finding best differentiates [A] from [B]?
- Which feature makes [A] more likely than [B]?
- Which test result would best distinguish [A] from [B]?
- Which option correctly separates [near-neighbor concepts]?
- Compared with [A], [B] is more likely to show which finding?
- Which statement best explains the difference between [A] and [B]?

### `recognition.feature_set`

Current live adaptation: use these as single-best stems unless multi-select is enabled.

- Which option is the best defining feature of [category]?
- Which statement best captures what [items] have in common?
- Which feature most strongly belongs to [category]?
- Which option is the strongest example of [category]?
- Which option best represents the shared property of [items]?
- When multi-select is enabled: Which of the following are associated with [topic]?

### `sequence.timeline`

- Which step should occur first in [process]?
- Which event occurs next after [stage]?
- Which stage is most consistent with [timing/finding]?
- Which option correctly places [event] in the sequence?
- During which stage would [finding/event] be expected?
- Which step must happen before [later event]?

## Third-Order Stems

### `diagnosis.case`

- A patient has [signal findings]. Which diagnosis is most likely?
- Given [history/exam/test result], which condition best explains the presentation?
- Which diagnosis best fits [key clue set]?
- Which option is most consistent with [timeline plus decisive finding]?
- A patient presents with [symptom], [exam clue], and [test clue]. What is the most likely diagnosis?
- Which diagnosis should be suspected when [finding A] occurs with [finding B]?

### `management.next_step`

- What is the most appropriate next step?
- Which treatment is most appropriate given [constraint]?
- Which management choice best fits [diagnosis/severity/risk factor]?
- What should be done next after [finding/result]?
- Which follow-up plan is most appropriate for [scenario]?
- Which recommendation best addresses [patient constraint or risk]?

### `safety.contraindication`

- Which factor is a contraindication to [action]?
- Which risk matters most before [treatment/action]?
- Which adverse effect should be monitored with [medication/intervention]?
- Which option identifies the main harm to avoid in [scenario]?
- Which patient factor would make [treatment] inappropriate?
- Which finding should prompt caution before [action]?

## Disabled By Default

### `negative.exception`

Use only when the exception boundary is the learning objective.

- Which option is NOT expected in [condition]?
- Which statement is the exception for [category]?
- Which option is least consistent with [diagnosis/process]?
- Which action would NOT be appropriate in [scenario]?

Review these carefully for double negatives and ambiguous answer boundaries.

## Unsupported Format Rewrites

- Fill-in-the-blank: rewrite as `recall.definition` or `recall.threshold`.
- Matching: rewrite as `discrimination.compare` or `sequence.timeline`.
- Media interpretation: rewrite as `interpretation.test` only when the cue is present in text.
- True/false: rewrite as `recognition.feature`, `discrimination.compare`, or `mechanism.causal` with 3-5 options.
