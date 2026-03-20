# Custom Quiz Test Mode (Class-Scoped) Implementation Plan

Status: Planning only (no app code changes in this step)

## 1. Goal

Add a new exam-style test mode under the `classes` experience that is separate from the current study mode.

This new mode should:

- let users create a custom class-scoped test
- support one module or multiple modules in the same class
- randomly select up to 100 questions (v1)
- support timed tests (timing always tracked)
- allow backtracking and answer changes before submit
- avoid revealing correctness/answers/rationales during the attempt
- score on submit and show an end screen with detailed metrics
- support post-submit review (correct/wrong answers + rationale)
- preserve existing `userProgress` study data (especially flagged/incomplete) and use it as optional builder filters
- use local-first progress during test taking, but persist attempt/progress/results in Convex

## 2. Current State (What Exists Today)

The current module quiz is a study mode, not a test mode.

Observed behavior in current implementation:

- Module page loads all questions for one module and runs the quiz UI.
- Client receives full question documents (including `correctAnswers` and `explanation`) for study mode.
- Per-question selections/eliminations/flags are stored in `userProgress`.
- Immediate correctness feedback (`Correct!`/`Incorrect`) exists.
- `showSolution` and rationale reveal exist during the session.
- Progress is based on interacted questions, not a scored attempt.

This is correct for study mode and should remain unchanged.

Implication:

- Test mode must use a new route, new state model, and new Convex APIs that return **redacted** question payloads until submission.

## 3. Product Scope (v1)

### In Scope

- New class-scoped test builder page
- Random question selection only
- Multi-module selection (same class)
- Max 100 questions
- Timed test support + live timer
- Backtracking allowed
- Local-first autosave with Convex sync
- Server-authoritative submit and scoring
- Threshold-based pass/fail
- Results page with metrics and review mode (correct/wrong + rationale)
- Optional builder filters using existing `userProgress`:
  - flagged only
  - incomplete only
  - all questions

### Out of Scope (v1)

- Manual question picking
- Topic/tag filtering (future)
- Saved quiz presets/templates
- Instructor-assigned tests / sharing attempts
- Anti-cheat/lockdown browser features

## 4. UX / User Flow

### 4.1 Entry Point (New)

Add a new entry from the class modules view (not replacing module study pages):

- Example CTA: `Create Test`
- Location: class-level modules view (`/classes?classId=...`)

### 4.2 Builder Page

Proposed route:

- `/classes/[classId]/tests/new`

Builder inputs (v1):

- Module scope
  - one module
  - multiple modules (same class)
- Question count
  - numeric input / slider (1-100)
  - cap by available pool count
- Source filter
  - all
  - flagged only (from `userProgress`)
  - incomplete only (from `userProgress`)
- Question type selection (optional but useful in v1)
  - multiple choice
  - fill in the blank
  - matching
- Timer
  - always tracked
  - time limit enabled/disabled
  - duration presets (e.g. 5/10/20/30/60 min) + custom
- Shuffle options
  - shuffle question order (default on)
  - shuffle answer options (default on)
- Threshold
  - pass threshold percentage (default e.g. 70%)

Builder output preview (lightweight, no heavy question payload):

- total eligible questions
- selected random count
- selected modules summary
- type distribution estimate from eligible pool (if cheap to compute)
- estimated duration recommendation (optional)

### 4.3 Start Attempt

When user clicks `Start Test`:

1. Create Convex attempt record
2. Randomly select questions server-side
3. Snapshot scoring data into attempt item rows
4. Return `attemptId` and initial runner bundle
5. Navigate to runner route

Route:

- `/classes/[classId]/tests/[attemptId]`

### 4.4 Runner Page (Exam Mode)

Behavior differences vs study mode:

- No correctness feedback during attempt
- No answer reveal
- No rationale reveal
- No “check”/confetti behavior
- Backtracking allowed
- Can flag questions within the attempt (separate from study flags)
- Can navigate freely
- Autosave responses locally first, sync to Convex in batches
- Timer visible at all times
- Auto-submit when time reaches zero

Runner UI sections:

- Header
  - title / class / selected modules summary
  - timer
  - answered / unanswered / flagged counts
  - sync status (`Saved locally`, `Syncing`, `Synced`, `Offline`)
- Question navigation palette
  - current
  - answered
  - unanswered
  - flagged
- Question pane
  - stem + options / input UI
  - no correctness styling
  - no rationale
