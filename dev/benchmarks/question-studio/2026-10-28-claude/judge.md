# Quality judge and cue probes for Question Studio

Date: 2026-10-28. Purpose: score generated questions by **cost per good question**, not by how many the pipeline's own reviewer accepted. Code is in `scripts/ai-eval/judge/`. Data and caches are in `tmp/ai-eval-judge/` (gitignored).

## Method

- **Judge** (`judge.ts`): Opus 5.5 at medium effort, adaptive thinking and structured output, with 4 items per call. Items are shuffled across batches and labelled A, B, C… so ids, file names and configs never reach the prompt. The judge sees the question type, stem, options with the key marked, rationale and, when present, the source excerpts (capped at 6,000 characters). It uses the excerpts to check grounding. For each item it returns a short analysis, the options it could defend, a mark for each criterion, an overall verdict and up to four reasons.
- **Score:** code computes the 0–1 score from the marks as a weighted pass share over the applicable criteria. Gate criteria weigh more, and a failed `accurate` caps the score at 0.5. The verdict itself is the judge's.
- **Probes** (`probes.ts`): Haiku 5.5 at low effort. Each sample shows the options in a seeded shuffled order.
  - *Options-only:* the options without the stem, three independent samples. This reports the hit rate against chance (1/n).
  - *Cover test:* the stem only, answered in at most 15 words. A separate Haiku call grades the answer `match`, `partial` or `no` against the key.
  - *Blind solve:* the full item without the key, one sample.
- **Budget:** a separate ledger at `tmp/ai-eval-judge/anthropic-ledger.json` with `lockEvaluationBudget`. Each call reserves its worst case before it runs and books the actual cost afterwards (`measureClaudeUsage`). Calls use `maxRetries: 0`. Opus uses the server-side fallback beta; Haiku doesn't. Calibration caps the whole ledger at $8, and `score-run` caps each run (default $5).

### Criteria keys

These are the 12 rubric criteria from `human-exemplars.md` plus `accurate`. Criteria outside their scope are forced to `na` in code.

| Key | Scope | Short meaning |
| --- | --- | --- |
| `accurate` | all | The key is right and is the single best answer. The rationale has no factual slip, even one copied from the source. |
| `coverTest` | all | With the options hidden, the stem has one specific answer, and it is the key. |
| `necessaryDetail` | clinical, CT | A scenario detail decides the key. Fails decorative vignettes. |
| `withholdLabel` | clinical, CT | The stem doesn't name the diagnosis, class or defining phrase. |
| `pertinentNegatives` | all | The stem states what excludes a variant-correct distractor. `na` when not needed. |
| `homogeneousOptions` | all | One category, parallel options, no length or absolute-word cue, no feature grid. |
| `nearMiss` | all | One wrong option would be the key if a nameable fact changed. |
| `excludableDistractors` | all | Each wrong option is excluded by a finding or relationship, not by absence or circularity. |
| `rationale` | all | Rule plus a reason per wrong option, about 35–100 words, no takeaway padding. |
| `noConcededAlternatives` | all | No second option is conceded or defensible. |
| `numbersUnits` | all | Numbers have a use and units and don't overlap. `na` without numbers. |
| `twoRelationships` | CT | One relationship narrows the options, and a second separates the finalists. |
| `plainRegister` | all | No source framing ("not described"), item-writing vocabulary ("the closest miss"), jokes or letters. |

Verdicts: **good** means a curator would publish it as is. **Acceptable** means it is correct and unambiguous but a weaker discriminator, kept after a light edit. **Poor** means a wrong or contestable key, a defensible second option, a stem that needs the options or gives the answer away, mostly throwaway or mixed distractors, or a decorative vignette. "$ per good" uses `good` only.

## Anchor set

`tmp/ai-eval-judge/anchors.json` has 50 items. The compact labels live in `labels.json`, and `anchors-for-review.md` is written for quick human correction.

- **13 human** curator exemplars from `tmp/human-exemplars/exemplars.json`. These have no excerpts.
- **30 live Learn items** from v28 Sonnet+Opus (15), v29 without repair (7) and v29 with repair (8). Each carries the Cardiovascular pages it cites as evidence.
- **7 scenario items** accepted in the v27/v29 offline eval: 6 Clinical and 1 Critical thinking, with their slot evidence.
- **Labels:** 18 good, 22 acceptable, 10 poor. I marked 11 as uncertain.
- **Corrections after seeing judge output:** I changed two labels on objective grounds, and I'm stating it here so nobody mistakes it for fitting.
  - After v1, I added `plainRegister` fails to 4 rationales that literally say "not described", "not supported" or "described for".
  - After v2, I set H-C2 to `accurate` fail and overall acceptable, because its rationale expands VLK as "keratoconjunctivitis" (it is vascularized limbal *keratitis*).
  - No other labels moved.

## Calibration

The prompt went through three versions. The labels stayed fixed except for the corrections above.

