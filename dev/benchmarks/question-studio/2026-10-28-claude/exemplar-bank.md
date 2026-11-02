# Exemplar bank: human questions scored by student responses

Date: 2026-10-28. Purpose: give the Question Studio drafter real curator-written questions to imitate for each objective, ranked by a checkable rubric plus first-attempt student statistics, instead of a prompt rubric alone. This builds on `human-exemplars.md` (same folder): its provenance screen, its 12-point rubric, and its 13 hand-picked exemplars, which serve as a sanity check here.

Interface: `src/convex/questionStudio/exemplars.ts` (`Exemplar`, `ExemplarQuery`, `ExemplarSource`, `formatExemplar`), unchanged.

## Data

The source was a read-only production snapshot (`bunx convex export --prod`, 2026-10-28) unzipped to `tmp/exemplar-bank/raw/export/`. Learner ids stay in `tmp/` and appear in no output; `bank.json` holds aggregates only.

| Volume | Count |
| --- | --- |
| Questions | 32,072 |
| Live human-written (no `metadata.generation`, `aiGenerated` false) | 4,679 |
| `studyChecks` rows | 8,107 (2026-09-22 to 2026-10-28) |
| Answered `quizAttemptItems` | 6,856 |
| First attempts (earliest check or quiz answer per learner and question) | 10,688 from 67 learners |
| First attempts on human questions | 7,779 across 1,947 questions |
| Human questions with at least 15 first-attempt responders | 87 (none with 30 or more) |
| Legacy `userProgress` saved selections | 140,764 (58,944 on human questions, 142 learners) |

**The legacy selections are not usable for psychometrics.** `userProgress.selectedOptions` is the learner's last saved choice, not their first attempt. Students keep clicking until they hit the key, so the median item is 100% "correct" (787 bank items have 15 or more selections). The builder still computes these stats and stores them as `finalSelection` in `bank.json`, but scoring ignores them. First-attempt data only began with study checks in Sep 2026, so psychometric evidence is thin.

## Filters (counts at each step)

| Step | Removed | Left |
| --- | ---: | ---: |
| All questions | | 32,072 |
| AI-generated (generation metadata or `aiGenerated`) | 27,393 | 4,679 |
| Provenance: Clinical Immunology and Microbiology, Low Vision (bulk machine-polished, per `human-exemplars.md`) | 452 | |
| Revised after import: Systemic Disease rows updated on or after 2026-10-01 (rationales rewritten after the bulk faculty import; 35 of its 47 first-pass top items were such rows) | 50 | |
| Not published | 35 | |
| Not `multiple_choice` | 1,190 | |
| Multi-select | 851 | |
| Option count outside 4–6 | 264 | |
| No rationale (fewer than 8 words) | 414 | |
| Image-dependent (attached `questionMedia`, or "following picture/figure/shown below…") | 295 | |
| Stem under 4 words | 3 | |
| Duplicate stem and key copied into another module (best copy kept) | 56 | |
| **Bank** | | **1,069** |
| **Top tier** (all gates passed, quality ≥ 0.68) | | **183** |

Two of the hand-picked exemplars in `human-exemplars.md` (T1 `jx77c83…`, C1 `jx7d8kq…`) have attached media and are excluded under the conservative image rule. Three others (L1, L2, T2) are in the top tier.

The top tier is smaller than the several-hundred target. The binding constraint is the rationale: 741 of the 1,069 bank items (69%) have rationales that explain only the key and name no distractor. Relaxing that gate would add items whose rationales the drafter shouldn't imitate.

## Scoring

All logic is pure and shared by the offline builder and the Convex rebuild: `src/convex/questionStudio/exemplarText.ts` and `exemplarStats.ts`.

**Statistics**, computed per question on first attempts and against the current key (responses naming deleted options are dropped):
- `difficulty` is the share correct.
- `optionShares` is the share of first attempts choosing each option, in option order. The shares can sum past 1 when learners selected several options on a single-key item.
- `functionalDistractors` counts distractors chosen by at least 5% of responders.
- `discrimination` is a corrected point-biserial: first-attempt correctness against each learner's accuracy on the rest of the module (this item removed). It needs 15 or more responders, each with at least 3 other first attempts in the module.
- `Exemplar.stats` is filled only at 8 or more responders.

**Rubric** (0–1):

