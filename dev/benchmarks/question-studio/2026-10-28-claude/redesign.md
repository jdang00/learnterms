# Question Studio redesign proposal: blueprint, write, audit, select

Date: 2026-10-28. Status: proposal. Nothing here is implemented yet beyond the v29 pieces noted below.

## Why the current harness has hit its ceiling

The pipeline is **draft → critic → patch**: one model writes a finished question, a second model judges it, and failures are either rewritten by the reviewer (the fast Learn path) or sent back for one repair (the general path). Every v27–v29 change tightened the critic. The live runs on the same 18 cardiovascular pages and the same Testing Module show what that buys:

| Run | Prompts | Kept / 15 | Spend | $ per kept | Wall time |
| --- | --- | --- | --- | --- | --- |
| Live 1 | v28, Sonnet draft + Opus review | 15 | $0.65 | $0.044 | 36 s |
| Live 2 | v29, Sonnet + Sonnet, no fast repair | 7 | $0.28 | $0.040 | 16 s |
| Live 3 | v29, Sonnet + Sonnet, one fast repair | 8 | $0.45 | $0.056 | 27 s |

v29 rejected the defects v28 let through, such as a 2×2 option grid ("painful/painless Horner's × contralateral/ipsilateral signs") and a "which condition is grouped with…" classification stem. **But the questions it kept have weaker wrong options than v28's**, because the reviewer patches its way to a passing item:

- Live 3 #3, on retinal migraine, offers "It is the first diagnosis to make because it is the most dangerous cause" and "It is excluded whenever any pain accompanies the vision loss". Both are throwaways a learner can eliminate without knowing the concept, and the stem ("Which statement… is supported?") is source framing in disguise.
- Live 3 #5, on duplex ultrasound, offers "It is used only to assess cardiac chamber function" and "It has higher resolution than MRA or CTA".
- Live 3 #4, on cilostazol, mixes categories: a drug action, a statin effect, a surgery, and an angiotensin blocker it calls an "ACE receptor blocker", which is a factual slip.
- Compare v28 #2 and #3 (embolus appearance) and #11 (ophthalmic artery ERG). There every wrong option was a real neighbor in the same category, and each failed for one specific fact.

The pattern is structural, not a prompt bug:

1. **Wrong options are decided last.** The writer chooses them while composing the whole item, and the critic can only remove them. Patching for "no grid" or "no option excluded only by the key" pushes toward safe, generic statements, which are the opposite of near misses.
2. **The reviewer rewrites.** On the fast Learn path, 12 of 15 v28 questions and most v29 questions were rewritten by the reviewer, so the drafter's plan is discarded. In live 3, those replacements are the weak items.
3. **Rejection is the only lever.** Yield falls as the bar rises: 15 → 7 → 8. A curator asking for 15 gets 8 with no indication why.
4. **The eval measures acceptance, not quality.** Acceptance rewards a lenient reviewer (Sonnet/Sonnet accepted 8/12, including a decorative vignette both Opus configs rejected) and punishes a strict one. Twelve slots with one objective each cannot separate configurations.
5. **Duplicates are found late.** The live runs drafted, reviewed and paid for items that the reviewer then rejected as repeats of the module's 71 existing questions.

## Proposed pipeline

```
plan (deterministic) → blueprint (Sonnet, low effort) → validate blueprint (code)
  → write k variants (Sonnet, medium) → local checks (code)
  → audit (Sonnet for Learn, Opus for Clinical/CT; blind solve + elimination map)
  → select best passing variant per slot (code) → fill to count from spare slots
```

### 1. Blueprint before prose

For each slot, the model first returns a small structured plan:

- `rule`: the mechanism, relationship or decision being tested. It must not be a list membership or a label.
- `shape`: one of a fixed library taken from the curator exemplars. Learn: mechanism → effect, test purpose, threshold tied to a use. Clinical: diagnosis from findings, contraindication from a comorbidity. Critical thinking: infer then apply a constraint, or two parallel causes separated by timing.
- `discriminators`: the stem facts that decide the answer, plus the pertinent negatives that rule out the closest alternatives.
- `confusions`: exactly three wrong answers from the key's category. For each, give the misconception it targets and the **fact that excludes it**, with a citation ID or a stem discriminator.
- `existingOverlap`: the closest existing module question and why this one differs.

Code validates the blueprint before any prose is written:
- Every exclusion cites an assigned excerpt or a stated discriminator.
- All three confusions share the key's category.
- The shape matches the slot type.
- No confusion simply crosses two features.

That moves distractor quality, grid avoidance, classification-stem avoidance and duplicate avoidance to the cheapest point in the pipeline. A blueprint is about 150 output tokens, compared with roughly 1–3K for a full item plus its rewrite.