| Version | Overall exact | Within one | κ (weighted) | "Good" agreement | Precision / recall of good |
| --- | --- | --- | --- | --- | --- |
| judge-v1 | 62% | 90% | 0.40 | 74% | 88% / 37% |
| judge-v2 | 64% | 90% | 0.44 | 76% | 77% / 53% |
| **judge-v3** (final) | **74%** | **94%** | **0.59** | **84%** | **86% / 67%** |
| judge-v3 retest (batch seed 31) | 68% | 94% | 0.49 | 84% | 100% / 56% |

- **v2:** courses' mainstream teaching points are no longer failed on specialist nuance. Subtype lists and mechanism lists stop counting as grids. Misnomers fail `accurate` even when the source has them.
- **v3:** a near miss must have a nameable fact that would flip it. "Contestable" now means a real share of prepared students would pick another option. A terminology slip caps the item at acceptable instead of making it poor.

**Split by origin (v3).** Generated items are what the parent will score, and they all carry evidence.

| Subset | Items | Exact | Within one | "Good" agreement | Precision / recall |
| --- | --- | --- | --- | --- | --- |
| Generated | 37 | 86% (retest 81%) | 100% | 97% (retest 97%) | 90% / 100% (retest 100% / 89%) |
| Human, no excerpts | 13 | 38% (retest 31%) | 77% | 46% | 75% / 33% |
| Labels not marked uncertain | 39 | 77% | — | 82% | — |

**Test-retest.** Between the two v3 runs, the judge agrees with itself 86% exactly (κ 0.77) and 92% on good. On generated items it is 89% and 95%.

**v3 confusion** (rows are anchors, columns are the judge):

| | good | acceptable | poor |
| --- | --- | --- | --- |
| good | 12 | 3 | 3 |
| acceptable | 2 | 18 | 2 |
| poor | 0 | 3 | 7 |

**v3 per criterion.** "Missed" means the anchor failed it and the judge passed it.

| Criterion | n | Agreement | κ | Missed | Extra |
| --- | --- | --- | --- | --- | --- |
| accurate | 50 | 86% | 0.17 | 1 | 6 |
| coverTest | 50 | 92% | 0.47 | 0 | 4 |
| necessaryDetail | 15 | 100% | 1.00 | 0 | 0 |
| withholdLabel | 15 | 87% | 0.00 | 2 | 0 |
| pertinentNegatives | 12 | 83% | 0.00 | 0 | 2 |
| homogeneousOptions | 50 | 94% | 0.87 | 1 | 2 |
| nearMiss | 50 | 86% | 0.58 | 5 | 2 |
| excludableDistractors | 50 | 88% | 0.59 | 2 | 4 |
| rationale | 50 | 86% | 0.62 | 0 | 7 |
| noConcededAlternatives | 50 | 92% | 0.30 | 1 | 3 |
| numbersUnits | 8 | 88% | 0.00 | 0 | 1 |
| twoRelationships | 5 | 80% | 0.00 | 0 | 1 |
| plainRegister | 50 | 96% | 0.92 | 1 | 1 |

How to read these:

- Low κ with high agreement (`accurate`, `withholdLabel`) means the criterion rarely fails, so κ is unstable. Read the missed and extra counts instead.
- Almost all extra `accurate` and `noConcededAlternatives` fails are human items without excerpts. Examples: "timolol isn't contraindicated in NTG", "bariatric surgery is the more classic cause", "MRD-1 with the brow lifted".
- The judge is a little more lenient than the anchors on `nearMiss` for generated items: it still accepts some same-differential neighbours.

## Probes on the anchors

| Group | Items | Options-only hit | Chance | Lift | ≥2/3 samples hit | Cover match | Cover match+partial | Blind solve |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Human | 13 | 13% | 22% | −9 pp | 8% | 31% | 46% | 69% |
| Generated | 37 | 59% | 25% | +34 pp | 59% | 41% | 84% | 95% |
| Label good | 19 | 30% | 24% | +6 pp | 26% | 42% | 68% | 84% |
| Label acceptable | 21 | 51% | 25% | +26 pp | 52% | 33% | 76% | 86% |
| Label poor | 10 | 70% | 25% | +45 pp | 70% | 40% | 80% | 100% |

- **Options-only is the strongest objective signal.**
  - Generated options give the key away more than half the time, through a longer or more qualified key, absolute words on the distractors, or options that are true or false statements on their own.
  - Curator options sit at or below chance.
  - The rate rises steadily from good to poor labels.
- **Blind solve** says generated items are easy: Haiku gets 95% of them and 69% of the human ones. Treat a blind-solve rate near 100% as a warning, not as success.
- **Cover test** separates less sharply. Many good Learn stems have several acceptable short answers, so `match` is strict and `partial` is common. Use it as a secondary signal.
- Probe calls (v1 run, `probes-v1`): 300 Haiku calls for $0.026.

## Baseline scores

The 30 live items came from the calibration cache, so this run cost nothing new. Generation spend is from `redesign.md`.

