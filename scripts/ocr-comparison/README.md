# Datalab parsing verification

The application now uses Datalab Fast. The shared server-only REST adapter is `src/convex/datalab.ts`; the durable ingestion workflow is `src/convex/documentIngestion.ts`. `DATALAB_API_KEY` belongs in the target Convex deployment, never browser code. The ignored `.env.datalab.local` is for local evaluation only.

```sh
bun test tests/datalab.test.ts
# Optional: verify a locally saved sample
bun test scripts/ocr-comparison/saved-sample.test.ts
bun run eval:parse /absolute/path/to/pdfs
```

The old two-provider paid runner is retired. `report.ts` renders the historical September 20 comparison offline from ignored saved results; its measured timings are historical observations, not a current provider configuration or typical latency estimate.

Production-path settings: Fast, JSON with block Markdown and page boundaries; retain headers/footers, block geometry, section hierarchy and tables. Captions, paid bounding-box extensions, cross-page merging and checkpoints are off. Image payloads are stripped even if returned. Cache bypass is off. Signed source URLs use US processing and URL-encoded fields; the API rejects multipart requests with a region override. Multipart local evaluation uses the account's configured region.

A request is submitted once, then polled by a durable Convex workflow. Polling and index recovery reuse the accepted request or stored output; ambiguous submission failures require review before another paid request. Explicit validation/auth rejections release their reservation. Missing, failed or reordered pages are rejected before indexing. Existing indexed content remains usable on extraction failure. Polling and download hosts are checked before fetching; API keys are never forwarded to signed result downloads.

The deployment-wide semester guard reserves rounded-up standard conversion cost BEFORE monthly credits, capped at $20 (Jan-May, Jun-Jul, Aug-Dec). This deliberately conservative ceiling is not a provider billing cap, does not account for usage outside this deployment, and can stop uploads even when free credits remain. Historical evaluations bypass this application guard. Datalab's $10 personal monthly allowance normally covers about 2,500 Fast pages per 30-day cycle; cent rounding, repeat conversions and other processors reduce the effective allowance. Embedding, mapping and question generation are separate costs.

The live seven-page sample completed conversion, indexing and topic mapping on development. Historical rollout notes are archived locally under ignored `tmp/merge-prep-archive/2026-09-20/reviews/`.
