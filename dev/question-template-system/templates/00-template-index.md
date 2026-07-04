# Template Index

Use `reasoningOrder` as the coarse dial the live pipeline already understands, then choose a cognitive template and format template as finer authoring labels underneath it.

For detailed instructions and compact production examples, use the per-template anatomy folders in `../template-anatomies/`.

## Reasoning Order Mapping

| Pipeline order | Natural cognitive templates |
| --- | --- |
| `first` | `recall.definition`, simple `recall.threshold`, `recognition.feature` |
| `second` | `mechanism.causal`, `interpretation.test`, applied `recall.threshold`, `discrimination.compare`, `recognition.feature_set`, `sequence.timeline` |
| `third` | `diagnosis.case`, `management.next_step`, complex `safety.contraindication`, complex `discrimination.compare`, multi-step `interpretation.test` |

`cognitiveTemplate`, `formatTemplate`, and `distractorStrategy` are planning labels only. They are not current Convex schema or generation-output fields.

## Cognitive Templates

| Template | Use when | Typical format |
| --- | --- | --- |
| `recall.definition` | Learner must retrieve a term, definition, named structure, abbreviation, or association. | Single best, fill blank |
| `recall.threshold` | Learner must retrieve a number, cutoff, range, timeline, dose, or formula. | Single best, fill blank |
| `recognition.feature` | Learner must recognize a correct sign, symptom, property, test feature, or association. | Single best |
| `recognition.feature_set` | Learner must identify all true features in a family. | Select all |
| `discrimination.compare` | Learner must separate similar concepts or choose the differentiating feature. | Single best, true/false, matching |
| `mechanism.causal` | Learner must understand why something happens. | Single best, select all |
| `diagnosis.case` | Learner must infer a diagnosis from clinical details. | Single best, select all |
| `interpretation.test` | Learner must interpret field, graph, image, lab, measurement, or exam result. | Single best, media |
| `management.next_step` | Learner must choose treatment, adjustment, follow-up, referral, or counseling. | Single best, select all |
| `safety.contraindication` | Learner must identify risks, adverse effects, contraindications, or complications. | Single best, fill blank |
| `sequence.timeline` | Learner must order steps, stages, pathways, or development. | Matching, single best |
| `negative.exception` | Learner must identify false, NOT, EXCEPT, least likely, or avoid. | Single best, true/false |

## Format Templates

| Template | Use when | Stored `type` |
| --- | --- | --- |
| `format.single_best` | One best answer; distractors are mutually exclusive. | `multiple_choice` |
| `format.select_all` | Multiple independent correct answers are expected. | `multiple_choice` |
| `format.true_false` | One claim is worth evaluating directly. | `true_false` |
| `format.matching` | A set of prompts maps cleanly to a set of answers. | `matching` |
| `format.fill_blank` | Exact phrase, synonym set, abbreviation, number, or named entity matters. | `fill_in_the_blank` |
| `format.media_interpretation` | Image, field, graph, or figure is required to assess the skill. | Any |

## Selection Rule

Prefer the most specific template that matches the learning goal:

- If the goal is "know the number," use `recall.threshold`.
- If the goal is "use the number," use `interpretation.test`, `management.next_step`, or `diagnosis.case`.
- If the goal is "know features," use `recognition.feature_set`.
- If the goal is "not confuse two similar things," use `discrimination.compare`.
- If the goal is "know why," use `mechanism.causal`.
- If the goal is "what should be done," use `management.next_step`.