| Config | Items | Good / acc / poor | Mean score | Options-only hit (chance) | Strong cue | Cover match | Blind solve | Gen spend | $ per good | $ per good+acc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| live v28 Sonnet+Opus | 15 | 7/7/1 | 0.91 | 53% (25%) | 53% | 40% | 93% | $0.65 | $0.093 | $0.046 |
| live v29 no repair | 7 | 0/5/2 | 0.77 | 62% (25%) | 57% | 14% | 86% | $0.28 | ∞ | $0.056 |
| live v29 one repair | 8 | 0/4/4 | 0.73 | 71% (25%) | 75% | 38% | 100% | $0.45 | ∞ | $0.113 |

Offline eval, all `*.question-types-v29.json` files (4 documents, accepted drafts only). Spend is the recorded call cost, a lower bound. Cost of this run: $0.62.

| Config | Items / slots | Good / acc / poor | Mean score | Options-only hit (chance) | Strong cue | Cover match | Blind solve | Gen spend (lower bound) | $ per good |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sonnet-default-agent-solve-curated@v29 | 12/12 | 3/7/2 | 0.89 | 39% (25%) | 42% | 75% | 100% | $0.57 | $0.19 |
| sonnet-default@v29 (r1+r2) | 10/24 | 3/6/1 | 0.82 | 43% (25%) | 40% | 70% | 100% | $1.59 | $0.53 |
| sonnet-sonnet@v29 | 8/12 | 4/2/2 | 0.94 | 25% (25%) | 25% | 63% | 100% | $0.52 | $0.13 |

With only 8–12 items per config, these differences are within judge noise. Use the larger fixture from `redesign.md` (48 slots per config) before drawing conclusions.

## Cost

| Item | Cost |
| --- | --- |
| Opus judge | about $0.020 per item at batch size 4 and medium effort |
| Probes (6 Haiku calls per item) | about $0.0005 per item |
| Scoring 50 items | about $1.05 |

My total spend: **$4.56** across 528 ledger entries with no failed calls. That covers a smoke test, judge v1–v3 plus a retest ($3.92), probes ($0.03) and the v29 eval scoring ($0.62).

## How to run

```sh
# Score eval result files and/or candidate markdown (cached verdicts are reused):
bun scripts/ai-eval/judge/score-run.ts --label=v29-vs-agent 'tmp/ai-eval/*.question-types-v29.json' \
  tmp/live-v28-sonnet-opus.md=live-v28 --pages=tmp/ai-eval/af3c991e656cb57d69099deb179d4d893740238930f269586b1fcfe884fd2bc6.pages.json \
  --spend=live-v28=0.65,sonnet-default@v29=1.20
#   → tmp/ai-eval-judge/scores-<label>.json plus a per-config table.

# Recalibrate after editing the judge prompt (bump JUDGE_VERSION) or labels:
bun scripts/ai-eval/judge/anchors.ts            # free; rebuilds anchors.json and the review file
bun scripts/ai-eval/judge/calibrate.ts --tag=judge-v4 [--probes] [--seed=31]
bun scripts/ai-eval/judge/calibrate.ts --tag=judge-v3 --report-only
```

- **Config names:** eval JSON gives configs as `<config>@vNN`, with repeats (`-r1`, `-r2`) grouped. `path=name` overrides the name.
- **Spend:** `--spend=config=usd` (or `--spend-file`) sets generation spend. Without it, eval JSON falls back to the run's recorded call costs, which miss failed calls and so are a lower bound. Use ledger totals for real comparisons.
- **Other flags:** `--no-probes`, `--no-judge`, `--samples=3`, `--batch=4`, `--effort=medium`, `--ceiling=5`, `--type=learn`.
- **Programmatic use:** `judgeItems(items, opts)` in `judge.ts` and `probeItems(items, opts)` in `probes.ts` both need `startJudgeSession()` from `claude.ts` first. `summarizeConfig` and `formatSummaries` in `summary.ts` are pure.

## Limits

- **Small anchor set.** It has 50 items, 37 of them generated and only one generated Critical-thinking item. Three topic sources dominate. Agreement on Clinical and Critical-thinking items rests on 15 items. A difference of one or two "good" items between configs is within judge noise: retest flips about 5% of generated items. For close calls, judge twice with different `--seed` and average.
- **One labeller.** I labelled the anchors and wrote the prompt, so calibration measures agreement with my reading of the rubric, not with curators'. `anchors-for-review.md` exists so a human can correct the labels; rerun `calibrate.ts` afterwards.
- **Human items are the weak spot.** Without excerpts, Opus second-guesses course-specific keys and rates curator items lower than I do. Exact agreement on them is 38%. This doesn't affect pipeline comparisons, where every item has evidence, but don't use the judge to grade the human bank.
- **Evidence presence is visible to the judge.** Human items have none. The prompt says authorship doesn't matter, but the judge could still infer it.
- **The judge sees accepted items only.** Eval JSON doesn't store rejected drafts. Yield therefore comes from items/slots, and "$ per good" puts all generation spend on the accepted good items, which is the quantity we want.
- **Probes depend on the probe model.** Haiku is a fixed but imperfect solver, so compare probe rates between configs, not against a fixed bar. The options-only sample count is 3, so per-item cue strength is coarse (0, ⅓, ⅔ or 1).
- **Cover-test grading is itself a Haiku call** and is strict on Learn stems with several valid phrasings.