- Footer actions
  - previous / next
  - flag/unflag
  - clear response
  - submit (with confirm modal)

### 4.5 Submit + Results

Submit flow:

1. Flush local unsynced changes to Convex (best effort)
2. Server `submitAttempt` scores authoritatively from attempt snapshots
3. Attempt locks (`submitted` or `timed_out`)
4. Navigate to results page

Route:

- `/classes/[classId]/tests/[attemptId]/results`

### 4.6 Results + Review (Required)

You requested a planned review interface that supports going back through questions and then showing correct/wrong and rationale.

Plan:

Results page has two tabs/sections:

- `Summary`
  - score %
  - pass/fail status vs threshold
  - counts (correct/incorrect/unanswered)
  - by module
  - by question type
  - timing metrics
  - flagged count
- `Review`
  - question navigator
  - per-question status badges
  - user answer shown
  - correct answer shown
  - rationale shown
  - optional attachments shown (including `showOnSolution`)

Review mode is only available after submission.

## 5. Route Plan (SvelteKit)

New pages under `classes`:

- `src/routes/classes/[classId]/tests/+page.svelte`
  - list recent attempts for that class (optional in v1 but strongly recommended)
  - CTA to create new test
- `src/routes/classes/[classId]/tests/new/+page.svelte`
  - builder UI
- `src/routes/classes/[classId]/tests/[attemptId]/+page.svelte`
  - exam runner
- `src/routes/classes/[classId]/tests/[attemptId]/results/+page.svelte`
  - results + review

Server loads (`+page.server.ts`) should:

- validate auth
- validate class membership
- fetch only minimal metadata needed for each page
- avoid returning answer keys on runner page load

## 6. Data Model Plan (Convex)

Use new attempt-scoped tables. Do not reuse `userProgress` for test sessions.

### 6.1 `quizAttempts` table

Purpose:

- one row per custom test attempt
- tracks lifecycle, configuration snapshot, counters, and final results

Proposed fields:

- `userId: Id<'users'>`
- `classId: Id<'class'>`
- `cohortId?: Id<'cohort'>`
- `status: 'in_progress' | 'submitted' | 'timed_out' | 'abandoned'`
- `mode: 'custom_random_v1'`
- `configSnapshot: { ... }`
  - `moduleIds: Id<'module'>[]`
  - `questionCountRequested: number`
  - `questionCountActual: number`
  - `sourceFilter: 'all' | 'flagged' | 'incomplete'`
  - `questionTypes?: string[]`
  - `shuffleQuestions: boolean`
  - `shuffleOptions: boolean`
  - `timeLimitSec?: number`
  - `passThresholdPct: number`
- `seed: string` (or number)
- `startedAt: number`
- `lastActivityAt: number`
- `submittedAt?: number`
- `timeLimitSec?: number`
- `elapsedMs: number`
- `timeExpiredAt?: number`
- `progressCounters: {`
  - `visitedCount: number`
  - `answeredCount: number`
  - `flaggedCount: number`
  - `unsyncedClientSeqSeen?: number` (optional future)
  - `}`
- `resultSummary?: {`
  - `scoreEarned: number`
  - `scorePossible: number`
  - `scorePct: number`
  - `correctCount: number`
  - `incorrectCount: number`
  - `unansweredCount: number`
  - `passThresholdPct: number`
  - `passed: boolean`
  - `byModule: Array<...>`
  - `byType: Array<...>`
  - `reviewReady: boolean`
  - `}`
- `updatedAt: number`

Indexes (recommended):

- `by_user` -> [`userId`]
- `by_user_class` -> [`userId`, `classId`]
- `by_user_class_status` -> [`userId`, `classId`, `status`]
- `by_class` -> [`classId`]
- `by_status` -> [`status`]
- `by_user_lastActivity` -> [`userId`, `lastActivityAt`] (if query patterns need it)

### 6.2 `quizAttemptItems` table

Purpose:

- one row per question included in an attempt (max 100)
- stores frozen answer key snapshot + user response + scored result

Proposed fields:

- `attemptId: Id<'quizAttempts'>`
- `userId: Id<'users'>` (denormalization for auth/indexing convenience)
- `classId: Id<'class'>` (denormalization)
- `questionId: Id<'question'>`
- `moduleId: Id<'module'>`
- `order: number`
- `questionSnapshot: {`
  - `type: string`
  - `stem: string` (optional snapshot; see bandwidth section)
  - `options: { id: string; text: string }[]` (optional snapshot)
  - `correctAnswers: string[]`
  - `explanation?: string`
  - `questionUpdatedAt: number`
  - `}`
