# Question Studio architecture and model sweep

**Historical baseline correction:** subsequent inspection of the user's original Gemini logs found that it already returned 10–15 questions for about 1.19–1.29¢ on average in a 21-batch sample. The recommendation below is the best candidate from this experimental sweep, not proof of an overall improvement over the original system. See [the historical Gemini comparison](historical-gemini.md).

Development experiment on September 20, 2026. **Recommended balance: Luna medium drafting, topic-aligned batches of two, up to eight concurrent workers, and one blind medium-effort reviewer per batch.** The reviewer can correct a draft in the same call. Local source, answer, option-audit and duplicate gates remain enabled. This is a curator-assisted Learn-question configuration; mixed Clinical/Critical Thinking batches have not been validated against this target.

The cost and latency targets are achievable on the tested text source. This is not an established accuracy rate or a guarantee of 15 usable questions from arbitrary material. Sparse/image-only sources yield fewer questions, and manual review still finds weak distractors and occasional scope problems.

## Final live results

See [results.json](results.json) for every captured live run, architecture comparison, model experiment and spend summary. Live wall time runs from job creation through terminal persistence; local replay times exclude Convex overhead.

| Configuration/run | Delivered/requested | End-to-end seconds | Estimated cost |
|---|---:|---:|---:|
| v25, ranked input, cold cache | 15/15 | 30.503 | 2.656¢ |
| v25, 10-question run, cold cache | 10/10 | 20.606 | 1.604¢ |
| v25, 15-question repeat, partial cache | 15/15 | 31.883 | 1.932¢ |
| v26, explicit option/rationale checks, initial live run | 13/15 | 29.691 | 1.942¢ |
| v26, isolated repeat | 15/15 | 25.026 | 1.769¢ |
| v26, final post-conflict-fix, partial cache | 10/10 | 22.052 | 1.377¢ |
| v26, final post-conflict-fix, partial cache | 15/15 | 31.452 | 1.840¢ |

The initial v26 partial run lost a two-question worker to a token-reservation database conflict before any model request. This was not a quality rejection. Rolled-back token reservations, settlements and usage mutations now use bounded conflict retries; provider calls are never retried by that wrapper. Final post-fix live results are recorded in results.json under `final-v26-live-10-r1` and `final-v26-live-15-r3`.

The earlier v25 cold run before input ranking cost 3.077¢ for 15 questions in 22.819 seconds. Ranking the 59 existing-question exclusions and sending only each worker's assigned source reduced repeated input from about 67,700 to 37,800 tokens. Full-module duplicate checks still run after generation. Final v26 adds explicit all-option and teaching-rationale checks without an extra model call.

## Architecture comparisons

All rows request 15 questions from the same cardiovascular/hematology source, pages 3–20. Draft-only and reviewed results reuse the identical drafts, making the check/no-check comparison paired. “Accepted” is an automated gate result, not factual accuracy. The initial architecture sweep used a screening-only reviewer; the recommended pipeline additionally permits corrections inside review.

| Draft architecture | Local survivors | Draft seconds / cents | After independent screening | Total seconds / cents |
|---|---:|---:|---:|---:|
| One call, high effort | 0 | 65.0 / unknown | — | — |
| One call, medium | 10 | 39.1 / 0.666 | 6 | 52.3 / 1.350 |
| Batches of five, high | 14 | 45.9 / 1.871 | 14 | 54.7 / 2.628 |
| Batches of three, high | 14 | 33.9 / 2.177 | 13 | 41.5 / 2.923 |
| One question per call, high | 14 | 20.4 / 2.441 | 9 | 31.4 / 3.410 |
| Compact batches of five, medium | 11 | 15.8 / 0.972 | 8 | 25.0 / 1.628 |
| Compact batches of three, medium | 12 | 11.7 / 1.122 | 11 | 19.0 / 1.750 |
| Compact batches of five, low | 13 | 9.8 / 0.699 | 8 | 19.0 / 1.484 |
| Compact single call, low | 8 | 17.1 / 0.459 | 4 | 29.1 / 1.023 |
| Compact batches of three, high | 14 | 36.0 / 2.228 | 14 | 41.8 / 2.881 |

Skipping checks made the cheapest runs look attractive while preserving ambiguous, unsupported or poorly worded drafts. Per-question high-effort calls repeated too much context. Large batches serialized too much generation. Two-question batches with medium effort and inline reviewer corrections gave the best observed completeness/cost/time balance. Local checks take milliseconds and have no model charge.

## Model comparisons

