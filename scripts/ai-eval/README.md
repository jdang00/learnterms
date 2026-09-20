# LearnTerms question-quality evaluation

Run from the repository root with Bun. Uses the development Convex environment's `DATALAB_API_KEY` and `OPENROUTER_API_KEY` without printing credentials. Raw course sources, OCR, generated questions, and ledgers stay in ignored `tmp/ai-eval/`.

```sh
bun run eval:parse '/Users/justindang/Downloads/LEARN TERMS TEST'
bun run eval:questions --medium-only
bun run eval:report
```

Omit `--medium-only` to compare Luna low, medium, and high drafting. The independent reviewer always uses high reasoning; this isolates drafting effort. Both generation and OCR use the same implementation as the app. The comparison explicitly overrides drafting effort; the app derives it from the question type (Learn: low, Clinical and Critical thinking: medium). Fixtures select explicit objectives and source pages from four PDFs, with one Learn, Clinical, and Critical thinking assignment each. Each type runs in a separate scoped worker. Clinical abstention is expected for nonclinical evidence. They do not test automatic topic selection across every page.

The manifest requires all four PDFs. OCR is cached by file SHA-256; question runs are cached by document hash, thinking level, and harness version. A cached run makes no paid generation call. Increment `HARNESS_VERSION` when changing prompts, and keep the ledgers across versions. Never delete ledgers to rerun an experiment. Model outputs are stochastic; this is a small regression set, not a statistical accuracy study.

Budget controls:

- Reserve OCR at $0.006/page, with a $1.55 OCR ceiling.
- Reserve model requests before calling, using current OpenRouter prices and a conservative input-token estimate plus output cap.
- Combined ceiling: $3 including OCR, model requests, and `external-reservations.json` for separately run development smoke tests.
- Failed requests retain their reservation when cost is unknown. HTTP 429 OCR requests release their reservation because no processing occurred.
- One repair at most; no SDK retries. The production pipeline uses the same bounded repair and token reservation.
- A shared exclusive `budget.lock` prevents simultaneous paid evaluation processes. After a crash, check the recorded PID is no longer running before removing a stale lock. Other applications using the wallet are outside this harness's budget accounting.

`accepted` means passed structural checks, exact quote checks, and a separate model review. It does **not** mean expert-verified factual accuracy. The reviewer is the same model family and can share blind spots. Inspect originals, answer keys, distractors, assumptions, and reasoning depth. Record manual findings separately; do not turn automated acceptance into an accuracy percentage.

The September 2026 report records the original comparison, tightened prompts, final medium regression, manual disagreements, costs, and live draft-save verification. Third-order generation remains experimental and opt-in. Every generated question is saved as a draft for curator review before publication.
