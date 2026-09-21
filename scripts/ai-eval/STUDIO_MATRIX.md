# Studio architecture and model experiments

Run with Bun. These are paid development experiments, not publishing commands. Raw sources, questions, per-call usage, provider IDs and spend reservations are kept under ignored `tmp/studio-matrix/`. The experiments use a shared exclusive lock and a $2 ceiling; failed calls with unknown cost retain their reservation. Live Convex jobs are accounted separately by their job usage. No candidates are saved to a module by these scripts.

## Fixtures

The September 20 experiment reads the development cardiovascular/hematology source, pages 3–20, and the Testing Module's 59 existing-question exclusions. Capture these before running:

- `context.json`: `questionStudio:getGenerationContext` for the authorized curator, document and destination.
- `pages-a.json`, `pages-b.json`: `questionStudio:getSourcePages` at offsets 2 and 14, as that curator.
- `models.json`: selected model IDs, capabilities and prices from `https://openrouter.ai/api/v1/models`.

These files contain course material and stay local. Credentials are read directly from the development Convex environment and are never written to artifacts. Verify `.env.local` points to development and no deploy-key override is active before running.

```sh
bun scripts/ai-eval/studio-matrix.ts
bun scripts/ai-eval/studio-matrix-report.ts
MATRIX_EFFORT=medium MATRIX_REPEAT=4 bun scripts/ai-eval/studio-verified.ts
MATRIX_EFFORT=medium MATRIX_COUNT=10 MATRIX_REPEAT=4 bun scripts/ai-eval/studio-verified.ts
MATRIX_EFFORT=medium MATRIX_SOURCE=retina MATRIX_REPEAT=4 bun scripts/ai-eval/studio-verified.ts
```

The retina fixture uses cached OCR from `tmp/ai-eval/manifest.json`, pages 63–80 of the arteriolar-disease lecture. It deliberately contains image-only pages. The source does not always support the requested count; abstentions and duplicate rejection are useful outcomes, not errors to conceal.

For a model comparison, add `MATRIX_MODEL=google/gemini-3.8-flash` (or another captured catalog ID). Only drafting changes model; Luna remains the reviewer. `MATRIX_SINGLE=1` compares a single large drafting call followed by whole-set screening. Leave this unset for topic-aligned two-question workers with inline reviewer corrections. `MATRIX_REPEAT` must be new; existing results are never overwritten. Changing source prompts or options requires a new repeat ID.

`studio-matrix.ts` compares one call for 15 questions, batches of 5 or 3, one question per call, high/medium/low effort, compact/full prompts, and topic-aligned batches. Raw count, local-gate count and independent-review count are separate metrics. The paired check/no-check comparison reuses identical drafts; no extra drafting call is needed to measure the effect of checks. Local gates take milliseconds and have no model charge.

The first experimental whole-set reviewer inadvertently retained the three-item maximum from the base Zod array. Its three `*-review15` runs are invalid as whole-set quality measurements. The corrected schema constructs a new array. Their draft timing/cost remains usable; never report 3/15 as a quality result. Corrected single-call model experiments enforce and record every returned review.

## Live validation

`studio-live.ts` is restricted to `dev:rightful-crane-34`. It creates a generation job in the existing development Testing Module, runs the actual public action, polls to terminal status, and independently reads back candidates, events and usage. Creating a job has the application's normal effect of dismissing that user's previous generation jobs. It does not save or publish questions.

```sh
bun scripts/ai-eval/studio-live.ts 15 final-live-15-r2
bun scripts/ai-eval/studio-live.ts 10 final-live-10-r1
```

Replay timing excludes source loading, Convex scheduling and persistence. Live timing is `completedAt - createdAt`, including those stages. OpenAI costs are estimates from returned token usage and standard rates, including cache writes. OpenRouter comparisons use returned route costs. OCR/upload costs and hosting are outside generation totals. Missing usage is unknown, not zero.

Automated acceptance is not an accuracy percentage. Inspect keys, scope qualifiers, distractors, every substantive rationale claim, and concept duplication. An independent same-family reviewer can share errors or rewrite a good explanation into a worse one. Keep manual findings distinct from model verdicts.

The final v26 Learn reviewer also returns `defensibleAnswerIndices` for every option that satisfies the literal stem, and `teachingRationale` for a supported explanation beyond restating the answer. The backend requires exactly one defensible index matching the final key, plus a passing rationale check. These are model judgments enforced mechanically, not a gold-standard accuracy test.

The complete September 20 findings, manual quality limitations and aggregate results are in [the architecture sweep report](../../dev/benchmarks/question-studio/2026-09-20-architecture-sweep/README.md).

The [September 21 Sol/Terra report](../../dev/benchmarks/question-studio/2026-09-21-sol-terra/README.md) adds matched none/low-thinking tests, parallel batches of five, two lecture fixtures and compact cross-model checks. It uses `studio-sol-terra.ts` with its own persistent $2 ledger. `studio-sol-terra-report.ts` makes no paid calls and recomputes costs from individual provider records; use its aggregate results instead of the raw experiment summary cost fields. Quality findings prevented a default-model switch.