- `response: {`
  - `selectedOptions: string[]`
  - `textResponse?: string`
  - `isFlagged: boolean`
  - `visitedAt?: number`
  - `answeredAt?: number`
  - `lastChangedAt?: number`
  - `changeCount: number`
  - `timeSpentMs: number`
  - `}`
- `score: {`
  - `isCorrect?: boolean`
  - `pointsEarned?: number`
  - `pointsPossible: number`
  - `}`
- `updatedAt: number`

Indexes (recommended):

- `by_attempt_order` -> [`attemptId`, `order`]
- `by_attempt_question` -> [`attemptId`, `questionId`]
- `by_attempt_module` -> [`attemptId`, `moduleId`]
- `by_user_attempt` -> [`userId`, `attemptId`] (optional)

Notes:

- Snapshotting `correctAnswers` is required for scoring integrity.
- Snapshotting full stem/options/explanation is optional. For v1, prefer storing only scoring snapshot and reading display content from `question` post-submit, unless you need exact historical freeze behavior.
- If strict historical fidelity matters, snapshot full display content in `questionSnapshot`.

## 7. Convex API Plan

Create a new file, e.g.:

- `src/convex/customQuiz.ts`

### 7.1 Builder Queries

`getClassQuizBuilderData`

- Input: `classId`
- Returns:
  - class metadata
  - modules (published, ordered)
  - question counts per module
  - eligible counts by type (optional)
- No question answer keys

`getEligibleQuestionPoolSummary`

- Input: `classId`, `moduleIds`, `sourceFilter`, `questionTypes`
- Returns:
  - eligible total
  - counts by module
  - counts by type

This uses existing `userProgress` for `flagged` / `incomplete` filters.

### 7.2 Attempt Creation

`createCustomQuizAttempt`

- Input:
  - `classId`
  - `moduleIds`
  - `questionCount`
  - `sourceFilter`
  - `questionTypes`
  - `shuffleQuestions`
  - `shuffleOptions`
  - `timeLimitSec?`
  - `passThresholdPct`
- Server steps:
  1. auth + class membership check
  2. validate all modules belong to class
  3. build eligible question pool
  4. random sample using server seed
  5. create `quizAttempts`
  6. create `quizAttemptItems` with scoring snapshot and empty responses
  7. return `attemptId` + runner metadata

### 7.3 Runner Queries

`getAttemptRunnerBundle`

- Input: `attemptId`, optional page/chunk params
- Returns redacted runner payload:
  - attempt metadata/config/timer status/counters
  - questions for display (no `correctAnswers`, no rationale)
  - existing responses and flags
  - navigation statuses
- Must reject if attempt is not owned by current user

`getAttemptQuestionChunk` (optional if chunked loading)

- Input: `attemptId`, `start`, `limit`
- Returns redacted question chunk only

### 7.4 Runner Mutations

`patchAttemptResponses`

- Input:
  - `attemptId`
  - `changes: Array<{ itemId or questionId, response patch, clientTs, localSeq }>`
- Behavior:
  - merge partial changes
  - update `updatedAt`, `lastActivityAt`
  - recompute attempt counters incrementally or on batch end
  - idempotency strategy for repeated local retries (optional v1: last write wins)

`heartbeatAttempt`

- Input: `attemptId`, `elapsedMsClient`, `clientNow`
- Behavior:
  - update `lastActivityAt`
  - optionally store `elapsedMs = max(existing, client elapsed)` after sanity checks

`submitAttempt`

- Input: `attemptId`
- Behavior (authoritative):
  1. validate ownership and status
  2. enforce timeout (if expired, mark `timed_out`)
  3. score each attempt item using snapshot data
  4. compute summary metrics
  5. store `resultSummary`
  6. lock attempt status
  7. return summary + route info

### 7.5 Results Query

`getAttemptResults`

- Input: `attemptId`
- Returns:
  - result summary metrics
  - per-question review data
  - per-module / per-type breakdown
  - user answers + correct answers + rationale
- Only allowed after submitted/timed_out

### 7.6 Attempt List Query (Optional but Useful)

`getUserAttemptsForClass`

- Input: `classId`, pagination
- Returns recent attempts and statuses

## 8. Auth and Access Control

The existing `authQuery` pattern enforces authentication but not automatically class membership.

For all new custom quiz functions:

