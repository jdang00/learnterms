# Sol and Terra generation experiments — September 21, 2026

**Decision: keep the existing Luna-based default.** Sol/Terra at none or low thinking did not demonstrate a better combination of complete-set cost, speed and output quality. No application model defaults or deployments were changed in this round. The work adds an isolated reproducible harness, measured results and quality findings.

**New-round spend: $0.80947725 estimated from returned usage**, including all generation and review calls. There were 53 paid calls across 15 drafting configurations and nine paired reviewer configurations; no failed calls or unknown-cost reservations remain. The persisted reservation ledger enforces the user's $2 ceiling before every call. No questions were saved or published. This amount excludes the prior September 20 experiments.

## Direct generation

Costs below include input, output, reasoning and cache writes, before the separate quality-review call. All models received identical source assignments and requirements within each count/batch comparison, including substantive 35–60-word rationales. “None” is the API's no-thinking setting on the standard service tier.

| Model | Thinking | 10 questions, one call    | 15 questions, three parallel batches of five |
| ----- | -------- | ------------------------- | -------------------------------------------- |
| Terra | None     | 3.05 cents / 17.3 seconds | 4.56 cents / 10.3 seconds                    |
| Terra | Low      | 3.59 cents / 30.6 seconds | 5.17 cents / 13.9 seconds                    |
| Sol   | None     | 5.62 cents / 30.4 seconds | 8.57 cents / 15.4 seconds                    |
| Sol   | Low      | 6.05 cents / 41.3 seconds | 9.86 cents / 30.6 seconds                    |

All these cardiovascular runs returned the requested number of raw drafts. Duplicate and quality gates reduced final counts; see [all measurements](measurements.md). Terra none's single-call 15-question alternative cost 3.75 cents and took 23.8 seconds. Batching materially improved its speed while increasing cost. No tested Sol/Terra drafting configuration reached the 3-cent goal even before paid review.

## Hybrid checks

The same saved Luna medium 15-question draft was passed to three compact reviewers. Local checks had already retained 11 questions; the other four were rejected before review. These workflow times/costs sum the measured draft and review stages and exclude application scheduling and persistence.

| Compact reviewer | Screen accepted / requested | Combined cost | Combined time |
| ---------------- | --------------------------- | ------------- | ------------- |
| Luna medium      | 10/15                       | 1.05 cents    | 29.2 seconds  |
| Terra none       | 11/15                       | 2.48 cents    | 18.1 seconds  |
| Terra low        | 6/15                        | 3.61 cents    | 32.4 seconds  |

Terra none is a candidate when very fast screening matters, but its pass-all result concealed weak distractors and low-value questions. Low thinking cost more and rejected more without reliably catching all important errors. On the second lecture, Terra low passed a question whose rationale incorrectly denied alternative answers explicitly listed in the source. It is not ready to replace the current checker on the strength of these tests.

## Quality determines the recommendation

Manual inspection found good mechanism/contrast rationales in all three model families. Low thinking avoided the specific urgent-diagnosis ambiguity seen in the first Sol/Terra none samples. It did not consistently fix irrelevant distractors, fabricated alternatives, source-framed explanations or excessive generalization of source captions. Sol low's 10/10 automated pass concealed several obvious distractor problems.

The [quality notes](quality-notes.md) give exact run/slot identifiers, positive examples and reviewer false passes. Automated acceptance is not an accuracy percentage, and this is not a clinician-graded benchmark. Most configurations have one sample; there are no p95 or reliability claims. The source notes themselves contain uncertain claims and dated clinical guidance, so source fidelity alone cannot establish current clinical accuracy.

The useful direction is cheaper Luna drafting with better calibrated, compact checks and selective repair. That direction still needs a labeled quality set and a complete-count validation before replacing the current two-question correction workflow. These experiments do not justify an automatic switch to Sol, Terra, or no-thinking defaults.

## Reproduction and accounting

Use Bun in the known development checkout. The harness reads the existing local cardiovascular and retinal fixtures described in [STUDIO_MATRIX.md](../../../../scripts/ai-eval/STUDIO_MATRIX.md), obtains the development API key without writing or printing it, and writes raw artifacts only to ignored `tmp/studio-sol-terra/`. Each process takes an exclusive lock. Reusing an existing run ID skips paid work; changing a repeat number makes a new paid run. Every call is reserved using a conservative input-byte bound and maximum allowed output; failed calls without usage retain their reservations. There are no hidden provider retries.

```sh
bun scripts/ai-eval/studio-sol-terra.ts '[{"model":"terra","effort":"none","count":15,"size":5,"repeat":2}]'
bun scripts/ai-eval/studio-sol-terra.ts '[{"model":"terra","effort":"low","reviewOf":"cardio-luna-medium-15-b5-w35–60-r1","repeat":2}]'
bun scripts/ai-eval/studio-sol-terra-report.ts
```

The report command is free and makes no provider calls. Its [sanitized results](results.json) derive workflow costs independently from each call's token ledger. Several raw per-run summary totals were found to repeat an earlier run's cost, while provider usage and the spend ledger remained correct. Those raw summaries are retained for provenance; the aggregate report recomputes every total and is authoritative. Auxiliary cold estimates also consistently include the 1.25× input cache-write rate. The harness now uses a standalone accumulator for per-run totals.

Pricing sources: official [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), and [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) model pages. Amounts are token-priced estimates, not a billing invoice. OCR, uploads and hosting are outside these generation-only comparisons.

## Final verification

An independent read-back recalculated all 53 call costs from token/cache counts, reconciled all 24 aggregate workflow totals, and recomputed every screened question count from the saved verdicts. Every call used the standard tier, every measured cost fit its reservation, and all 13 no-thinking calls reported zero reasoning tokens. Reconstructing reservation/settlement events gave a peak commitment of $0.93353405, below the $2 ceiling. Bun builds for both scripts, formatting checks and `git diff --check` passed. No additional paid verification calls were made.