Six models were exercised. Model comparisons are small, exploratory trials, not a statistically controlled ranking. The two-question alternatives used Luna as reviewer and the earlier exact-quote review format; the later single-call alternatives used a corrected whole-set screening schema. Therefore compare within each row group and do not attribute every difference to the model alone.

| Draft model and system | Accepted/15 | Seconds | Total cents |
|---|---:|---:|---:|
| Luna high + medium review, two-question exact-quote path | 14 | 35.5 | 4.611 |
| Gemini 3.1 Flash Lite high + Luna review, same path | 11 | 32.1 | 6.302 |
| Gemini 3.8 Flash low + Luna review, same path | 12 | 17.1 | 5.171 |
| DeepSeek v4.1 Flash medium + Luna review | 3 | 67.7 | 1.699 known; incomplete |
| Qwen 3.8 Flash medium + Luna review | 0 | 60.0 | unknown |
| GPT-5.4 mini low, single call + whole-set screen | 5 | 36.1 | 2.254 |
| Gemini 3.8 Flash low, single call + whole-set screen | 5 | 45.9 | 2.052 |
| Gemini 3.1 Flash Lite high, single call + whole-set screen | 6 | 45.2 | 1.760 |

The final Luna reference-ID path avoids generated quote transcription in both drafting and corrections; the server attaches exact source excerpts and rejects out-of-scope IDs. Its final local replay returned 15/15 in 17.495 seconds at 2.072¢. A second arteriolar-retina source returned 13/15 in 22.792 seconds at 1.759¢, with two explicit abstentions for image-only assignments. Those are replay timings, not live job timings.

## Accuracy and rationale findings

- The source is course material, not a medical gold standard. Page 6 contains conflicting duration ranges; page 7 has ambiguous disease/population scope; page 20 contains treatment indications that are not independently validated as current guidance. Citation matching alone cannot settle these issues.
- Manual inspection of v25 caught overlapping BRAO symptom answers and multiple defensible carotid-treatment indications despite a passing model verdict. The v26 reference reviewer must report every defensible answer index; the backend requires exactly one matching the key. It must also affirm that the rationale teaches a supported relationship beyond restating the answer. These fields make failure states enforceable, but cannot prevent a mistaken reviewer from passing them.
- Manual source comparison of all 15 candidates in `final-v26-live-15-r2` found no definite answer-key mismatch. Six candidates still had weak, conspicuously long or implausible alternatives (zero-based indices 3, 5, 6, 9, 10, 11); candidate 8 converted an uncertain source annotation into a firm rationale claim. This is a qualitative audit by the coding agent, not a blinded clinician evaluation. Do not convert the automated 15/15 count into “100% accuracy.”
- An earlier v26 replay still overgeneralized a disease-specific stroke statistic, and same-family review sometimes stripped useful rationale content. The final rationale check improves the contract but does not establish elimination of these errors. Curator review remains necessary.
- Cross-worker semantic duplication is only partially covered by lexical duplicate checks. A batch of individually good questions can still repeat a central concept. Whole-set model screening sometimes detects this, but added latency/cost and rejected useful material in these trials.

## Measurement and reproducibility

Run instructions are in [STUDIO_MATRIX.md](../../../../scripts/ai-eval/STUDIO_MATRIX.md). Raw prompts, source fixtures, candidates, returned usage, events and budget reservations stay in ignored `tmp/studio-matrix/`; this report retains aggregate metrics without course text or credentials. Costs use returned usage and standard rates for OpenAI, and reported route cost for OpenRouter. They are estimates, not billing invoices; OCR/upload and hosting are excluded. Cold and cached runs are distinguished. Timed-out calls with missing usage are unknown, never free.

Three initial `*-review15` experiments accidentally inherited a three-review schema maximum. Their whole-set quality results are invalid; draft metrics remain usable. The schema was corrected before the single-call model comparisons. Some architecture-run inline cost summaries were stale; the durable aggregate reconciles them against the per-call spend ledger.

Validation: `bun run test` passed 63 Bun tests and 51 Vitest tests; `bun run check` reported zero errors/warnings; `git diff --check` passed; development deployment typechecking passed. The development source revision and all 59 existing module questions were independently read back unchanged. No candidate was saved to the module, no question was published, and production was not deployed. Creating development jobs dismisses that actor's prior jobs through normal application behavior.

Pricing references checked during the experiment: [Luna model](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), and the [OpenRouter model catalog](https://openrouter.ai/api/v1/models). Preserve observed route costs rather than repricing past trials from a future catalog.