| Component | Weight |
| --- | ---: |
| Distractors the rationale addresses: all = 1, two or more = 0.8, one = 0.35 | 0.30 |
| Complete question (cover test: no blanks, no trailing colon, no "which is true", no "all of the following") | 0.15 |
| Parallel options (length ratio at most 4; key no longer than 1.75× the mean distractor) | 0.15 |
| No all/none/both-of-the-above | 0.10 |
| No option letters | 0.05 |
| Stem length band (Learn 6–45 words; Clinical and Critical thinking 18–160) | 0.08 |
| Rationale length band (25–150 words) | 0.07 |
| Plain register (no professor or lecture references, no Haiku-flagged jokes, anecdotes or asides) | 0.10 |
| Negative stem (NOT/EXCEPT/LEAST), a penalty: these were over-represented, at 9% of the top tier against 4% of the bank | −0.05 |

A distractor counts as addressed when the rationale contains the option text, or at least half of its distinctive tokens (excluding tokens shared with the key).

**Psychometrics** (0–1): difficulty in 0.35–0.90 scores 0.35, two or more functional distractors 0.35, and discrimination above 0.15 scores 0.30. Without discrimination, difficulty and functional distractors split the score evenly.

**Quality** = 0.75 × rubric + 0.25 × (w × psychometric + (1 − w) × 0.35). The evidence weight w is 1 at 15 or more responders, 0.5 at 8–14, and 0 below. Unmeasured items can still enter on the rubric, but they rank below well-measured ones.

**Gates for the top tier**:
- The rationale addresses at least one distractor.
- The stem is a complete question.
- No all/none options, no option letters, plain register.
- The item doesn't depend on unseen material (Haiku flag).
- With evidence: discrimination is not negative, difficulty is at least 0.2, and with 15 or more responders, difficulty is at most 0.97 and at least one distractor is functional.

**Labels**: `questionType` (learn, clinical, criticalThinking) and `shape` (mechanism-effect, test-purpose, threshold-use, diagnosis-from-findings, contraindication, constraint-application, parallel-causes, other). The deterministic heuristics (vignette and age markers, constraint and reasoning patterns, stem patterns, numeric options) left 55% of items as `other` and found only 6 Critical-thinking items that passed the distractor gate. So Claude Haiku 5.5 relabeled the 1,069 items in batches of 20, with structured output, thinking off and effort low, and also flagged informal register and dependence on unseen material. Haiku agreed with the heuristics on type for 78% of items and on shape for 50%. The heuristic labels remain the fallback, and they are what the live Convex rebuild uses; the live upsert never overwrites model labels with heuristic ones.

## Distribution

| Type | Bank | Top |
| --- | ---: | ---: |
| Learn | 712 | 117 |
| Clinical | 278 | 47 |
| Critical thinking | 79 | 19 |

Top tier by shape: other 52, mechanism-effect 37, threshold-use 27, diagnosis-from-findings 25, test-purpose 13, parallel-causes 12, constraint-application 12, contraindication 5. The largest type/shape cells are learn/other 47, learn/mechanism-effect 34, learn/threshold-use 21, clinical/diagnosis-from-findings 18, learn/test-purpose 10 and clinical/constraint-application 10.

Top tier by subject (15 classes): Vision Science III: Motility 30, Ocular Disease II: Glaucoma 24, Pediatrics 22, Ocular Disease I: Anterior Segment 17, Contact Lens I 15, Contact Lenses II 14, Vision Science II 13, Systemic Disease 13, Ocular Pharmacology 12, General Pharmacology 6, Binocular and Refractive Anomalies 6, Binocular and Perceptual Disorders 5, Ocular Disease: Anterior Segment 4, Med Chem 1, Molecular Biology 1. The bank is optometry-heavy. Pharmacy, immunology and molecular-biology sources will retrieve structurally similar optometry items, not same-subject ones.

Top-tier text, as medians:

| Type | Stem words | Rationale words | Rationale answers every distractor | Two or more |
| --- | ---: | ---: | ---: | ---: |
| Learn | 14 | 41 | 24 | 70 |
| Clinical | 27 | 44 | 7 | 31 |
| Critical thinking | 37 | 74 | 5 | 15 |

## Psychometric summary (bank)

- 680 bank items have at least one first attempt, 66 have 8 or more (median 10 responders), and 17 have 15 or more.
- At 8 or more responders, median difficulty is 0.875. 43 items fall in the 0.35–0.90 band, 22 are easier and 1 is harder. 26 have two or more functional distractors.
- Discrimination (n = 17): the median is 0.08, 7 items exceed 0.15, 2 are negative (gated out), and the range is −0.13 to 0.65.
- 14 of the 183 top-tier items carry `stats`. The rest entered on the rubric alone.

**Takeaway:** the student data is enough to veto bad items and lift a handful of good ones, but the ranking is mostly rubric-driven today. Rebuild as study checks accumulate (see below).

