# Template Prompt Cards

Historical reference: the structured taxonomy was retired. These examples are retained as research material, not live generation instructions.

## recall.definition

```text
Template: recall.definition (Recall Definition)
Kind: cognitive
Reasoning-order fit: Usually `first` order. Use `second` only when the learner must apply the definition to a brief consequence or test result.
Use when: The learner needs to retrieve a named concept, definition, structure, abbreviation, or high-yield association.
Avoid when: The source supports a richer decision, comparison, or management task.
Stem patterns: What is the name of [definition]? | [Description] is known as which term? | Which term refers to [definition]?
Stem/anatomy: Stem gives a precise definition or description.
Answer contract: Correct answer is the exact term or accepted synonym.
Distractors/options: Distractors belong to the same vocabulary family.
Rationale: Rationale adds a memory hook or explains the boundary.
Watch for: Do not overload the stem with case details. | Use fill-in-the-blank when exact spelling, abbreviation, or synonym recognition matters. | Use multiple choice when near-neighbor terms need to be contrasted.
```

## recall.threshold

```text
Template: recall.threshold (Recall Threshold)
Kind: cognitive
Reasoning-order fit: Usually `first` order when asking directly for a number, range, dose, or cutoff. Use `second` when the learner must apply the threshold to decide whether a result is abnormal or meaningful.
Use when: The learner needs a number, cutoff, range, timeline, dose, formula, or clinical threshold.
Avoid when: The real skill is deciding what to do with the number.
Stem patterns: What is the threshold for [criterion]? | What range is expected for [measurement]? | Which value best represents [cutoff]?
Stem/anatomy: Stem names the measurement and clinical context.
Answer contract: Correct answer is exact enough for grading.
Distractors/options: Options include units and plausible nearby values.
Rationale: Rationale ties the number to interpretation or use.
Watch for: Always include units. | Do not mix percentages, ratios, and raw values unless the source does. | Prefer fill-in-the-blank only when accepted variants are enumerable.
```

## recognition.feature

```text
Template: recognition.feature (Recognition Feature)
Kind: cognitive
Reasoning-order fit: Usually `first` order when the learner recognizes one directly supported feature. Use `second` if the feature must be inferred from brief data rather than named directly.
Use when: The learner needs to identify one correct sign, feature, finding, property, or association.
Avoid when: Several features are correct or the target is a management decision.
Stem patterns: Which finding is associated with [condition]? | Which statement correctly describes [topic]? | Which feature best identifies [entity]?
Stem/anatomy: Stem names the category or entity.
Answer contract: Correct option is a defining feature.
Distractors/options: Distractors are plausible features of adjacent topics.
Rationale: Rationale explains why the feature belongs.
Watch for: Keep options parallel. | Avoid vague "which is true" stems when a more specific feature can be named. | Use one best answer unless the stem explicitly asks for all true statements.
```

## recognition.feature_set

```text
Template: recognition.feature_set (Recognition Feature Set)
Kind: cognitive
Reasoning-order fit: Usually `second` order because the learner evaluates several independent claims. Can be `first` if the set is direct recall of a short list.
Use when: The learner should identify all true features in a category or shared property set.
Avoid when: The options are not independently judgeable.
Stem patterns: Which of the following are associated with [topic]? | Which statements are true regarding [topic]? | Which of these do [items] have in common?
Stem/anatomy: Stem signals that multiple answers may be correct.
Answer contract: Correct answers define the category boundary.
Distractors/options: Every option can be judged independently.
Rationale: Rationale groups the true features by principle.
Watch for: Do not hide multi-select behavior. | Do not include partially true options unless the course expects nuance and the rationale handles it. | Use this for category mastery, not random fact bundling.
```

## discrimination.compare

```text
Template: discrimination.compare (Discrimination Compare)
Kind: cognitive
Reasoning-order fit: Usually `second` order when separating near-neighbor concepts. Can be `third` when the comparison is embedded in diagnosis or management.
Use when: The learner must separate similar concepts, tests, diseases, pathways, treatments, or categories.
Avoid when: The question only asks for a standalone feature with no meaningful near-neighbor.
Stem patterns: Which finding best differentiates [A] from [B]? | Which test distinguishes [A] from [B]? | Classify each item as [A] or [B].
Stem/anatomy: Stem names the comparison or classification axis.
Answer contract: Correct answer marks the distinguishing feature.
Distractors/options: Options represent near-neighbor confusions.
Rationale: Rationale draws the boundary explicitly.
Watch for: Near-miss distractors are the point. | Do not ask for "the difference" without saying what kind of difference matters. | Matching works well for repeated classification boundaries.
```

## mechanism.causal

```text
Template: mechanism.causal (Mechanism Causal)
Kind: cognitive
Reasoning-order fit: Usually `second` order. Use `third` only when the mechanism must be integrated with diagnosis or management in a case.
Use when: The learner must know why a finding, drug effect, experiment, or clinical outcome happens.
Avoid when: The source only supports a surface association.
Stem patterns: Which mechanism explains [phenomenon]? | Why does [cause] lead to [outcome]? | Which pathway is responsible for [effect]?
Stem/anatomy: Stem asks for why or how, not just what.
Answer contract: Correct answer contains a causal link.
Distractors/options: Distractors are wrong causal stories.
Rationale: Rationale traces cause -> intermediate -> outcome.
Watch for: Mechanism rationales should be longer than recall rationales. | Make the intermediate step explicit. | Do not invent causal detail beyond the source.
```

