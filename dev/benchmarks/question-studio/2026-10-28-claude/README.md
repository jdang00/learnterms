# Question Studio on Claude: October 28, 2026

Development only (`rightful-crane-34`). Nothing was published or deployed; production only received an `ANTHROPIC_API_KEY` env var. The work is on branch `t3/claude-models` and is not committed.

The sections below are in date order, and later rounds supersede earlier defaults. The current defaults are in [Recommended defaults](#recommended-defaults): Opus drafts alone with a Haiku blind-solve gate (Round 2), under the v36 option rules (Round 3).

Related: [human exemplar study](human-exemplars.md) · [redesign proposal](redesign.md) · exemplar bank (`exemplar-bank.md`) and calibrated judge (`judge.md`), both in progress.

## What changed

- **Provider.** Every AI call moved from OpenAI/OpenRouter to Claude, except embeddings, which stay on OpenRouter (`text-embedding-3-large`, so RAG indexes stay valid).
  - Structured calls use the official SDK (`beta.messages.create` with a zod output format). It checks `stop_reason` before parsing and keeps billable usage on refusals and truncation.
  - Sonnet and Opus calls opt into server-side fallback. Haiku has none.
  - The price table is per model, including Haiku's above-100K rate, cache writes at 1.25× and fallback attempts priced at the serving model's rate. The telemetry strip matched a recomputation to the cent on every live run.
- **Agent paths.** Mapping, planning, free-response grading, the RAG tester and the module emoji suggestion use `@ai-sdk/anthropic@3.0.135`, the AI SDK v6 line. 4.x targets AI SDK v7 and `@convex-dev/agent` rejects its models.
- **Stage defaults** (`aiModels.ts`): Sonnet drafts. Sonnet reviews Learn and Opus reviews Clinical and Critical thinking on the reviewed pipeline. Haiku handles planning, grading, emoji and RAG chat.
- **Harness v27 → v30.**
  - Output caps sized for thinking.
  - Clipping to the schema bounds that structured outputs don't enforce. Format failures went from 1–3 per config to 0.
  - Prompts rewritten from the curator exemplars.
  - Deterministic item checks in `checks.ts`: rubric vocabulary, two-feature option grids, a conspicuously long key, all/none options, rationale length, classification stems, and Clinical/Learn type screens.
  - Per-stage model and effort policy.
  - A repair round on the fast Learn path, gated on the deadline.
  - Caching only where a same-model call can reuse it.
- **Agent pipeline, new** (`questionStudio/agent/`).
  - A Sonnet tool-use agent plans a blueprint for each item (rule, shape, discriminators, three confusions each with the fact that excludes it), writes from it and submits.
  - On submit, code runs the checks plus a Haiku blind solve with the key hidden. Rejections go back into the same cached conversation once.
  - No reviewer rewrites anything.
  - Enabled on dev with `QUESTION_STUDIO_PIPELINE=agent`. The reviewed pipeline is still the default.

## Offline eval (4 lecture PDFs × Learn, Clinical, Critical thinking)

Acceptance means the pipeline's own gate passed the item. **It is not a quality score**: a lenient reviewer accepts more. The calibrated judge (in progress) replaces this column.

| Harness | Config (draft-review) | Accepted / 12 | L/C/CT | $ / accepted | Median slot s | Median rationale words |
| --- | --- | --- | --- | --- | --- | --- |
| v27 | Haiku-Haiku | 6 | 4/2/0 | $0.010 | 36.0 | 91 |
| v27 | Haiku-Sonnet | 5 | 4/1/0 | $0.029 | 21.2 | 99 |
| v27 | Sonnet-Sonnet | 8 | 4/4/0 | $0.047 | 10.3 | 89 |
| v27 | Sonnet-Opus | 7 | 4/2/1 | $0.094 | 15.3 | 91 |
| v27 | Opus-Opus | 7 | 4/3/0 | $0.156 | 24.3 | 103 |
| v29 | Sonnet + per-type reviewer (run 1) | 5 | 3/2/0 | $0.169 | 22.4 | 63 |
| v29 | Sonnet + per-type reviewer (run 2) | 5 | 4/1/0 | $0.149 | 18.3 | 68 |
| v29 | Sonnet-Sonnet | 8 | 4/3/1 | $0.065 | 14.9 | 70 |
| v29* | **Sonnet agent + Haiku blind solve** | **12** | 4/4/4 | **$0.048** | ~22 per doc | 57–80 |

\*The agent run used 13 curated exemplars, not the full bank, and the harness label was v29 at the time.

Cost shape of the agent run per document: Sonnet agent turns $0.13–0.17 (57–67% cache hit), Haiku blind solve **$0.0006–0.0008**. In the first live run, the Opus reviewer cost $0.53 of $0.65.

## Live Question Studio runs (15 Learn, cardio/heme pp. 3–20 → Testing Module)

| # | Harness / pipeline | Kept | Wall | Spend | $ / kept |
| --- | --- | --- | --- | --- | --- |
| 1 | v28 · Sonnet draft + Opus review | 15 | 36.4 s | $0.653 | $0.044 |
| 2 | v29 · Sonnet + Sonnet, no fast repair | 7 | 16.1 s | $0.279 | $0.040 |
| 3 | v29 · Sonnet + Sonnet, one fast repair | 8 | 26.9 s | $0.452 | $0.056 |
| 4 | v30 · agent, four-turn path | 11 | 42.6 s | $0.522 | $0.047 |
| 5 | v30 · agent, two-turn path | 15 | 32.8 s | $0.507 | $0.034 |
| Luna baseline (Sep 20, openai-1/2) | gpt-5.6-luna | 15 | 27–32 s | $0.024 | $0.0016 |

Claude is about 20× Luna's cost per question on this workload, still under 4 cents per kept question. In run 4, two workers hit the 45 s Learn deadline. Run 5 fixed that by putting exemplars in the first message and making `check_items` optional. It also counts cache reads against the per-user token budget the way Anthropic's limits do, i.e. not at all. Before that change, the run used 88% of the user's token bucket.

## Calibrated judge on the live runs

[judge.md](judge.md) describes the scorer: an Opus rubric judge with 86% exact agreement on labeled generated items and 97% on the "good" call, plus Haiku probes. **Options-only hit** is how often Haiku picks the key from the options alone (chance 25%; human curator items: 13%). The judge's own noise is about ±2 good items on 15.

| Live run (15 Learn) | Kept | Good / acceptable / poor | Options-only hit | Spend | $ per good |
| --- | --- | --- | --- | --- | --- |
| v28 · Sonnet draft + **Opus review** | 15 | **7** / 7 / 1 | 53% | $0.653 | **$0.093** |
| v32 · Sonnet draft + **Opus review** | 15 | 5 / 7 / 3 | 49% | $0.648 | $0.130 |
| v30 · Sonnet agent, two-turn | 15 | 4 / 8 / 3 | 47% | $0.507 | $0.127 |
| v32 · Sonnet agent + options-only gate | 7 | 2 / 4 / 1 | 19% | $0.352 | $0.176 |
| v32 · Opus agent + gate | 6 | 2 / 4 / 0 | 22% | $0.979 | $0.489 |
| v31 · Sonnet agent + gate (old objectives) | 6 | 1 / 3 / 2 | 6% | $0.500 | $0.500 |
| v29 · Sonnet draft + Sonnet review (± repair) | 7–8 | **0** / 4 / 4 | 71% | $0.28–0.45 | — |

What this settles:

1. **The Opus pass is what makes questions good**, and it does so by *rewriting*, not by criticizing: in v28 it rewrote 12 of 15. Swapping it for a Sonnet reviewer took good questions from 5–7 to 0. The default Learn reviewer is back to Opus.
2. **The agent is not better yet.** It is cheaper per kept question and it fills the count, and the options-only gate removes answer cues (47% → 6–19%). But it trades yield for that, and it hasn't produced more good questions than an Opus edit. Under the 45 s Learn deadline it gets two turns; Opus turns (18 s) don't fit.
3. **Objectives were a hidden depth limiter.** Live Learn slots said "Choose distinct fact 1 of 2 … test a definition"; v32 asks for the rule, mechanism, distinction or decision. Offline, with conceptual objectives, the agent wrote the best application items in the study.
4. **Answer cues are the biggest remaining defect in every pipeline.** Haiku finds the key from the options alone in about half of reviewed-pipeline items, against 13% for human items.

Next step (cheap and measurable): keep Sonnet draft + Opus edit, and add the twin options-only probe after the edit. A flagged item goes back to the Opus editor once with the cue feedback. Score it with `scripts/ai-eval/judge/score-run.ts`. Retry the agent once the exemplar bank is wired in, and on non-Learn work without the 45 s deadline.

## v33: repeated offline comparison, judged (2 runs × 12 slots per config)

Same four lecture fixtures as above, with Learn, Clinical and Critical-thinking slots and no deadline. Spend comes from the ledger. Judge noise is about ±2 good per config.

| Config | Kept / 24 | Good / acceptable / poor | Good L/C/CT | Options-only hit | Gen spend | $ per good |
| --- | --- | --- | --- | --- | --- | --- |
| A · Sonnet draft + Opus review | 13 | 8 / 5 / 0 | 4/3/1 | 56% | $1.64 | $0.205 |
| **B · A + human exemplars** | 12 | **10 / 2 / 0** | 6/4/0 | 56% | $1.89 | **$0.189** |
| C · B + options-only cue gate | 14 | 7 / 7 / 0 | 2/5/0 | 19% | $2.21 | $0.316 |
| D · Sonnet agent + exemplars | 16 | 3 / 12 / 1 | 1/0/2 | **8%** | $0.69 | $0.230 |

Decisions:

- **Default is B.** Sonnet drafts with two retrieved exemplars from the human question bank ([exemplar-bank.md](exemplar-bank.md)), and Opus reviews and edits every type. It had the most good questions, zero poor, mean judge score 0.99 against 0.93 for A, and the lowest cost per good.
- **The cue gate is off** (env `QUESTION_STUDIO_CUE_PROBE=on` turns it on). It cut answer cues from 56% to 19%, but its repair goes to the Sonnet drafter, which rewrites the whole item and loses Opus's edits. Good questions fell from 10 to 7. Next experiment: send cue feedback to the Opus editor as an options-only edit.
- **The agent stays behind its dev flag.** It keeps the most items, is cheapest per kept question and is nearly cue-free. The judge marks most of its items acceptable, not good, for option construction: justifications embedded in options, type × source grids, the real near miss left out, the key echoing stem values, and single-relationship Critical thinking. The blueprint asks for these but doesn't enforce them.
- **Answer cues remain the main defect of the default pipeline.** Haiku finds the key from the options alone in 56% of items, against 13% for human items. Fixing that without losing the Opus edit is the highest-value next step.

## Quality reading (manual, short)

- **v28 (Opus review)** had the strongest near misses (embolus appearance, ophthalmic artery ERG). It also had 2×2 option grids, rubric words in rationales ("the closest miss") and a classification stem.
- **v29** removed those defects, but the reviewer's patched replacements were weak: "used only to assess cardiac chamber function", "first diagnosis because it is the most dangerous". See [redesign.md](redesign.md).
- **Agent, offline** produced the best application items so far:
  - choosing among four near-plus powers from stem data;
  - Coats disease versus macular telangiectasia by age and laterality;
  - macroaneurysm management, where laser is correct because the acuity loss is progressive.

  Over-listed pertinent negatives and a patientless "clinical" stem were fixed in v30.
- **Agent, live run 5** is clean but shallow: mostly recall, filler wrong options such as "Fat"/"Talc", one mixed-category option set, and one classification stem (now a deterministic check). Without the exemplar bank and under the 45 s deadline, it takes the shortest path.

## Round 2 (October 29): efficiency, v34–v35

Budget $30, spent **$17.76**: $13.55 offline generation, $2.99 judge and probes, $1.21 for three live runs. Same four fixtures, judge and noise (about ±2 good per 24 slots) as v33.

### Where the money went in v33's default (B)

Per 24 slots: Opus review 41%, the Sonnet repair round plus its second Opus review 33%, Sonnet drafts 27%. Thinking was about two thirds of Sonnet's output. The free token-counting endpoint showed that about 3.5K of each ~5.5K-token Opus call is the same in every call of a type: 1.4K of output-schema grammar and 2.1K of instructions. Source evidence was only about 1.5K. None of it was cached: Learn calls ran with `cache: false`, and the scenario path put the per-document source *before* the instructions, so no prefix was shared across workers, documents or users.

### Offline sweep, judged (24 slots per config)

"Lean" means one draft call, then either one Opus edit (`editor`) or a Haiku blind solve (`solve`), with no repair round.

| Config | Good / acc / poor | Options-only cue | Gen spend | **$ per good** |
| --- | --- | --- | --- | --- |
| B · Sonnet draft + Opus review + repair (v33 default) | 10 / 2 / 0 | 56% | $1.89 | $0.189 |
| Lean · Sonnet + one Opus edit | 8 / 7 / 0 | 38% | $1.70 | $0.213 |
| Lean · same, Opus edit at low effort | 7 / 9 / 3 | 33% | $1.32 | $0.189 |
| Lean · + options-only probe before the edit | 11 / 6 / 3 | 33% | $1.99 | $0.181 |
| Lean · Haiku draft + Opus edit | 4 / 4 / 0 | 75% | $0.92 | $0.231 |
| Lean · Sonnet + Opus **advisor tool**, solve gate | 6 / 10 / 2 | 41% | $1.82 | $0.303 |
| Lean · Opus draft (high), solve gate, uncached | 9 / 11 / 1 | 35% | $1.12 | $0.124 |
| Lean · Opus draft (high), solve gate, v34 cache layout | 11 / 6 / 1 | 31% | $0.86 | $0.079 |
| **Lean · Opus draft (medium), solve gate, v34** | 10 / 12 / **0** | 35% | **$0.77** | **$0.077** |
| v35 · same + one Opus repair (new checks) | 9 / 10 / 3 | 42% | $0.97 | $0.107 |
| v35 · same + options-only probe → Opus repair | 13 / 4 / 3 | 32% | $1.12 | $0.086 |

### Live (15 Learn, cardio/heme pp. 3–20 → Testing Module)

| Run | Kept | Good / acc / poor | Options-only cue | Spend | $ per good | Wall |
| --- | --- | --- | --- | --- | --- | --- |
| v28 · Sonnet + Opus review (old default) | 15 | 7 / 7 / 1 | 53% | $0.653 | $0.093 | 36 s |
| v32 · Sonnet + Opus review | 15 | 5 / 7 / 3 | 49% | $0.648 | $0.130 | — |
| v34 · lean Opus + solve, all workers at once | 15 | 7 / 7 / 1 | 58% | $0.460 | $0.066 | 33 s |
| v34 · same, cache warm from the previous run | 15 | 5 / 7 / 3 | 51% | $0.355 | $0.071 | 26 s |
| **v35 · default, cold cache, 2.5 s worker stagger** | 14 | 6 / 8 / 0 | 40% | $0.397 | $0.066 | 34 s |

Together: lean has 18 good of 44 at **$0.067 per good**, against 12 of 30 at $0.108 for the reviewed pipeline.

### What changed in code

- **Default pipeline is lean** (`questionStudio/lean.ts`): Opus 5.5 drafts at medium effort with two human exemplars, and a Haiku blind solve gates. `QUESTION_STUDIO_PIPELINE=reviewed` restores Sonnet draft + Opus review; `QUESTION_STUDIO_LEAN_GATE=editor` uses Sonnet + one Opus edit.
- **Cache layout (v34):** stable instructions are the first system block and always cache; the source is a second block that caches only when a same-model follow-up can reuse it. Opus 5.5 reads cache at 0.05× input, so this took 22% off the Opus-only runs.
- **Worker stagger:** a cache entry is readable only once its first response begins. A Haiku test showed concurrent requests all write, 1 s mostly misses, and 2.5 s hits on every follower. Lean workers after the first wait 2.5 s; on the cold live run, 6 of 8 drafts read the prefix.
- **Advisor tool** support on structured calls, and a billing fix: usage `iterations` are now priced per model, so advisor (and fallback) tokens are counted. Before, an Opus advisor's tokens would have gone missing.
- **Judge:** the rubric is cached, and `--async` runs it through Message Batches at half price. 26 requests took 320 s, 13 took 122–137 s: fine for evals, too slow for curators.
- **Checks (v35):** a stem-echo rule (two or more stem roots repeated only in the key; 3% of judged good items against 14% of poor) and a key-only absolute word. A one-root echo flagged 23% of good items, so it was dropped, and so was a key-only parenthetical, which flagged legitimate labels like "(Hollenhorst)".
- Candidate metadata records the models that served the worker.

### What this settles

1. **Opus drafting alone beats Sonnet + Opus review on cost per good question** by about 2.5× offline and 1.6× live, with as many good and fewer poor. The Opus *rewrite* was the quality driver in v33; letting Opus write the first draft removes the review and repair calls.
2. **The advisor tool works but doesn't pay** here: the advisor reads the whole draft context at Opus rates and writes up to its cap, which costs about as much as a separate edit.
3. **Repair rounds don't earn their cost** at this quality level, even when Opus repairs its own drafts. The cue-gated repair gave the most good items (13) but also 3 poor and cost 46% more.
4. **Answer cues are still the main defect** (35–58% options-only hit against 13% for human items). The live Learn misses are stems that echo the key ("calcified heart valve" → "Calcific material"), filler distractors from another category ("Fat globules", "Renal failure", "Air embolus"), and lab tests mixed with imaging. Deterministic checks catch little of it.

## Round 3 (November 1): answer cues and the exemplar bank, v36

Budget $20, spent **$5.07**: $3.35 offline generation, $0.98 judge and probes, $0.74 for two live runs. Same fixtures, judge and noise as Round 2.

### Why options gave the key away

Across the 390 distinct judged items from every earlier run, the options-only hit rate tracks option length:

| Mean option length | Items | Options-only hit | Judged good |
| --- | --- | --- | --- |
| up to 3 words | 96 | 26% | 44% |
| 4–7 words | 162 | 30% | 49% |
| 8–12 words | 116 | 54% | 32% |
| over 12 words | 16 | 79% | 31% |

When the key was the longest option (37% of items, against 25% by chance), the hit rate was 53%; otherwise it was 30%. Human bank items use a median of 2 words per option, and only 6% average more than 8. The Opus drafts averaged 5–7 words, and live runs ran longer, because options were written as self-contained statements ("Plus reduces accommodative demand, so less accommodative convergence is driven"). A reader can judge such a statement true without the stem. The options-only probe never sees the stem, so stem echoes don't move it; they are a separate cue that the v35 check covers.

**v36 change** (`ACCURACY_CONTRACT` in `prompts.ts`, shared by every pipeline): options are short answers to the stem, usually one to six words. Context, mechanism and qualifiers go in the stem, so no option reads as a free-standing true or false statement. The key must not be the longest, most complete, most hedged or most moderate option.

### Offline (24 slots per config)

| Config | Good / acc / poor | Options-only cue | Gen spend | $ per good |
| --- | --- | --- | --- | --- |
| v34 · lean Opus (medium) + solve gate (Round 2 default) | 10 / 12 / 0 | 35% | $0.77 | $0.077 |
| **v36 · same + option rules** | **11 / 6 / 2** | **18%** | $0.78 | **$0.071** |
| v36 · + design-tier exemplars | 9 / 7 / 3 | 23% | $0.72 | $0.080 |
| v36 · + options-only probe → one Opus repair | 9 / 9 / 3 | 8% | $1.13 | $0.125 |
| v36 · Sonnet agent + solve gate (live exemplar policy) | 7 / 7 / 2 | 25% | $0.73 | $0.104 |

All 7 poor items in the three lean configs are Critical thinking: a single relationship settles the key, the vignette restates the textbook definition, or a source claim about Coats disease is carried over to macroaneurysm. Learn and Clinical had no poor items.

### Live (15 Learn, cardio/heme pp. 3–20 → Testing Module)

| Run | Kept | Good / acc / poor | Options-only cue | Mean option words | Spend | $ per good | Wall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| v35 · default (Round 2) | 14 | 6 / 8 / 0 | 40% | 5.7 | $0.397 | $0.066 | 34 s |
| v36 · default, run 1 | 14 | 6 / 7 / 1 | 55% | 2.7 | $0.368 | $0.061 | 31 s |
| v36 · default, run 2 | 14 | 5 / 8 / 1 | 33% | 2.4 | $0.370 | $0.074 | 32 s |

Together: v36 live has 11 good of 28 at **$0.067 per good**, the same as v34–v35 (18 of 44). Options went from 5.7 to 2.4–2.7 words, but the live cue rate (44%) is within the 40–58% spread of earlier live runs. The cued live items now have short options and are mostly the textbook answer to a well-known fact ("70–99% stenosis", "Amaurosis fugax", "Macular involvement"). Haiku recognizes these from its own knowledge, not from how the options are written. The rest are filler wrong options from another category ("Renal failure", "Flashes and floaters").

### Exemplar bank

- **Refreshed** from a read-only production export on November 1. The question table is unchanged (32,072), with 2,381 more study checks. No new item reached 8 first-attempt responders, so 66 items still carry statistics. Labels and embeddings were cached, so the rebuild cost nothing.
- **Design tier, new.** 558 human items fail only the rationale gate (the curator explained the key but not the wrong options). The 379 scoring at least 0.58 are now the `design` tier: 264 Learn, 85 Clinical and 30 Critical thinking. Retrieval shows them with their stem, options and student statistics, without the rationale, so the drafter copies their option design and not their informal explanations. Each slot still gets the best-matching top-tier item first when one exists (`selectDiverse` anchor).
- **Retrieval policy** (`exemplarTiers`): Learn and Clinical stay top-tier only, because adding design rows did not help (Learn 2 good of 6 against 5 of 7, within noise but the wrong way). Critical thinking draws on top, design and standard, as before; its design rows now come without their weak rationales.
- The bank is seeded on dev. **Production has no rows yet**: after deploy, run `bun scripts/ai-eval/exemplars/push.ts --prod --yes-production` (model labels, about $0.01 of embeddings) or `bunx convex run --prod migrations/exemplars:rebuildExemplarBank '{}'` (heuristic labels only). Without rows, Studio drafts without exemplars.

### What this settles

1. **Long options were the main writable cue, and the v36 rules fix it offline:** 35% → 18% options-only, against 13% for human items, with as many good questions at the same cost. Keep them.
2. **Live cue rates are now dominated by knowledge, not wording.** Options are as short as the curators'. Pushing further means repairing cued items, which reaches 8% but costs 76% more per good question and adds poor items. It stays off (`QUESTION_STUDIO_CUE_PROBE`).
3. **The agent pipeline improved most** (3 → 7 good on 24 since v33, cues 8–25%), but it still costs 46% more per good question than lean. It ships behind `QUESTION_STUDIO_PIPELINE=agent` and is not the default.
4. **Critical thinking is the weakest type.** Every poor item this round was Critical thinking. The contract already asks for two relationships and an abstain when the source supports only recall; Opus doesn't abstain on these fixtures. Eight slots per run can't show a prompt fix through the noise, so this needs a larger CT-only fixture set.

## Recommended defaults

| Stage | Model | Effort |
| --- | --- | --- |
| Draft (lean, default) | Opus 5.5 + two human exemplars per slot, v36 option rules | medium |
| Gate | Haiku 5.5 blind solve with the key hidden, plus deterministic checks | medium |
| Reviewed pipeline (`QUESTION_STUDIO_PIPELINE=reviewed`) | Sonnet 5.5 draft, Opus 5.5 review | medium / high |
| Agent pipeline (`QUESTION_STUDIO_PIPELINE=agent`) | Sonnet 5.5 + Haiku blind solve + twin options-only probe | medium |
| Mapping / planning | Haiku 5.5 | low |
| Free-response grading | Haiku 5.5 | low |
| Emoji, RAG tester | Haiku 5.5 | low (emoji: thinking off) |

## Spend

Anthropic credit used: $12.43 offline generation (the ledger keeps 3 interrupted calls at their reservation) + $7.06 judge and probes + $5.63 for 10 live runs + $0.12 exemplar labels = **$25.24**. OpenRouter embeddings for the bank were $0.006.

Round 2: **$17.76** (budget $30). Round 3: **$5.07** (budget $20). Credit used in total: about **$48.10**.

## Reproduce

```sh
bun run eval:questions '[{"draft":"sonnet","review":"sonnet"}]' --repeat=2          # reviewed pipeline
bun run eval:questions '[{"pipeline":"agent","draft":"sonnet","review":"default","verification":"solve","exemplars":"bank"}]'
bun scripts/ai-eval/claude-report.ts question-types-v30                            # free
bunx convex env set QUESTION_STUDIO_PIPELINE agent                                 # dev only: agent in the live Studio
bun run eval:questions '[{"pipeline":"lean","gate":"solve","draft":"opus","review":"opus","exemplars":"bank","draftEffort":"medium"}]' --repeat=2
bun scripts/ai-eval/judge/score-run.ts --label=v35 --async 'tmp/ai-eval/*.question-types-v35.json'   # half-price judge
bun run eval:questions '[{"pipeline":"lean","gate":"solve","draft":"opus","review":"opus","exemplars":"live","draftEffort":"medium"}]' --repeat=2   # production exemplar tiers
bun scripts/ai-eval/studio-live.ts 15 live-v36-default                            # dev only: one live Learn job
```
