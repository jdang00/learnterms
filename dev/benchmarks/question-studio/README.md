# Question Studio: 15 Learn questions: quality and latency benchmarks

**Superseded implementation:** see the [September 20 architecture and model sweep](2026-09-20-architecture-sweep/README.md) for the current medium-effort, two-question, independently reviewed Learn path. The high-effort single-call description and results below are historical.

Development only: `rightful-crane-34`. No benchmark questions were saved to the module or published. OpenRouter credentials and unrelated OpenRouter integrations remain unchanged.

The implementation at the time of these historical runs used official OpenAI `gpt-5.6-luna`, **high reasoning**, and **Standard processing only**, per the user’s final cost preference. Fast mode was tested and removed. The current comparison tests one worker handling 15 questions and two workers split 10 + 5. Each worker makes one paid draft call; local citation-ID, answer-structure, provenance, and duplicate checks follow. Exact source excerpts are attached by the backend, eliminating model-generated quote transcription. There is **no separate AI answer review** for this fast Learn path; the candidate UI says so. Other question types retain independent review.

The user requested more thoughtful high-yield questions, meaningful alternatives, and substantive rationales. The prompt now targets useful distinctions, mechanisms, associations, and common misconceptions, with roughly 65–110 words when supported rather than an answer restatement. It prohibits tautological stems, unrelated alternatives, overlapping numeric thresholds, and questions that confuse a source label with medical truth. A longer rationale by itself is not proof of quality.

## Comparable 15-Learn runs

Same cardiovascular/hematology document revision, pages 3–20, Testing Module, and existing-question exclusions. Wall time is job creation through terminal status, including preparation and final checks. “Candidates” counts stored drafts; a failed run with stored drafts is **not a successful full batch**. Costs use published rates and observed usage, not billing invoices. Aborted requests may still incur charges; missing usage is marked incomplete, never assumed free.

| Run | Model | Wall seconds | Candidates / requested (status) | Calls | Estimated cost |
|---|---|---:|---|---:|---:|
| [2026-09-20-learn-fast-1](2026-09-20-learn-fast-1/summary.json) | openai/gpt-5.6-luna | 26.931 | 14/15 (ready) | 10 | ~$0.02218 |
| [2026-09-20-openai-1](2026-09-20-openai-1/summary.json) | gpt-5.6-luna | 26.977 | 15/15 (ready) | 10 | ~$0.02363 |
| [2026-09-20-openai-2](2026-09-20-openai-2/summary.json) | gpt-5.6-luna | 31.543 | 15/15 (ready) | 10 | ~$0.02364 |
| [2026-09-20-openai-3](2026-09-20-openai-3/summary.json) | gpt-5.6-luna | 23.243 | 10/15 (ready) | 13 | ~$0.01775 |
| [2026-09-20-openai-4](2026-09-20-openai-4/summary.json) | gpt-5.6-luna | 20.880 | 13/15 (ready) | 14 | ~$0.01418 |
| [fast-high-1](fast-high-1/summary.json) | gpt-5.6-luna | 24.148 | 13/15 (ready) | 8 | ~$0.05538 |
| [fast-high-2](fast-high-2/summary.json) | gpt-5.6-luna | 25.656 | 13/15 (ready) | 8 | ~$0.05302 |
| [robust-high-1](robust-high-1/summary.json) | gpt-5.6-luna | 30.009 | 0/15 (failed) | 3 | incomplete: ~$0.00000 |
| [robust-high-2](robust-high-2/summary.json) | gpt-5.6-luna | 28.740 | 6/15 (ready) | 5 | incomplete: ~$0.00598 |
| [robust-high-3](robust-high-3/summary.json) | gpt-5.6-luna | 29.007 | 13/15 (failed) | 7 | ~$0.01809 |
| [robust-high-4](robust-high-4/summary.json) | gpt-5.6-luna | 27.831 | 12/15 (ready) | 8 | incomplete: ~$0.01861 |
| [single-high-1](single-high-1/summary.json) | gpt-5.6-luna | 29.279 | 0/15 (failed) | 1 | incomplete: ~$0.00000 |

The original 118.147-second baseline requested **12 Learn + 3 Clinical**, so it is not an apples-to-apples comparator for the later 15-Learn target. See [historical mixed-type comparison](historical-mixed.md) and [original repair audit](2026-09-20-baseline/repair-audit.md).

## Important findings

- One worker at high reasoning did not finish 15 questions before the deadline. Richer five-question batches also timed out; three-question batches were inconsistent.
- Two-question batches exposed a real lost-worker bug: simultaneous `claimWorker` updates exhausted Convex optimistic-concurrency retries. Bounded retries now cover only rolled-back claims, never provider calls. Evidence is in [the captured conflict log](robust-high-3/conflict-evidence.json).
- The citation-ID version removes quote copying from the model output: unknown or out-of-scope IDs are still rejected, while exact excerpt text comes from the loaded source.
- Fast-mode trial 1 generated all 15 within 24.148 seconds, but the local wording gate withheld two. “This source–composition relationship” and “these sources” referred to embolic sources; they were false positives for document references. The corrected gate retains explicit document-narration checks.
- Source prefixes and exclusions stay stable for prompt caching. Reservations use a tokenizer estimate plus schema/output allowance; actual usage is reconciled. Durably scheduled telemetry avoids HTTP ingestion on the generation critical path.

## Deadline and observability

The user subsequently raised the target to **45 seconds**. Learn-only runs up to 15 use that end-to-end budget measured from job creation. Provider calls stop by about 42 seconds, and a scheduled terminal timeout at 44 seconds leaves room for persistence and delivery. Mutations reject late writes independently of scheduler timing. This bounds processing; it cannot guarantee 15 correct questions from an arbitrary source or eliminate provider/network failures. Actual wall time is logged, never clamped to hide misses.

OpenAI requests use stored completions with job, stage, worker, and harness metadata. A restricted key was created in the LearnTerms OpenAI project and configured only in the Convex development environment. Secret values are not in these artifacts.

PostHog project **92871** receives content-free `$ai_generation` spans and a job-level `$ai_trace` with wall time, count, target success, model, provider, actual service tier, cache tokens, reasoning tokens, reservation wait, estimated cost, errors, and provider identifiers. Trace identity is the job ID, allowing exact linkage. Prompt and question bodies are not sent to PostHog. Read-back files are retained beside verified runs.

## Verification

- `bun run test`: 59 Bun + 51 Vitest tests passed.
- `bun run check`: zero errors or warnings.
- `git diff --check`: passed.
- Development deployment and live browser runs verified; production untouched.

References: [OpenAI Fast mode](https://developers.openai.com/api/docs/guides/fast-mode), [pricing](https://developers.openai.com/api/docs/pricing), [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [PostHog AI observability](https://us.posthog.com/project/92871/ai-observability/traces).