## diagnosis.case

```text
Template: diagnosis.case (Diagnosis Case)
Kind: cognitive
Reasoning-order fit: Usually `third` order. Use `second` only for very brief test interpretation without a full patient-case frame.
Use when: The learner must infer a diagnosis from a compact clinical presentation.
Avoid when: The item is only asking for a memorized diagnostic feature.
Stem patterns: A patient presents with [findings]. What is the most likely diagnosis? | Given this history and exam, which condition best explains the presentation?
Stem/anatomy: Stem includes signal findings and relevant negatives.
Answer contract: Correct answer is the best diagnosis.
Distractors/options: Distractors are common look-alikes.
Rationale: Rationale maps clues to diagnosis.
Watch for: Every case detail should earn its place. | Use age, timeline, symptoms, and exam data only when they change the diagnosis. | If management is included, make sure the diagnosis is still clear.
```

## interpretation.test

```text
Template: interpretation.test (Interpretation Test)
Kind: cognitive
Reasoning-order fit: Usually `second` order for one-step interpretation of a test, image, graph, or measurement. Use `third` when interpretation must be integrated with diagnosis or management.
Use when: The learner must interpret an image, field, graph, lab, measurement, printout, appearance, or exam result.
Avoid when: No data or visual cue is present to interpret.
Stem patterns: What does this result suggest? | Analyze the following [test]. What do you suspect? | Which interpretation is most consistent with the data?
Stem/anatomy: Stem points to the data source.
Answer contract: Correct answer is the interpretation, not a raw observation.
Distractors/options: Distractors are plausible alternative interpretations.
Rationale: Rationale names the cue that supports the answer.
Watch for: Use media when the skill is visual. | Do not replace visual recognition with generic prose. | If media is absent, include enough measured data in the stem.
```

## management.next_step

```text
Template: management.next_step (Management Next Step)
Kind: cognitive
Reasoning-order fit: Usually `third` order. Use `second` only for a direct one-step action after a simple finding.
Use when: The learner must choose treatment, adjustment, referral, monitoring, counseling, or follow-up.
Avoid when: The item only asks for a diagnosis or isolated fact.
Stem patterns: What is the most appropriate next step? | Which treatment would be most effective? | What adjustment should be made?
Stem/anatomy: Stem includes the decision context.
Answer contract: Correct answer is actionable.
Distractors/options: Distractors are actions that would be reasonable if a detail changed.
Rationale: Rationale explains why the action fits the constraints.
Watch for: Include allergies, severity, age, pregnancy, stage, or prior treatment when relevant. | Do not ask unsafe management without source support. | Use multi-select when diagnosis and treatment are both expected.
```

## safety.contraindication

```text
Template: safety.contraindication (Safety Contraindication)
Kind: cognitive
Reasoning-order fit: Can be `first` when asking for a named contraindication. Use `second` for mechanism of harm and `third` when safety changes case management.
Use when: The learner must identify what to avoid, a contraindication, adverse effect, risk, or major complication.
Avoid when: The risk detail is not source-supported or clinically meaningful.
Stem patterns: Which condition is a contraindication to [action]? | What is the main concern with [presentation]? | Which adverse effect matters most?
Stem/anatomy: Stem makes the safety frame clear.
Answer contract: Correct answer identifies the risk or avoid condition.
Distractors/options: Distractors are less urgent or wrong-context risks.
Rationale: Rationale explains the harm being avoided.
Watch for: Be precise with contraindication versus caution. | Do not overstate risk. | Use accepted synonyms for fill-in safety answers.
```

## sequence.timeline

```text
Template: sequence.timeline (Sequence Timeline)
Kind: cognitive
Reasoning-order fit: Usually `second` order when the learner must place stages, steps, or development in order. Can be `first` when asking for one memorized stage or age.
Use when: The learner must order stages, development, workflow steps, pathways, or timelines.
Avoid when: Order does not affect meaning.
Stem patterns: Match each stage with its timing. | Which event occurs first? | What is the correct sequence for [process]?
Stem/anatomy: Stem names the process or timeline.
Answer contract: Correct answer preserves order or pairing.
Distractors/options: Options are stages, times, or ordered events.
Rationale: Rationale explains why the order matters.
Watch for: Matching is strong when several stages map to times. | Single-best is strong when one step is a decision point. | Do not make arbitrary chronology questions.
```

## negative.exception

```text
Template: negative.exception (Negative Exception)
Kind: cognitive
Reasoning-order fit: Order depends on the underlying cognitive task. Use `first` for simple false/NOT recall, `second` for concept boundaries, and `third` for case-based exceptions.
Use when: The learner must identify a false, NOT, EXCEPT, least likely, or not indicated option.
Avoid when: A positive framing would test the same skill more cleanly.
Stem patterns: Which is NOT [true/indicated]? | All are true EXCEPT... | Which is least likely?
Stem/anatomy: Stem highlights the negative task.
Answer contract: Correct answer is the exception.
Distractors/options: Distractors are true members of the category.
Rationale: Rationale states the positive rule and why the exception is outside it.
Watch for: Avoid double negatives. | Use negative questions only when the boundary is educationally meaningful. | Capitalize NOT or EXCEPT in final generated stems.
```