### 2. Write from the blueprint, several times

The writer turns one blueprint into stem, options and rationale. The rationale is the blueprint's rule plus its exclusions, so it can't drift into padding or rubric vocabulary. It writes **k = 2 variants per slot** (or draws spare slots from the plan). Variants of one blueprint share a prompt prefix, so the second costs mostly output tokens. The v29 local checks in `checks.ts` (rubric vocabulary, feature grids, length cue, all/none, rationale length) run on every variant.

### 3. Audit, don't rewrite

The auditor never sees the key or the blueprint and never writes a replacement. It returns:
- `solvedIndex`: a blind solve.
- `eliminations[]`: for each option it rejects, the stem fact or citation that rules it out.
- `defensibleIndices[]`: every option it can defend.
- Type checks, including which stem detail is necessary for Clinical and Critical thinking.

Code accepts a variant only if the blind solve matches the key, exactly one option is defensible, and every wrong option has an elimination. That is the deterministic form of what the reviewer prompt now asks for in prose. Opus audits Clinical and Critical thinking, because it caught the decorative vignette Sonnet passed. Sonnet audits Learn.

### 4. Select and fill

From the passing variants, keep one per blueprint by audit margin and by distance from existing questions. If fewer slots pass than requested, use spare blueprints from the plan, as far as the deadline allows. That replaces "repair once and hope" with predictable yield. Curators always see the count and the top rejection reason per topic, which the existing coverage panel can show.

### 5. Model and cost shape (estimate from measured token counts)

| Stage | Model | Effort | Calls per 15 Learn |
| --- | --- | --- | --- |
| Blueprint | Sonnet | low | 8 (batched per worker) |
| Write ×2 | Sonnet | medium | 8 (two variants per call) |
| Audit | Sonnet (Learn) / Opus (scenario) | medium | 8 |

The estimate is about $0.30–0.40 per 15 Learn questions, close to the v29 live runs. Spend moves from rewriting to selection. Haiku stays on planning, grading, emoji and RAG chat. It isn't used for writing: it accepted 6/12 and 5/12 in v27, and its rationales were the most padded.

### 6. Cache layout

The schema is part of the prompt prefix, so draft→review never shared a cache entry in any run. The new layout:
- One worker-level system prefix (contract plus source) per model.
- The blueprint and write calls share a model. A single "item" schema with a `stage` discriminator lets them share a prefix too.
- The auditor caches only when it audits more than one batch for the same source.

v29 already sets `cache: false` on single-use calls, which removes the 1.25× write premium the first live run paid on 54K tokens with zero reads.

## Eval redesign (do this first)

Without it, every change is judged by acceptance, which is the wrong target.

1. **Labeled anchor set.** The 13 curator exemplars, plus 30 labeled generated items: the v28/v29 live items above, labeled good or bad with the failing rubric criterion, which I can pre-label for you to correct.
2. **Calibrated judge.** An Opus rubric judge over the 12 criteria in `human-exemplars.md`. Trust it only once it agrees with the anchor labels, measured as agreement per criterion.
3. **Cue probes, cheap and objective:**
   - *options-only:* Haiku sees the options without the stem. A solve rate well above 25% means length, grammar or grid cues give the key away.
   - *cover test:* Haiku sees the stem without options and writes an answer, which is scored against the key. A low match means the stem isn't a complete question.
4. **Bigger fixture.** The 4 documents × 6 objectives, run twice: 48 slots per configuration.
5. **Report.** For each configuration: yield, judge score, cue-probe rates, $ per *good* question (judge-passing), and latency.

## Order of work

1. Build the eval (anchor labels, judge, probes) and measure v28 against v29 on it. That tells us whether v29's stricter bar is a net gain. *(about half a day, about $3)*
2. Blueprint and write: replace the draft prompt, keep the current reviewer, and compare. *(about one day, about $3)*
3. Switch the auditor to the no-rewrite format and add select-and-fill. Remove the fast Learn replacement path.
4. Keep the per-type reviewer split and `checks.ts` throughout.

## What stays from v29 either way

- `checks.ts`.
- The per-stage model and effort policy (`StagePolicy`), the `canRepair` deadline gate, conditional caching, and schema-bound clipping.
- The Sonnet drafter and the per-type reviewer split.
- The human-exemplar rubric.

One v29 rule should change now. "Exclude each wrong option with its own stated finding" conflicts with "wrong options need not appear in the source", and live 3 shows the reviewer rejecting options for not being in the source. The blueprint resolves that conflict by naming each exclusion explicitly.