- verify authenticated identity
- resolve current `users` row from Clerk identity
- verify user belongs to cohort that owns the class
- verify requested modules belong to `classId`
- verify `attempt.userId === currentUser._id`

Security-critical rule:

- Runner endpoints must not return `correctAnswers` or rationale before submit.

## 9. Random Question Selection (v1)

User chose random selection for v1.

Plan:

- Build eligible pool from selected modules + filters
- Sample server-side using seed (stored on attempt)
- Store resulting ordered question IDs in `quizAttemptItems.order`

Why server-side:

- avoids client-side tampering
- makes retry/resume deterministic
- keeps final scoring tied to a fixed set

Future extension:

- topic/tag filters can be added in builder without changing attempt architecture

## 10. Scoring Rules (Server-Authoritative)

Scoring occurs only on `submitAttempt`.

### Question Type Handling

- Multiple choice:
  - exact set match against snapshot `correctAnswers`
- Fill in the blank:
  - reuse current normalization/matching semantics (including flags/modes)
  - move shared evaluator logic into a reusable utility when implementing
- Matching:
  - exact set match of pair IDs

### Unanswered

- counted separately
- `isCorrect = false`
- `pointsEarned = 0`

### Score + Threshold

- `scorePct = round(scoreEarned / scorePossible * 100)` (define rounding strategy explicitly)
- `passed = scorePct >= passThresholdPct`

Recommended rounding:

- use integer percent with standard rounding for display
- keep raw decimals internally if needed

## 11. Timing Model

You want timed tests and timing tracked regardless.

### v1 Timing Rules

- Every attempt records timing (`startedAt`, `lastActivityAt`, `elapsedMs`)
- Optional `timeLimitSec`
- If time limit exists:
  - runner shows countdown
  - auto-submit at zero
  - server validates expiration on submit
- Backtracking remains enabled even in timed mode

### Timing Source of Truth

Hybrid approach:

- Client drives visible timer (best UX)
- Server stores attempt timestamps and validates time limit
- On submit, server computes authoritative expiry based on `startedAt` and `timeLimitSec`

Why:

- client timer is responsive
- server prevents “paused clock” tampering

## 12. Local-First + Convex Sync Strategy (Your Requirement)

You asked to keep progress in Convex, but check local first.

### v1 Sync Model

Local first:

- Keep in-memory runner state for responsiveness
- Persist to local storage (prefer IndexedDB; `localStorage` fallback is acceptable)
- Read local cache first on page load/resume

Cloud sync:

- Debounced batch sync to Convex (`patchAttemptResponses`)
- Sync on:
  - answer change
  - flag toggle
  - navigation (debounced)
  - periodic interval (e.g. every 5-10s)
  - `visibilitychange` / `pagehide`
  - submit (force flush)

Conflict approach (v1):

- Single-device assumption for active attempt
- Last-write-wins if local and server differ
- Surface warning if server `updatedAt` is newer than local cache unexpectedly

Local cache key shape (example):

- `lt:testAttempt:<attemptId>`

Cache contents:

- responses by question/item
- local timer bookkeeping
- unsynced change queue
- last successful sync time

### Why Keep Convex Attempt Progress

- resume across sessions/devices (best effort)
- reliable end-state metrics
- future analytics/reporting
- recovery if browser storage is cleared mid-attempt (partial protection)

## 13. Performance / Bandwidth Plan

This is important because test mode should not fetch or sync more than needed.

### 13.1 Do Not Reuse Study Question Query for Runner

The study query returns full question docs including answer keys and rationale. That is incompatible with exam mode.

Runner must use a redacted query.

### 13.2 Builder Optimization

- Fetch module/question counts only at first render
- Use summary queries for eligible pool count
- Do not fetch all question stems unless the builder needs previews

### 13.3 Runner Optimization

- Max 100 questions keeps upper bounds reasonable
- Return redacted question payload only
- Consider chunk loading (`20-25` questions per chunk) if payload size is large
- Lazy-fetch attachments per current/nearby question if media usage is high
- Batch response updates to reduce mutation traffic
- Store counters on `quizAttempts` for quick header rendering

### 13.4 Results Optimization

- Fetch summary metrics first
- Review data can be chunked/paginated if needed
- If returning all 100 review items at once is acceptable, keep simple in v1

## 14. Reuse Strategy vs New Components

Recommendation:

- Reuse visual building blocks where safe (answer option rendering, question shells, nav palette)
- Create a separate test-mode state store (do not extend current `QuizState` directly)