## Ten top-tier examples

These are plain text and short. The format is n = responders, p = share correct, D = discrimination, and option shares in option order.

1. `jx72h3tf2trfvyaf657se191a58ehf0g`, Learn, mechanism-effect, Vision Science II. n=17, p=0.29, D=0.08, shares 29/29/18/24; the rationale answers all 3 distractors. "Which is most representative of a Lambertian surface?" Key: a projector screen. A hard item whose distractors all draw responses.
2. `jx77agvgt96s5708wmd79p5z3s8ehgp1`, Critical thinking, other, Vision Science II. n=10, p=0.40, shares 40/10/40/20. A luminous-flux calculation from intensity; the key is 3142 lm.
3. `jx703e3ecp5ct927k3yk3xs24x8egw90`, Learn, test-purpose, Vision Science II. n=16, p=0.88, D=0.07, shares 6/88/0/6. A negative stem about light-adaptation testing.
4. `jx7djt0hhg4bpfwkxzp98hz1dn821k6t`, Critical thinking, other, Pediatrics. n=8, p=0.63, shares 0/13/25/0/63/0. Which relative of a boy with red-green deficiency most likely shares it? Key: maternal grandfather.
5. `jx78kzzp9wvm73m79ddpks0vrs8f4nwk`, Learn, other, Binocular and Perceptual Disorders. n=13, p=0.54, shares 0/46/0/0/54; the rationale answers all 4 distractors.
6. `jx715w2f4qjp02sw42wpwyc0cd8eqha9`, Clinical, diagnosis-from-findings, Ocular Disease: Anterior Segment. Unmeasured; the rationale answers all 3 distractors. Which MGD expression finding is most concerning? Key: no excretion.
7. `jx73bdqypj7spb15z05zecy6rx85wsbh`, Clinical, parallel-causes, Vision Science III. Unmeasured. Diplopia etiology in a 68-year-old; the key is stroke.
8. `jx76nmmwgnsjry7e5kssnvqftd82c9mv`, Critical thinking, parallel-causes, Vision Science III. Unmeasured; the rationale answers all 5 distractors. Localize the semicircular canal from the vertigo and nystagmus findings.
9. `jx7bp42j0ze86x7gmk0cwa1qwh8f50t2`, Critical thinking, constraint-application, Binocular and Perceptual Disorders. n=10, p=0.50, shares 10/40/50/0. Next step after vertical prism fails; the key is a VT referral with a guarded prognosis.
10. `jx7cmhah6gje02p7n6702g6kv5827sa6`, Learn, mechanism-effect, General Pharmacology. Unmeasured. Exemplar L1 from `human-exemplars.md` (the alpha-2 receptor and aqueous production).

Known weaknesses that survive the gates:
- Typos and plural stems with a single key (e.g. `jx7dbzzr…`).
- Some optics calculations are labeled Clinical.
- A few casual-but-not-joking vignettes ("shows up at 4:30 PM on a Friday").

Exemplars are structure models, and `formatExemplar` already frames them as "not a template to copy".

## Retrieval

**Offline** (`scripts/ai-eval/exemplars/retrieve.ts`): `createOfflineExemplarSource(bankPath = 'tmp/exemplar-bank/bank.json', { tiers = ['top'] })` returns an `ExemplarSource`.
- It embeds `objective` plus up to 1,500 characters of `context` with openai/text-embedding-3-large (3072 dimensions, via OpenRouter), through the same disk cache as the bank.
- It filters by `questionType` and `exclude`, takes the 40 nearest by cosine, then picks `limit` items (default 3) by maximal marginal relevance.
- Relevance is 0.8 × similarity + 0.2 × quality, minus 0.06 per already-picked item from the same subject and 0.05 per same shape.
- Bank embeddings cover subject, stem and key. Pass `tiers: ['top', 'standard']` for a wider pool, which helps Critical thinking (19 top items).
- CLI: `bun scripts/ai-eval/exemplars/retrieve.ts clinical "objective text"`.

