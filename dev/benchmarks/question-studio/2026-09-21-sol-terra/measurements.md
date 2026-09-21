# Measured results

New-round token-priced estimate: **$0.809477**; unknown-call reservations: **$0.000000**; combined **$0.809477 / $2 ceiling**. 53 paid calls, 0 failed or unresolved. This is a usage-derived estimate, not an invoice.

## Drafting comparisons

Every draft comparison uses the same compact prompt, schema, source assignment and exclusions for a given source/count; requested rationales are 35–60 words. Each set is also screened by a separate Luna medium call with the writer's key hidden. Raw, local and screened counts are distinct. No repair/top-up calls are hidden in these numbers.

Counts are **generated → locally accepted → automated screen accepted**. Times are **draft / draft + screen**, in seconds. Costs are **draft / draft + screen**, in cents. These are local harness times, not live Studio UI times.

| Source | Model / thinking | Requested / batch size | Counts | Seconds | Cents |
| --- | --- | --- | --- | --- | --- |
| cardio | sol none | 10 / 10 | 10 → 9 → 7 | 30.4 / 56.9 | 5.62 / 6.10 |
| cardio | terra none | 10 / 10 | 10 → 10 → 6 | 17.3 / 52.2 | 3.05 / 3.60 |
| cardio | sol low | 10 / 10 | 10 → 10 → 10 | 41.3 / 67.7 | 6.05 / 6.52 |
| cardio | terra low | 10 / 10 | 10 → 8 → 8 | 30.6 / 46.2 | 3.59 / 3.90 |
| cardio | luna none | 10 / 10 | 10 → 8 → 6 | 12.9 / 40.0 | 0.31 / 0.73 |
| cardio | luna low | 10 / 10 | 10 → 8 → 8 | 13.8 / 28.6 | 0.32 / 0.66 |
| cardio | luna medium | 10 / 10 | 10 → 8 → 6 | 14.7 / 43.3 | 0.32 / 0.78 |
| cardio | terra none | 15 / 15 | 15 → 11 → 11 | 23.8 / 41.8 | 3.75 / 4.12 |
| cardio | terra none | 15 / 5 | 15 → 13 → 13 | 10.3 / 31.7 | 4.56 / 4.98 |
| cardio | terra low | 15 / 5 | 15 → 12 → 12 | 13.9 / 30.2 | 5.17 / 5.56 |
| cardio | sol none | 15 / 5 | 15 → 15 → 14 | 15.4 / 49.6 | 8.57 / 9.18 |
| cardio | sol low | 15 / 5 | 15 → 15 → 14 | 30.6 / 58.1 | 9.86 / 10.39 |
| cardio | luna medium | 15 / 5 | 15 → 11 → 11 | 15.4 / 35.7 | 0.68 / 1.12 |
| retina | terra low | 15 / 5 | 12 → 12 → 12 | 26.4 / 47.6 | 5.79 / 6.22 |
| retina | luna medium | 15 / 5 | 13 → 12 → 10 | 15.6 / 45.9 | 0.60 / 1.12 |

## Paired compact reviewers

The saved draft is reused; only the new reviewer is charged to the experimental ledger. Displayed workflow cost/time is the measured original draft plus the new review. This is a replay estimate, not a second complete live generation. Compact reviewers share the same strengthened prompt and return issue codes instead of long prose.

| Draft run | Reviewer | Accepted / local candidates | Review seconds | Combined seconds | Review cents | Combined cents |
| --- | --- | --- | --- | --- | --- | --- |
| cardio-sol-none-10-b10-w35–60-r1 | luna medium | 6 / 9 | 10.9 | 41.2 | 0.29 | 5.92 |
| cardio-sol-none-10-b10-w35–60-r1 | terra none | 8 / 9 | 2.7 | 33.0 | 1.69 | 7.31 |
| cardio-sol-none-10-b10-w35–60-r1 | terra low | 6 / 9 | 10.7 | 41.1 | 2.19 | 7.81 |
| cardio-sol-none-10-b10-w35–60-r1 | sol none | 8 / 9 | 4.5 | 34.9 | 3.28 | 8.91 |
| cardio-luna-medium-15-b5-w35–60-r1 | luna medium | 10 / 11 | 13.8 | 29.2 | 0.37 | 1.05 |
| cardio-luna-medium-15-b5-w35–60-r1 | terra none | 11 / 11 | 2.6 | 18.1 | 1.80 | 2.48 |
| cardio-luna-medium-15-b5-w35–60-r1 | terra low | 6 / 11 | 16.9 | 32.4 | 2.92 | 3.61 |
| retina-luna-medium-15-b5-w35–60-r1 | luna medium | 6 / 12 | 11.7 | 27.3 | 0.29 | 0.89 |
| retina-luna-medium-15-b5-w35–60-r1 | terra low | 8 / 12 | 21.8 | 37.4 | 3.16 | 3.76 |

## Interpretation limits

Automated acceptance is not clinical accuracy. See [quality inspections](quality-notes.md) for false passes, ambiguity, weak distractors and unsupported rationale claims. Most configurations have one sample; none supports p95 latency or a population-level quality claim. Cardiovascular tests include the existing 59-question exclusion pool; retinal tests have no exclusion pool and contain image-only excerpts. These source fixtures are deliberately imperfect. Missing topics or abstentions must not be filled using unseen images or invented facts.

The sanitized [results file](results.json) includes every call's token/cache usage and conservative cold-write estimates. Raw prompts, lecture excerpts and complete outputs stay in ignored local storage. Prices were checked against official [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) pages on September 21, 2026; Luna uses $0.20/$1.20 per million input/output tokens. Cache reads cost 0.1× input, writes 1.25× input. All requests use the standard service tier, not priority. “None” means no reasoning effort, not priority processing.
