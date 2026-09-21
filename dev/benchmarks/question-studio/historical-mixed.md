# Question Studio latency comparison — September 20, 2026

Same model (`openai/gpt-5.6-luna`), document revision, pages 3–20, destination Testing Module, 59 existing questions, and request for 12 Learn + 3 Clinical questions. All runs used development deployment `rightful-crane-34`; no generated questions were saved into the module or published. These were historical, unsaved benchmark candidates.

## Measurements

Wall time is server job creation through completion, including planning, worker queues, model calls, review, repairs, and finalization. Accepted means passed the application’s automated gates, not independently established clinical correctness.

| Run | Wall time | Accepted / 15 | Learn / Clinical | Repair calls | Worker model calls | Worker model cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Original baseline](2026-09-20-baseline/summary.json) | 118.147 s | 11 | 8 / 3 | 5 | 18 | $0.0290801 |
| [High reasoning, corrected accounting](2026-09-20-high-2/summary.json) | 58.856 s | 12 | 9 / 3 | 2 | 13 | $0.02476626 |
| [Repeat, refund cap included](2026-09-20-high-3/summary.json) | 46.625 s | 14 | 11 / 3 | 4 | 17 | $0.02600982 |

The two corrected runs averaged **52.741 seconds, 55.4% below baseline**. Individually they were 50.2% and 60.5% faster. Both had a warm page-plan response cache and warm prompt prefixes. This is a small repeated-input benchmark, not a cold-cache latency guarantee or an isolated experiment proving the contribution of higher reasoning alone. The baseline itself was only one run. Final implementation cold-cache performance remains unmeasured.

Planning measured 12.222 seconds on the first response-cache miss, then 0.259 and 0.312 seconds on hits. The two corrected runs reported 47,478 / 54,759 and 60,716 / 70,105 input tokens served from the prompt cache. Question and review completions were generated fresh; response caching is explicitly disabled for those calls. Provider/model latency still varies.

The baseline did not meter planning tokens or cost. New runs meter planning tokens and latency, but planning cost is still unavailable through the current integration. Worker cost above is comparable; do not present it as whole-run cost. Aggregate model latency sums overlapping calls and is not wall time.

## Changes measured

- Five bounded worker lanes instead of two, with deterministic tail ownership for larger runs.
- A compact, type-specific page plan instead of regenerating the full document catalog. The plan sees existing-question exclusions and only selected pages.
- High reasoning for drafts of all question types; independent answer review remains high reasoning.
- Stable source prefixes and a source-revision session ID for OpenRouter prompt caching/sticky routing. Identical page plans use an explicit one-hour response cache.
- Removed unused generated self-assessment fields. Improved instructions for contiguous quotations and checking every option before returning a draft.
- Allowed plausible incorrect alternatives absent from the source, while requiring source support for the answer and substantive rationale. Bare “listed as” no longer fails the wording gate. Citation validity, source boundaries, single-best-answer checks, question-type checks, and duplicate checks remain.
- Added cache token accounting and explicit repair-reason events.
- Corrected token reservations: reserve before spending, reconcile successful calls to actual input plus output, preserve failed-call allowance, avoid double-charging the page planner, and cap refunds after time-based refill. User/global limits themselves are unchanged. Reservation of both buckets is atomic.

Latest run needed four single-slot repairs: one implausible distractor, one source-framing phrase, and two invalid supporting quotes. Three recovered; one quote mismatch remained withheld. The earlier corrected run recovered one of four repair slots and withheld three. See each run’s `events.json` and `workerNotes`; the original nine repair slots are documented in [repair-audit.md](2026-09-20-baseline/repair-audit.md).

## Intermediate attempts retained

- [Optimized attempt 1](2026-09-20-optimized-1/summary.json): 59.769 seconds, only 8 Learn questions. The first compact planner failed to preserve the requested Clinical allocation. Not counted as a successful comparison; typed planning fixed this.
- [High reasoning attempt 1](2026-09-20-high-1/summary.json): 44.633 seconds, 10 accepted. Local rate-limit reservations prevented review/repair completion. Not counted as a successful comparison; reservation reconciliation fixed this.

Each run directory includes job data, event data, computed metrics, and source-file hashes. `job-initial.json` captures an early snapshot, not necessarily the instant before workers began. `manifest.json` records the local code at final capture. The only application change between the last two runs was capping refunds at bucket capacity.

## Verification

- `bun run test`: 50 Bun tests and 40 Vitest tests passed.
- `bun run check`: zero errors and zero warnings.
- `git diff --check` and formatting checks passed.
- Development deployment completed successfully. Browser read-back confirmed 14 ready candidates, the original page/type selection, all five workers complete, and budget display capped at 100%.
- Matching input identifiers, source revision, model, selected pages, counts, and destination were checked against baseline artifacts.

Capture another known development job with:

```sh
bun dev/benchmarks/question-studio/capture.ts JOB_ID OUTPUT_DIRECTORY
```

Caching references: [OpenRouter prompt caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching), [response caching](https://openrouter.ai/docs/guides/features/response-caching).
