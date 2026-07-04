# Agent Generation Playbook

## Step 1: Identify The Learning Task

Before writing a question, decide what the learner should do:

- Remember a fact: `recall.definition` or `recall.threshold`.
- Recognize a feature: `recognition.feature`.
- Recognize a category: `recognition.feature_set`.
- Separate near-neighbors: `discrimination.compare`.
- Explain a causal chain: `mechanism.causal`.
- Interpret a case, image, test, or measurement: `diagnosis.case` or `interpretation.test`.
- Choose an action: `management.next_step`.
- Avoid harm: `safety.contraindication`.
- Order events: `sequence.timeline`.

Do not choose the format first. Choose the thinking task first.

For any selected template, read its page in `template-anatomies/` before generating. Those pages show the anatomy, compact production examples, and part-by-part quality notes.

Template definitions live in `src/convex/questionStudio/templateTaxonomy.ts`. Treat the markdown pages as generated reading material; update the structured taxonomy first when changing template purpose, anatomy, considerations, or reasoning-order fit.

## Step 2: Map To Reasoning Order

The live Question Studio pipeline already understands `reasoningOrder` through `reasoningOrderPrompt()` and `questionWritingSkillPrompt()` in `src/convex/questionStudio/helpers.ts`. Treat `reasoningOrder` as the coarse generation dial and cognitive templates as planning labels underneath it.

Do not add `cognitiveTemplate`, `formatTemplate`, or `distractorStrategy` to generated output unless the Convex schema and candidate validators are explicitly extended later. Today, these are authoring notes for agents, not stored fields.

| Pipeline order | Coarse intent | Natural cognitive templates |
| --- | --- | --- |
| `first` | Direct recall or recognition of one source-supported fact, term, association, threshold, or definition. | `recall.definition`, simple `recall.threshold`, `recognition.feature`, simple `format.fill_blank`, simple `format.true_false` |
| `second` | One-step application, mechanism, interpretation, calculation, consequence, or applied threshold use. | `mechanism.causal`, `interpretation.test`, applied `recall.threshold`, `discrimination.compare`, `recognition.feature_set`, `sequence.timeline` |
| `third` | Multi-step integration, comparison, diagnosis, management, or case/data reasoning requiring at least two source-supported facts. | `diagnosis.case`, `management.next_step`, complex `safety.contraindication`, complex `discrimination.compare`, multi-step `interpretation.test` |

Use the requested order first. Then choose the finest cognitive template that fits inside that order.

### Boundary Rules

- `recall.threshold` is first-order when it asks only for a number or range.
- `recall.threshold` becomes second-order when the learner must use the number to interpret abnormality, calculate a result, or choose a consequence.
- `recognition.feature` is usually first-order when it asks for one directly supported feature.
- `recognition.feature_set` is usually second-order because the learner must evaluate several independent claims.
- `diagnosis.case` and `management.next_step` are usually third-order because they require integrating clues and deciding what they imply.
- `safety.contraindication` can be first-order if it asks for a named contraindication, second-order if it asks why something is unsafe, and third-order if safety changes management in a case.
- Format templates do not determine order by themselves. A true/false item can be first-order or second-order; a matching item can be recall, classification, or sequencing depending on the cognitive task.

## Step 3: Pick The Format

Use this mapping:

- One correct concept -> `format.single_best`.
- Several independent true concepts -> `format.select_all`.
- One high-yield claim boundary -> `format.true_false`.
- Many paired associations -> `format.matching`.
- Exact term or numeric entry -> `format.fill_blank`.
- Visual interpretation -> `format.media_interpretation`.

## Step 4: Build The Stem

A good stem should include the minimum context needed for the task:

- Recall stems should be short.
- Recognition stems should specify the category being recognized.
- Discrimination stems should name the comparison axis.
- Mechanism stems should ask why or how.
- Case stems should include signal details and key negatives.
- Management stems should include constraints that change the decision.

Apply the live order rules:

- First-order: concise non-vignette stem; do not introduce a patient case.
- Second-order: brief context, test data, mechanism, calculation, or consequence is fine; avoid full patient-case framing.
- Third-order: compact case/data scenario is appropriate when it requires at least two source-supported facts.

## Step 5: Build Distractors

Use distractors that represent plausible errors:

- A neighbor diagnosis.
- A correct fact from the wrong condition.
- A treatment that would work if one constraint were absent.
- A threshold that is close but not correct.
- A mechanism that sounds reasonable but reverses the causal chain.
- A test that detects the general category but not the requested subtype.

Avoid random wrong answers. Random distractors make weak questions and train shallow recognition.

## Step 6: Write The Rationale

The rationale should teach the transfer rule:

- For recall: give the memory hook or context.
- For recognition: explain the defining feature.
- For discrimination: draw the boundary between near-neighbors.
- For mechanism: trace cause -> intermediate -> outcome.
- For diagnosis: map case clues to the diagnosis.
- For management: explain why constraints make the selected action best.
- For safety: name the harm being avoided.
- For sequence: explain why the order matters.

## Step 7: Apply Local Voice Carefully

The human bank often uses local voice, humor, or memory hooks. Agents should preserve useful voice when it improves memory, but should remove or revise wording that is:

- Ambiguous.
- Needlessly long.
- Offensive or personally identifying.
- Inaccurate.
- Dependent on a private joke with no learning value.

## Step 8: Planning Labels, Not Output Fields

During planning or review, an agent may annotate a draft with:

- `cognitiveTemplate`
- `formatTemplate`
- `reasoningOrder`: `first`, `second`, or `third`
- `sourceCoverage`: fact, mechanism, case, management, or visual
- `distractorStrategy`: near-neighbor, threshold-neighbor, wrong-mechanism, wrong-stage, overgeneralization, or unrelated

Only `reasoningOrder` is part of the current live Question Studio generation taxonomy. The other labels are internal scaffolding for better writing and review.

## Default Template Mix For A Module

For a general module batch, use a balanced mix:

- 20% recall / definition / threshold.
- 20% recognition / feature set.
- 15% mechanism.
- 15% discrimination.
- 15% diagnosis / interpretation.
- 10% management / safety.
- 5% sequencing / matching.

Adjust heavily based on the source. A pharmacology module may need more management and safety. A visual skills module may need more media interpretation. A physiology module may need more mechanism.
