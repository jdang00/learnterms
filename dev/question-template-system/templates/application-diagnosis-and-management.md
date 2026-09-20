# Application, Diagnosis, And Management Templates

## `diagnosis.case`

Use when the learner must infer a diagnosis from a compact clinical presentation.

### Stem Patterns

- `A patient presents with [key findings]. What is the most likely diagnosis?`
- `Given this history and exam, which diagnosis is most likely?`
- `Which condition best explains this presentation?`
- `What diagnosis and treatment are most appropriate?`

### Guidance

- Include only details that affect the diagnosis or exclude near-misses.
- Add one or two red-flag negatives when they matter.
- Distractors should be common look-alikes.
- If treatment is also asked, make the diagnosis and management answer choices separable or clearly paired.

## `interpretation.test`

Use when the learner must interpret a test result, image, visual field, graph, motility pattern, or measurement.

### Stem Patterns

- `Analyze the following [test/media]. What do you suspect?`
- `Which finding is shown by this [image/field/graph]?`
- `What does this result suggest?`
- `Which interpretation is most consistent with the data?`

### Guidance

- Use media when the original learning goal is visual.
- Do not convert image-dependent skills into generic text unless no media exists.
- The rationale should state the visible or measured cue that supports the answer.

## `management.next_step`

Use when the learner must choose treatment, adjustment, referral, monitoring, counseling, or follow-up.

### Stem Patterns

- `What is the most appropriate next step?`
- `Which treatment would be most effective?`
- `What adjustment should be made?`
- `How should this patient be managed?`

### Guidance

- Management questions should include constraints: severity, contraindications, allergies, failure of prior therapy, age, pregnancy, disease stage, or risk.
- Distractors should be reasonable actions that are wrong because of a specific detail.
- The rationale should explain why the action fits the case, not only that it is indicated.

### Production Example

Note: source option wording is preserved below; do not copy spelling or grammar issues into new generated questions.

Context: OPT5273 Ocular Disease I: Anterior Segment / Trauma to the Anterior Segment

Type: `multiple_choice`, multi-select

Stem:

> Your 34 YOM patient recently took a football to the side of the dome, near the left temple area. He notes some moderate to severe pain behind the eye. You notice limited EOM motility in the left eye with FROM in the right eye. His pressures were OD: 17 mmHg OS 32 mmHg. You conduct the red cap test to check for any gross optic nerve issues. He states the redness is a 35% decrease in the left eye vs the right eye. You also notice a mild afferent pupillary defect in the left eye. You send him for a CT scan and get the following results. What is your diagnosis and treatment?

Options:

- Orbital Blow-Out Fracture
- Orbial Inflammatory Pseudotumor
- Traumatic Retrobulbar Hemorrhage correct
- Thyroid Eye Disease
- Orbital Cellulitis
- Artificial Tears PRN
- Keflex 500 mg P.O. correct
- Bandage Contact Lens
- Lateral Canthotomy correct
- Timolol QID correct

Rationale:

> This presentation aligns with traumatic retrobulbar hemorrhage. Treatments include lateral canthotomy to release pressure from blood buildup within the orbit and oral antibiotics for orbital cellulitis coverage. The IOP spike should also be addressed with IOP control medication such as timolol or acetazolamide.

## `safety.contraindication`

Use when the learner must avoid an action, drug, procedure, or diagnosis because of risk.

### Stem Patterns

- `Which condition is a contraindication to [action]?`
- `Which adverse effect is the main concern with [drug/condition]?`
- `Which patient should avoid [intervention]?`
- `What is your main concern with [presentation]?`

### Guidance

- Put the safety-relevant constraint in the stem.
- Make wrong options tempting but less urgent or less specific.
- When multiple accepted answers exist, use fill-in-the-blank only if exact recall is the desired skill.

### Production Example

Context: OPT5233 Pediatrics / Cycloplegic Exams

Type: `fill_in_the_blank`

Stem:

> You should avoid cycloplegia when your patient has this condition:

Accepted answers:

- `exact:Necrotizing Enterocolitis`
- `exact:NEC`
- `exact:Down Syndrome`
- `exact:Narrow angles`
- `exact:Nonfebrile seizure`

Rationale:

> The biggest contraindications for avoiding cycloplegia are premature infants with necrotizing enterocolitis, children with Down syndrome, or children taking anti-seizure medications.

## `negative.exception`

Use when the learning goal is a boundary: false, not indicated, least likely, exception, or avoid.

### Guidance

- Capitalize NOT or EXCEPT in the stem.
- Avoid double negatives.
- Use only when the exception is educationally meaningful, not as a trick.
- In the rationale, state the positive rule and why the exception falls outside it.
