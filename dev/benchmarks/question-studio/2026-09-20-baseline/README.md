# Question Studio baseline — September 20, 2026

One live, unmodified current-model run requested 15 questions and finished in **118.147 seconds**, returning **11 reviewable candidates** (8 learn, 3 clinical). This is a partial-output baseline, not a successful 15-question completion. The 50% wall-time target is **59.074 seconds**, with yield and quality preserved or improved.

## Reproduction inputs

- Development deployment: `rightful-crane-34`; frontend: `http://localhost:5173/admin/question-studio`.
- Job: `n571dep975cvjse81jzaq381k98evrg6`.
- Model: `openai/gpt-5.6-luna`; harness: `question-types-v6`.
- Source: `Cardiovascular, hematologic revised version`, document `kd7chy2bbpngn3rv6ejh4x5f7n8erdnm`; source indexed timestamp `1789926394236`.
- Page mode, pages 3–20 inclusive; no focus notes.
- Requested mix: 12 learn / 3 clinical / 0 critical thinking.
- Destination: Testing Module, `js70qm41mmx7wh5f7j0p03zynd894hrq`; 59 existing questions used for duplicate context.
- Draft reasoning: low for learn, medium for clinical; independent review: high.
- Five workers of three requested questions each, dispatched in two sequential lanes.
- Click: `2026-09-21T02:22:00.998Z`. Server job timestamps define the baseline duration; click-to-server-completion was 118.418 seconds.
- Code revision and SHA-256 hashes are in `manifest.json`. No application code or model configuration changed for this run.

## Timing

| Measurement | Seconds |
| --- | ---: |
| Job creation to first worker start | 24.255 |
| Selected-page planning interval, within setup | 22.500 |
| First worker start to last worker finish | 93.486 |
| Finalization after last worker | 0.406 |
| Total job wall time | 118.147 |
| First reviewable worker result | 50.831 |
| Wall time per returned candidate | 10.741 |

The planning interval is bounded by the `Selected pages` and `Prepared context` events. It includes page-planning model work and surrounding orchestration, not a directly instrumented provider latency.

| Worker index | Duration (s) | Returned / requested |
| --- | ---: | ---: |
| 0 | 26.576 | 3 / 3 |
| 1 | 59.404 | 3 / 3 |
| 2 | 20.149 | 2 / 3 |
| 3 | 23.547 | 0 / 3 |
| 4 | 46.361 | 3 / 3 |

## Recorded worker model usage

| Stage | Calls | Summed call latency (s) |
| --- | ---: | ---: |
| Draft | 5 | 45.218 |
| Review | 5 | 71.716 |
| Repair | 5 | 38.411 |
| Review repair | 3 | 15.750 |
| Total | 18 | 171.095 |

These are summed latencies across concurrent workers, so they must not be added to wall time. Worker durations sum to 176.037 seconds; their difference from model-call latency is 4.942 seconds of aggregate non-model worker time. That difference excludes setup and inter-worker scheduling gaps and is not a direct estimate of potential wall-time savings.

Recorded worker usage: 33,484 input tokens, 17,294 output tokens (including 9,033 reasoning tokens), $0.0290801, and zero failed provider calls. **Page-planning calls, tokens, and cost are absent from job usage**, so these are not full-run totals. No additional calls were made just to fill the missing four questions.

## Output and interpretation

All five workers needed a repair pass. One learn item remained withheld for source framing; one three-item learn worker ultimately returned no questions and cited existing-question coverage in its truncated diagnostic. The final mechanical gate rejected no additional candidates. Automated acceptance is not an independent human quality audit.

The run finished as `Partial ready: 11/15 candidates to review.` Both the backend read-back and browser UI showed 11 candidates and five completed workers. All 15 event records were captured. Generated candidates remain in the review run; they were not saved into the module or published, preserving the module's duplicate context for the next comparison.

Small bookkeeping changes alone cannot plausibly halve this baseline: nearly all worker duration was spent in model requests. Candidate optimization targets are selected-page planning, two-lane scheduling, and avoidable repair calls. Merely launching all five workers together would still leave the observed slowest worker at 59.404 seconds plus setup; it would not reach the 59.074-second target under unchanged call durations. Any future benchmark should keep the source snapshot, pages, question mix, model, destination duplicate context, and reasoning policy fixed unless a changed variable is explicitly documented. Compare output count and quality as well as time. A single run does not establish a stable median or percentile.

Artifacts: `job.json` (final job and candidates), `events.json` (ordered event log), `summary.json` (derived metrics), `manifest.json` (configuration and source hashes), and `job-initial.json` (initial job record).