**Live** (`internal.questionStudio.exemplarBank.findExemplars`, an internal action):
- Args: `{ questionType, objective, context?, limit? (max 10), exclude?, tiers? }`; it returns `Exemplar[]`.
- It embeds the query, runs `ctx.vectorSearch('questionExemplars', 'by_embedding')` filtered on `typeTier` (`${questionType}:${tier}`, because vector filters can't AND two fields), hydrates through `getExemplars`, drops excluded ids and duplicate stems, then applies the same MMR (`selectDiverse`).

**Table** `questionExemplars`:
- It holds the Exemplar fields plus `sourceQuestionId`, `questionId?`, `cohortId?`, `tier`, `typeTier`, `quality`, `labelSource`, `embedTextHash`, `embedding` (3072), `buildId` and `updatedAt`.
- Indexes: `by_sourceQuestionId`, and the vector index `by_embedding` with filters `typeTier` and `cohortId`.
- Each row is about 25 KB, so never scan the whole table in one function.

The dev deployment is seeded with the 1,069-item bank (183 top). Check:

```
bunx convex run questionStudio/exemplarBank:findExemplars '{"questionType":"clinical","objective":"Identify contact lens complications from presenting symptoms"}'
```

## Design tier (November 1)

Items that fail only `rationale-skips-distractors` and score at least 0.58 (`DESIGN_TIER_MIN_QUALITY`) form the `design` tier: 379 of the 1,069 (264 Learn, 85 Clinical, 30 Critical thinking). `exemplarForTier` blanks their rationale before it reaches a prompt, and `formatExemplar` then omits the rationale line, so the drafter models their stems, options and statistics only. `exemplarTiers` decides which tiers each type retrieves: Learn and Clinical use top only, and Critical thinking uses top, design and standard. Retrieval anchors on the best top-tier candidate when there is one. The v36 eval is in the parent README, Round 3.

The bank was rebuilt from a November 1 production export (`tmp/exemplar-bank/raw-2026-11-01/`). The question table was unchanged, and labels and embeddings came from cache. The October 28 build is kept as `bank-2026-10-28.json`.

## Rebuild

Offline (from a fresh read-only prod export):

```
bunx convex export --prod --path tmp/exemplar-bank/raw/prod-export.zip
unzip -o -q tmp/exemplar-bank/raw/prod-export.zip 'question/*' 'module/*' 'class/*' 'questionMedia/*' 'studyChecks/*' 'quizAttemptItems/*' 'userProgress/*' -d tmp/exemplar-bank/raw/export
bun scripts/ai-eval/exemplars/build-bank.ts          # --no-label skips Haiku, --no-embed skips embeddings
bun scripts/ai-eval/exemplars/push.ts                # upsert bank.json into dev (--prod --yes-production for prod), prune older builds
```

The builder writes `tmp/exemplar-bank/{bank.json, top-tier.json, report.json, labels.json, embeddings.jsonl, ledger.jsonl}`. Labels and embeddings are cached by content hash, so a rebuild only pays for changed items. Keys come from `bunx convex env get` on dev and are never printed.

Live (any deployment, once this code is deployed):

```
bunx convex run migrations/exemplars:rebuildExemplarBank '{}'
```

- It pages the question table (`batchSize`, default 1000), recomputes first-attempt stats from `studyChecks` and `quizAttemptItems` on each page, scores items with heuristic labels, embeds only rows whose embedded text changed, upserts in batches of 20, and schedules itself.
- On the last page it schedules `questionStudio/exemplarBank:pruneExemplars` for rows from older builds.
- `{"continueAutomatically": false}` processes one page.
- Not run on production. For production, prefer `push.ts --prod --yes-production`, which keeps the Haiku labels.

## Costs

| Item | Tokens | Cost |
| --- | ---: | ---: |
| Claude Haiku 5.5 labels (two passes; the second added the register and unseen flags) | 548k | $0.112 |
| text-embedding-3-large (1,069 bank items plus test queries) | 48k | $0.006 |
| **Total** | | **$0.118** |

Each budget was capped at $1, with the ledger in `tmp/exemplar-bank/ledger.jsonl`. Live `findExemplars` costs one query embedding per call, about $0.000005.

## Files

- `src/convex/questionStudio/exemplarText.ts`: pure HTML stripping, candidate screen, type/shape heuristics, rubric
- `src/convex/questionStudio/exemplarStats.ts`: pure response stats, quality, tiers, MMR, fingerprint
- `src/convex/questionStudio/exemplarValidators.ts`: the `questionExemplars` table definition and arg validators
- `src/convex/questionStudio/exemplarBank.ts`: `upsertExemplars`, `existingExemplarKeys`, `pruneExemplars`, `getExemplars`, `findExemplars` (all internal)
- `src/convex/migrations/exemplars.ts`: `exemplarResponsePage`, `exemplarCandidatePage`, `rebuildExemplarBank`
- `src/convex/schema.ts`: registers `questionExemplars` (`tests/fileSizeBudget.json` schema cap 1143 → 1145)
- `scripts/ai-eval/exemplars/`: `build-bank.ts`, `classify.ts`, `embeddings.ts`, `retrieve.ts`, `push.ts`, `types.ts`
- `tests/exemplarBank.test.ts`