## format.single_best

```text
Template: format.single_best (Format Single Best)
Kind: format
Reasoning-order fit: Format does not determine order. Use the cognitive task to choose `first`, `second`, or `third`.
Use when: One answer is best and the options are mutually exclusive enough for fair grading.
Avoid when: Several options are independently true.
Stem patterns: Which option is best? | What is the most likely [answer]? | Which value is correct?
Stem/anatomy: Stem asks for one best answer.
Answer contract: Correct answer is the best-supported option.
Distractors/options: Rationale explains why the distractors lose.
Rationale: Rationale explains why the distractors lose.
Watch for: Single-best does not mean all other options are impossible. | Use "most likely" or "best" when distractors could be conditionally true. | Do not use for feature sets.
```

## format.select_all

```text
Template: format.select_all (Format Select All)
Kind: format
Reasoning-order fit: Format does not determine order. Often `second` because multiple claims are evaluated, but can be `first` for direct list recall or `third` for management bundles.
Use when: The learner should identify multiple true options from an independently judgeable set.
Avoid when: The question has only one supported answer.
Stem patterns: Which of the following are true? | Select all that apply. | Which options are recommended?
Stem/anatomy: Stem makes multiple correct answers expected.
Answer contract: Stem makes multiple correct answers expected.
Distractors/options: Options are independently true or false.
Rationale: Rationale groups why each correct answer belongs.
Watch for: Avoid hidden multi-select. | Do not make one option a prerequisite for another unless the UI supports it. | Use for category boundaries and management bundles.
```

## format.true_false

```text
Template: format.true_false (Format True False)
Kind: format
Reasoning-order fit: Format does not determine order. Use `first` for a direct fact claim and `second` for a mechanism or distinction claim.
Use when: One claim is worth evaluating directly.
Avoid when: The claim is trivial or has unhandled exceptions.
Stem patterns: [Concept boundary claim]. | [Mechanism claim]. | [Comparison claim].
Stem/anatomy: Stem is a single clear claim.
Answer contract: Answer is true or false.
Distractors/options: No hidden qualifiers are required.
Rationale: Rationale explains the boundary.
Watch for: Avoid absolutes unless they are true. | True/false is strong for misconception correction. | The rationale carries most of the teaching value.
```

## format.matching

```text
Template: format.matching (Format Matching)
Kind: format
Reasoning-order fit: Format does not determine order. Use `first` for direct associations, `second` for classification or sequencing, and `third` only if the matching depends on case integration.
Use when: Several prompts map cleanly to answers in the same family.
Avoid when: The pairings are unrelated trivia.
Stem patterns: Match each [prompt family] with its [answer family]. | Classify each prompt as [category A] or [category B].
Stem/anatomy: Stem defines the mapping task.
Answer contract: Prompts are homogeneous.
Distractors/options: Answers are homogeneous.
Rationale: Rationale explains the organizing principle.
Watch for: Use 3-7 prompts for most generated questions. | Reused answers are fine if classification is the goal. | Keep prompt and answer labels clean.
```

## format.fill_blank

```text
Template: format.fill_blank (Format Fill Blank)
Kind: format
Reasoning-order fit: Format does not determine order. Usually `first` for exact term or number recall; can be `second` for applied threshold entry.
Use when: Exact text, accepted synonyms, abbreviation variants, or numeric entry matters.
Avoid when: The correct answer has too many valid phrasings to enumerate.
Stem patterns: What is the name of [concept]? | What value/range is expected? | You should avoid [action] when the patient has _____.
Stem/anatomy: Stem asks for an exact response.
Answer contract: Accepted answers include spelling, abbreviation, unit, and synonym variants.
Distractors/options: Accepted answers include spelling, abbreviation, unit, and synonym variants.
Rationale: Rationale explains why the answer matters.
Watch for: Use exact when precision matters. | Use contains when the expected answer may appear inside a longer phrase. | Add unit variants for numeric answers.
```

## format.media_interpretation

```text
Template: format.media_interpretation (Format Media Interpretation)
Kind: format
Reasoning-order fit: Format does not determine order by itself. Usually `second` for image/test interpretation and `third` when the media drives diagnosis or management.
Use when: The skill depends on an image, field, graph, appearance, or diagram.
Avoid when: The media is decorative or unnecessary.
Stem patterns: Analyze the following image. | What does this appearance suggest? | Which diagnosis matches this field/graph?
Stem/anatomy: Stem directs attention to the media.
Answer contract: Correct answer interprets the media.
Distractors/options: Correct answer interprets the media.
Rationale: Rationale names the visible cue.
Watch for: Do not convert visual skills into generic prose. | Generated media questions should require the media to answer. | Use solution-only media intentionally, not by accident.
```
