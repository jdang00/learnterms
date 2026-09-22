# Study tool telemetry

[PostHog dashboard](https://us.posthog.com/project/92871/dashboard/2123257) · LearnTerms project `92871`

Events use the existing PostHog client, Clerk identity, session attribution, and opt-out behavior. Development builds do not send events. Dashboard queries include only `learnterms.com` and `www.learnterms.com`. New events begin after this release; they do not backfill past usage.

## Event contract

All events include `telemetry_version: 1`, `tool` (`notes`, `highlight`, `calculator`), `surface`, and `pathname`. Question contexts include `questionId`, `moduleId`, `classId`, and `questionType`; test attempts also include `attemptId`. These IDs match the existing `question_answered` event. Standalone calculator events omit question identifiers. The SDK supplies person, session, browser, and device properties.

| Event                        | Meaning                                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `study_tool_opened`          | A notes/calculator panel became visible, or the standalone calculator mounted. `source=restore` identifies a restored panel; it is not a deliberate open. |
| `study_tool_closed`          | A visible panel closed or was replaced by the other tool. Browser/page exits are not counted as closes.                                                   |
| `study_tool_question_viewed` | Context changed while a panel remained open. This measures exposure, not editing or calculating.                                                          |
| `study_tool_used`            | An explicit tool action or a confirmed save/evaluation outcome. See actions below.                                                                        |

Surfaces are `module_quiz`, `test_attempt`, `standalone_calculator`, and the fallback `other`. Source can identify a button, keyboard, mobile command, restoration, navigation, standalone page, or automatic evaluation. Input-method classification describes the expression's edit history since clearing/selecting it, not individual keystrokes.

## Actions

| Tool       | Actions and properties                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Notes      | `edit_started` once per mounted question editor's first local edit; `created`, `updated`, `cleared` after successful autosave, with `character_count`; `save` with `outcome=error/conflict`; `conflict_resolved` with `resolution=saved/local`; toolbar `format`; `limit_reached` once per rejected-input episode. |
| Highlight  | `mode_changed` with `enabled` reflects the local toggle, not a persistence receipt. `highlight_changed` with `outcome=success/error`, counts of ranges added/removed, and `undo`. Success fires only for an actual saved change, including one completing after navigation.                                        |
| Calculator | `calculate` with `outcome=success/invalid/error/timeout`, `input_method`, `angle_mode`, and optional library `formula_id`; `formula_selected`, `formulas_opened`, `angle_changed`, `result_copied`, `history_reused`, `history_cleared`, `cleared`, and failed `load`.                                             |

Successful live calculator results emit after 900 ms without another evaluation. Enter or Calculate emits immediately and shares the same input-revision deduplication, so the automatic result and explicit commit cannot count twice. Restoring a saved expression alone emits no calculation. Transient invalid input while typing emits no error; explicit invalid submissions do. Note success counts are **autosaves**, not counts of distinct notes.

## Interpretation

The dashboard's engaged users are unique PostHog people with a successful note save, highlight edit, or calculation. It separates this from panel exposure, formatting, and mode toggles. Counts are custom event-derived measures, not a cohort-adoption denominator. Use unique users for adoption; use action counts for activity. The dashboard uses a rolling 30-day window and UTC day buckets.

Break down by `surface`, `tool`, `questionId`, `moduleId`, `classId`, `attemptId`, `questionType`, and SDK device/browser properties. Correlate to `question_answered` using person/session and question identifiers; a correlation does not establish that a tool caused improved performance.

Telemetry is best-effort client-side reporting. Ad blockers, opt-out, offline tabs, navigation, and SDK failures can suppress events. Offline Convex mutations may remain pending rather than reject, so failure counts are client-observed failures, not server reliability rates. Async outcomes retain the context from when the operation started.

## Privacy and maintenance

The shared property builder explicitly allowlists metadata. It never sends note documents, selected quotes, highlight offsets, calculator expressions, variable values, numeric results, or raw error messages. Note, highlight, and calculator content regions use PostHog's `ph-no-capture` and `ph-mask` classes. See [PostHog privacy controls](https://posthog.com/docs/product-analytics/privacy) and [replay masking](https://posthog.com/docs/session-replay/privacy).

Keep analytics calls out of per-keystroke loops. Capture save success only after acknowledgement. Capture question context before awaiting work. Maintain event names/properties or increment `telemetry_version` when changing meaning. Dashboard definitions are in `study-tool-dashboard.json`.

Validation: `bun test tests/studyToolEvents.test.ts tests/calculator.test.ts tests/quizDockShortcuts.test.ts tests/quizDockLayouts.test.ts` and `bun run check`. Browser smoke tests should cover free typing, keypad, formulas, notes, and switching question context with a panel open. Use local builds for smoke tests to avoid polluting production metrics.