Reason:

- current `QuizState` is tightly coupled to study concepts (`checkResult`, `showSolution`, auto-next-on-correct)
- test mode needs different invariants and fewer side effects

Likely new components (v1):

- `TestBuilder.svelte`
- `TestRunner.svelte`
- `TestHeader.svelte` (timer + counters + sync state)
- `TestQuestionPalette.svelte`
- `TestSubmitModal.svelte`
- `TestResultsSummary.svelte`
- `TestResultsReview.svelte`

## 15. Use of Existing `userProgress` (Flagged/Incomplete)

You chose to keep and use existing study progress, especially flagged/incomplete.

Plan:

- Builder queries can join/filter by `userProgress`:
  - `flagged` -> `isFlagged === true`
  - `incomplete` -> no `userProgress` interaction record (or record with no selected/eliminated)
- Do **not** modify `userProgress` semantics for test attempts
- Keep attempt flags separate from study flags

Why separate attempt flags:

- study flags reflect long-term study intent
- test flags reflect “review this on this attempt”

## 16. Results / Metrics Specification (v1)

Summary metrics:

- score earned / possible
- score %
- pass/fail vs threshold
- correct / incorrect / unanswered
- answered count
- flagged count (attempt flags)
- time spent total
- time remaining (if timed)
- completion status (`submitted`, `timed_out`, `auto_submitted`)

Breakdowns:

- by module
  - total
  - correct
  - incorrect
  - unanswered
  - accuracy %
- by question type
  - total
  - correct
  - accuracy %

Timing metrics:

- average time/question
- slowest questions (top N)
- fastest questions (optional)
- time spent by module (optional but nice)

Review screen per-question info:

- question number
- module
- your answer
- correct answer
- result status
- rationale
- attachments (including solution-only media)

## 17. Edge Cases and Failure Modes

### Empty / Small Pools

- If eligible pool is 0: block start, explain why (module/filter combination)
- If requested count > eligible count: cap to eligible and show message

### Network Loss

- Continue locally
- queue unsynced changes
- show sync status warning
- force best-effort sync on submit
- if submit fails, keep user on runner with retry state (do not lose answers)

### Time Expiry While Offline

- client marks expired and blocks editing
- on reconnect/submit, server enforces timed-out scoring

### Question Edited Mid-Attempt

- attempt item snapshot protects scoring integrity
- display may be from live question or snapshot depending implementation choice
- recommended: snapshot scoring at minimum; consider snapshot display for strict consistency

### Multiple Tabs

- v1: warn if same attempt opens in another tab (local storage lock heartbeat)

## 18. Implementation Phases (Recommended)

### Phase 1: Foundation

- Convex schema additions (`quizAttempts`, `quizAttemptItems`)
- auth/membership helpers for class validation
- builder summary queries

### Phase 2: Attempt Lifecycle

- create attempt
- runner redacted query
- response patch mutation
- submit scoring

### Phase 3: UI (Builder + Runner)

- builder page
- runner page with timer, navigation, local-first sync
- submit confirmation flow

### Phase 4: Results + Review

- summary metrics page
- review interface with rationale and answer reveal post-submit

### Phase 5: Hardening

- offline/sync conflict handling
- auto-submit on timeout
- chunked fetching if payloads are large
- UX polish + QA

## 19. Local Validation Plan (When Implementation Starts)

No code changes are being made in this step, but when implementation begins:

- Run app locally with Bun only (`bun run dev`)
- Run Convex locally (`bunx convex dev`) if schema/functions change
- Validate:
  - builder creates class-scoped attempts
  - redacted runner payload has no answers/rationale
  - local-first autosave and resume
  - timed auto-submit
  - backtracking and answer changes
  - server scoring and threshold status
  - review shows correct/wrong + rationale after submit

## 20. Future Extensions (Already Planned)

These fit naturally into this design later:

- topic/tag filters in builder (your requested future addition)
- manual question selection
- saved quiz presets/templates
- instructor-assigned tests
- cohort/class analytics over attempts
- adaptive tests based on performance

## 21. Final Recommendations Before Implementation

Proceed with a fully separate exam/test flow.

Key implementation rules to preserve correctness:

- keep study mode unchanged
- never send answer keys in runner payload
- score only on server from frozen attempt snapshots
- local-first UX + Convex persistence for reliability
- separate attempt flags from study flags

This plan supports your v1 requirements and leaves room for topic filtering and richer test creation later without redesigning the core attempt model.

