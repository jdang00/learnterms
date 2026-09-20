# Production Human Question Survey

Date: 2026-07-04

## Scope

Production Convex review of the latest 20,000 rows in the `question` table:

- Total rows sampled: 20,000.
- Human-authored rows: 2,258.
- AI-generated rows: 17,742.
- Human-authored discriminator: `aiGenerated === false`.
- Human rows with generation metadata: 0.
- Human rows with `createdBy`: 1,744.
- Human rows with `deletedAt`: 0.
- Sample date range: 2025-10-14 to 2026-06-30.
- Human-authored date range in sample: 2025-10-16 to 2026-05-05.

The human-authored rows are mostly published and include enough variety to define a reusable template taxonomy.

## Human Format Distribution

| Stored type | Count |
| --- | ---: |
| `multiple_choice` | 1,834 |
| `matching` | 159 |
| `true_false` | 134 |
| `fill_in_the_blank` | 131 |

## Human Status Distribution

| Status | Count |
| --- | ---: |
| `published` | 2,238 |
| `archived` | 18 |
| `draft` | 2 |

## Answer Shape

| Correct answer count | Rows |
| --- | ---: |
| 1 correct | 1,536 |
| 2 correct | 354 |
| 3 correct | 186 |
| 4 correct | 113 |
| 5+ correct | 69 |

The human bank uses single-best-answer questions most often, but multi-select is common enough to treat as a first-class template rather than a side effect.

## Heuristic Cognitive Pattern Counts

These counts are regex-assisted pattern counts over the 2,258 human-authored rows. Categories overlap because a question can be both clinical and quantitative, or both mechanism and multi-select.

| Pattern | Approx. rows |
| --- | ---: |
| Diagnostic interpretation / applied case | 726 |
| Quantitative threshold / value | 566 |
| Recognition / identification | 539 |
| Select-all / multi-answer | 505 |
| Recall / definition | 406 |
| Sequencing / process / timeline | 284 |
| Mechanism / pathophysiology / causal chain | 206 |
| Management / next step / treatment | 199 |
| Negative / exception / NOT | 130 |
| Risk / safety / contraindication | 85 |
| Discrimination / comparison | 8 by strict wording, more by manual review |
| True/false format | 134 |
| Fill-in-the-blank format | 131 |
| Matching format | 159 |

The strict discrimination count is artificially low because many comparison questions do not use words like "differentiate" or "versus." Manual review shows discrimination is present in matching, clinical diagnosis, and true/false questions where learners separate near-neighbor concepts.

## Top Human-Question Modules In Sample

| Count | Module | Class |
| ---: | --- | --- |
| 116 | The Extraocular Muscles | OPT5215 Vision Science III: Motility |
| 99 | Disorders of the Cornea | OPT5273 Ocular Disease I: Anterior Segment |
| 83 | History | Intro25 Intro to Optometry |
| 76 | Ocular Hypotensives | OPT5203 Ocular Pharmacology |
| 72 | Binocular Vision, Part 2 | OPT5215 Vision Science III: Motility |
| 70 | Vestibular Eye Movements | OPT5215 Vision Science III: Motility |
| 65 | Antibiotics | OPT5203 Ocular Pharmacology |
| 65 | Chapter 5-6 | OPT6023 Ocular Disease II: Glaucoma |
| 60 | GP Design and Fitting | OPT5153 Contact Lens I |
| 57 | Binocular Vision, Part 1 | OPT5215 Vision Science III: Motility |

## Recommended Template Taxonomy

Use the existing `reasoningOrder` as the stored coarse label, then use two optional planning labels while drafting and reviewing:

1. Cognitive template: what thinking task the learner must perform.
2. Format template: how the answer is captured in the app.

The cognitive and format labels are not current Convex schema fields. They are a writing aid under the live first/second/third-order system.

### Cognitive Templates

- `recall.definition`: retrieve a term, definition, named structure, abbreviation, or association.
- `recall.threshold`: retrieve a numeric threshold, range, dose, timeline, or clinical cutoff.
- `recognition.feature`: identify the correct feature, sign, finding, property, or association.
- `recognition.feature_set`: select multiple true features from a category.
- `discrimination.compare`: distinguish two similar entities, tests, findings, diseases, pathways, or treatments.
- `mechanism.causal`: explain why a fact is true through a causal or physiologic chain.
- `diagnosis.case`: infer the diagnosis from a compact case, image, visual field, lab value, or exam finding.
- `interpretation.test`: interpret a test output, field, image, graph, motility finding, or measurement.
- `management.next_step`: choose a treatment, adjustment, referral, follow-up, or counseling step.
- `safety.contraindication`: identify when to avoid an action or drug, or what complication/adverse effect matters.
- `sequence.timeline`: order stages, steps, developmental milestones, pathways, or workflow decisions.
- `negative.exception`: identify the NOT, EXCEPT, false, least likely, or contraindicated option.

### Format Templates

- `format.single_best`: one correct option.
- `format.select_all`: multiple correct options.
- `format.true_false`: binary claim evaluation with rationale.
- `format.matching`: map prompts to answers.
- `format.fill_blank`: exact or contains-style answer entry.
- `format.media_interpretation`: question depends on an image, field printout, graph, or diagram.

## Main Findings

The strongest human questions are not just polished. They are locally calibrated to the course, professor emphasis, exam style, and common student confusions. Agents should preserve those qualities rather than flattening every prompt into generic board-style prose.

Strong human examples repeatedly do these things:

- Ask for a decision, not just a fact.
- Use plausible near-miss distractors.
- Explain the mechanism behind the answer.
- Anchor numeric thresholds to a use case.
- Use media when the skill is visual.
- Preserve helpful local memory hooks when they do not create ambiguity.
- Use multi-select for category knowledge.
- Use matching for families of associations, not for unrelated trivia.
- Keep rationales teaching-oriented, not merely answer-confirming.
