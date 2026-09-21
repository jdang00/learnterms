# Original Gemini system: historical evidence

Read directly from the user's authenticated Chrome Google AI Studio on September 20, 2026, after the architecture sweep. This evidence qualifies the earlier recommendation: **the new pipeline has not been demonstrated to be an overall improvement over the original Gemini implementation. The original already met the cost target in the inspected sample.**

## Coverage

- Selected project: Gemini API, `gen-lang-client-0385469063`.
- [Spend dashboard](https://aistudio.google.com/spend?project=gen-lang-client-0385469063): 90 Days selected, June 23–September 20, 2026; **$3.65 total cost**, $0.00 savings. This is project-wide spend, not a cost-per-question denominator.
- The usage dashboard showed Gemini 3 Flash activity. Daily tables were not fully extracted; do not report a complete 90-day request count from this audit.
- [Logs](https://aistudio.google.com/logs): 83 retained entries, August 2–September 15. Captured the 21 most recent entries, covering August 14, August 16 and September 15, containing **235 generated questions**. This is a recent convenience sample, not a random or complete 90-day quality audit.
- Log traversal stopped when AI Studio displayed `Failed to list models: user has exceeded quota. Please try again later.` No generation was requested during this read-only audit.
- No elapsed-request or end-to-end job duration was exposed in the inspected log detail. Creation timestamps and intervals between manual requests are not generation latency.

## Original implementation and observed completeness

All 21 captured requests used `models/gemini-3-flash-preview`, HIGH thinking, temperature 0.7, an 8,192-token output limit, and a single structured JSON-array generation call. The supplied source was a short manually selected course excerpt. Instructions requested mixed recall, understanding, application and critical thinking, including multiple-answer questions. The schema allowed 3–6 choices and multiple correct indices. There was no citation/provenance field or separate review call visible in these requests; this does not rule out downstream application checks.

Every captured output returned the requested count: sixteen batches of ten and five batches of fifteen. Of the 235 questions, 85 had multiple correct answers. Count completeness is not verified correctness or saved-question acceptance. The new benchmark was single-answer Learn-only and used a broader 18-page source, existing-question exclusions, and explicit independent review, so this is not a controlled model comparison.

## Estimated cost of captured calls

Repriced from observed usage at [Google's published Gemini 3 Flash Preview Standard rates](https://ai.google.dev/gemini-api/docs/pricing#gemini-3-flash-preview): $0.50 per million text-input tokens and $3.00 per million output tokens **including thinking**. These per-call figures are estimates, not historical billing attribution. Fifteen September logs omitted `promptTokenCount` and the UI displayed zero input tokens; input was inferred as total minus candidate-output minus thinking tokens. The six August logs explicitly reported input tokens. No cache adjustment or batch discount was assumed.

| Original batch | Sample size | Returned/requested | Mean cost | Range |
|---|---:|---:|---:|---:|
| 10 questions | 16 | 160/160 | **1.191¢** | 0.677–1.888¢ |
| 15 questions | 5 | 75/75 | **1.293¢** | 1.002–1.863¢ |

Sample estimated total: 25.52015¢. Historical project spend over 90 days is separately $3.65; the sample does not cover all of it. For comparison, the final new live runs delivered 10/10 for 1.377¢ and 15/15 for 1.840¢, with partial input caching. An earlier new-pipeline cold-cache 15/15 run cost 2.656¢. These observations do **not** support calling the new setup cheaper than the original.

## Qualitative findings

The original rationales averaged **30.52 words** across 235 questions. Short did not uniformly mean weak: reviewed examples explained the mechanism of ALT, distinguished goniotomy from bleb/tube procedures, and contrasted RPE hyperplasia with CHRPE. Multiple-answer items often covered several related concepts efficiently. Some longer new rationales offer useful teaching context, but word count is not a quality score.

The older output also had weaknesses shared with the new pipeline:

- A posterior-PFV vignette directly supplied leukocoria, microphthalmia and a clear lens, then asked the learner to select those same findings. It looked clinical but mostly tested repetition.
- Several distractors were giveaway opposites or conspicuous absolutes, such as benign versus malignant or an option made wrong by “always.”
- Source ambiguity could be carried into confident explanations. A cystoid-degeneration excerpt mixed “most evident” inferior/temporal wording with “most common” superior-temporal wording; the generated answer chose a definitive location without surfacing the distinction.
- The “opaque vascularization” wording in a bleb question closely reproduced questionable source phrasing. This demonstrates why source fidelity alone does not establish clinical accuracy.
- Named trial/mnemonic references were present. These are not automatically inappropriate source framing; a blanket regex would falsely flag legitimate educational content.

These are qualitative source comparisons, not a blinded clinical accuracy assessment. Both systems can produce good questions and both need curator review. The new pipeline has stronger explicit provenance, duplicate checks, a blind answer review, an all-option audit and a teaching-rationale check, but the earlier manual audit shows those safeguards still miss defects.

## Revised judgment

Keep the new infrastructure as a development candidate, but retain the original Gemini system as a serious baseline. The evidence supports better observability and explicit checking, **not established superiority in cost, speed or educational quality** over the original. A fair next evaluation should replay the actual original prompt/model and the new system on identical excerpts, counts and question types, and blind-grade keys, ambiguity, distractors and rationales. No additional paid comparison calls were made in this historical audit.
