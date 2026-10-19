# LearnTerms: Agent Guide

A study platform for health-professions cohorts. It uses SvelteKit 3 with Svelte 5 runes, Convex, TailwindCSS 4 with shadcn-svelte (bits-ui) on brand tokens, Clerk auth, R2 document storage and OpenAI/OpenRouter models. It deploys to Vercel.

## Commands

Use **Bun only**. Never use `npm`, `npx`, `yarn` or `pnpm`. Treat any older `npm`/`npx` mentions as stale.

- `bun run dev` starts SvelteKit. `bun run dev:convex` starts Convex.
- `bun run verify` runs **check, lint and test**. Run it before calling work done; CI runs it on every PR. `bun run verify:fast` skips tests; `bun run test:unit`, `test:convex` and `test:state` run one suite.
- `bun run check` runs svelte-check. `bun run lint` runs prettier and eslint. `bun run format` fixes formatting.
- `bun run test` runs `bun test` for `tests/*.test.ts`, then Vitest for Convex, auth and state tests (`vitest.config.ts` projects).
- `bunx convex run <module>:<fn> '<json args>'`. Add `--prod` for production.
- Migrations and backfills live in `src/convex/migrations/` by domain (`questions`, `modules`, `attempts`, `progressStats`, `users`, `lookups`). Run one with its folder path, e.g. `bunx convex run migrations/questions:backfillFlagCounts`. Paginated backfills schedule their own next page; pass `{"continueAutomatically": false}` to step manually. `scripts/BACKFILL_README.md` lists the production stats sequence.

## Where things live

| Area                            | Location                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Student study flow              | `src/routes/classes/[classId]/modules/[moduleId]` (`states.svelte.ts` holds quiz state), shared quiz UI in `src/lib/components`              |
| Practice tests                  | `src/routes/classes/[classId]/tests`, backend `src/convex/tests/{builder,attempts,results}.ts` (`scoring.ts` is pure grading)                |
| Quiz dock and tools             | `src/lib/components/quiz-dock`, `src/lib/components/side-panel`, `src/lib/components/question-notes`                                         |
| Admin/curator UI                | `src/routes/admin/*`, components grouped under `src/lib/admin/{catalog,questions,question-studio,content-library,source,progress,workbench}` |
| Question Studio (AI generation) | UI `src/lib/admin/question-studio`, backend `src/convex/questionStudio/*` (jobs, workers, review, saving)                                    |
| Documents, RAG and OCR          | `src/convex/ragKnowledge/*` (Node actions), `documentIngestion*.ts`, `datalab.ts`, `r2Documents.ts`                                          |
| Progress and stats              | `src/convex/progress.ts`, `userProgress.ts`, `studyProgress.ts`, `moduleStats.ts` (rollups, `hasInteraction`)                                |
| Questions (backend)             | `src/convex/questions/{read,write,bulk,order,duplicate,search}.ts`; `options.ts` (pure id/answer normalization) and `shared.ts` (helpers)    |
| Badges                          | `src/convex/badges.ts`, `badgeEngine.ts`                                                                                                     |
| Schema                          | `src/convex/schema.ts`                                                                                                                       |
| Plans, benchmarks and history   | `dev/` (`dev/archive/` holds finished plans; hidden from search via `.ignore`)                                                               |

## Task recipes

- **Add a Convex function:** put it in the domain folder (`questions/`, `tests/`, `questionStudio/`, …), define it with a wrapper from `authQueries.ts` (`authQuery`, `authMutation`, `authCuratorQuery`, `authCuratorMutation`, `authAdminMutation`, `authDevQuery`…) so `ctx.user` is loaded once, add validators for every arg, use `withIndex` (never `.filter` on a table scan, bound reads with `.take`), add a case to `convex-tests/security.test.ts`, then run `bunx convex codegen`. ESLint rejects raw `query`/`mutation` imports in new files.
- **Add a page:** `+page.server.ts` loads live data with `convexLoad` from `convex-svelte/sveltekit` (the token comes from `hooks.server.ts`); the page reads `data.<name>.data`. Use `useQuery` only for client-driven args, and `useMutation`/`useAction` for writes. `ConvexHttpClient` is server-only (`#lib/server`, hooks, server loads).
- **Add UI:** compose `#lib/components/ui` primitives on brand tokens; check `/design-system` in dev. Extract state into a `*.svelte.ts` class once a component passes a few hundred lines. `tests/fileSize.test.ts` fails when a file grows past 600 lines or an allowlisted file grows at all; shrink the file, then `bun scripts/file-size-budget.ts --write`.
- **Add an AI step:** model IDs in `aiModels.ts`; rate limits and the agent in `questionStudio/runtime.ts`; durable multi-step jobs use `@convex-dev/workflow` (see `documentIngestion.ts`); record usage through `aiTelemetry`.
- **Run a backfill:** `bunx convex run migrations/<domain>:<fn> '{}'` (see `scripts/BACKFILL_README.md`); paginated backfills schedule their next page themselves.

## Conventions (reuse these; don't re-implement them)

- **Convex auth:** use the helpers in `src/convex/access.ts` (`requireCurrentUser`, `requireClassAccess`, `requireModuleAccess`, `requireCohortAccess`, `requireCohortStaff`, `requireClassStaff`, …) or the role-gated wrappers in `src/convex/authQueries.ts` (`authQuery`, `authMutation`, `authAdminQuery`, `authAdminMutation`, `authCuratorQuery`, `authCuratorMutation`, `authDevQuery`, `authDevMutation`). A wrapped handler gets the caller as `ctx.user` (plus `ctx.identity`); pass `ctx.user` to the access helpers instead of calling `requireCurrentUser` again. Never write another users-by-`clerkUserId` lookup (`findUserByClerkId` and `optionalCurrentUser` in `access.ts` cover the rare pre-onboarding case). `dev` bypasses cohort boundaries; everyone else is scoped to their cohort. Add a case to `convex-tests/security.test.ts` for any new public function.
- **Convex function paths:** call functions through their real module path (`api.questionStudio.jobs.createGenerationJob`). Don't add barrel files that re-export Convex functions: every export registers a second public endpoint.
- **AI models:** every model ID lives in `src/convex/aiModels.ts` (`TEXT_MODEL`, `OPENROUTER_TEXT_MODEL`, `EMBEDDING_MODEL`). The Datalab OCR model stays in `datalab.ts`.
- **Rendering HTML:** question stems, options and rationales are rich HTML. Always render them with `{@html sanitizeHtml(x)}` (`#lib/utils/sanitizeHtml`), and put `<!-- eslint-disable-next-line svelte/no-at-html-tags -->` on the line above.
- **Formatting:** `#lib/utils/format.ts` has `formatBytes` and `formatClock`. `#lib/utils/errorHandling.ts` has `getErrorText` and `isConvexAuthError`.
- **UI:** shadcn-svelte primitives in `#lib/components/ui` on the brand tokens in `src/app.css`. `/design-system` is the living reference and `dev/v4.5-paola-migration-guide.md` covers the rules. There is no DaisyUI; don't add `btn`, `card`, `modal` or theme classes.
  - **Tones:** Button, Badge, Alert and Progress take `variant` plus `tone` (`tone.ts`). For role-colored text on the page use `text-<role>-ink`; keep the solid `text-<role>` for icons and fills. Use `-foreground` for text on a solid role fill.
  - **Surfaces:** use `Card` or the surface utilities for every bordered panel instead of hand-rolling `rounded-2xl border bg-background`. The utilities are `surface` (panel), `surface-sm` (tile or row), `surface-muted` (recessed panel), `surface-inset` (nested panel) and `surface-dashed` (empty state or drop target). A guard test fails on hand-built surfaces.
  - **Type:** use `title-page` (app pages) or `title-hero` (public heroes) on `<h1>`, and `label-caps` for small uppercase section labels. Add a text color to tint a label.
  - **Choices and state:**
    - `SegmentedControl` for one-of-a-few choices: status pickers, view switches, filters. It renders a radio group with arrow keys. Looks are `activeVariant` solid, soft or raised and `track` surface, muted or none.
    - `LoadingState` (block, or `inline`) for loading areas, and `Spinner` inside controls. Use Button `loading` rather than a hand-placed spinner.
    - `Empty` for empty states. Its `Media` variants are `icon` and `emoji`.
    - `Skeleton` for placeholders. Don't hand-roll `animate-spin`, `animate-pulse` or `role="radio"`.
  - **Menus and overlays:** use `DropdownMenu`, `Popover`, `HoverCard`, `Dialog` and `Sheet`. Never hand-roll absolute-positioned panels, native `popover`, or `fixed inset-0` modals. A bespoke animation can stay through `forceMount` and a `child` snippet (see `DockCustomizer`). For search-and-pick, use `SearchablePicker` (Popover plus Command).
  - **Tooltips:** use Button `tooltip="…"` (`tooltipKbd`, `tooltipSide`) or `Tip`, not `title`. Keep native `title` only where a disabled button explains why it's disabled.
  - **Colors:** colors come from tokens. Mastery is `bg-mastered` / `text-mastered-ink`. A guard test fails on raw Tailwind palette colors such as `text-green-500`.
  - **Shared pieces:** `SelectField` and `SemesterSelect` (never a native `<select>`), `HeroGlow` for public heroes, `markdown-preview.css` for rendered library markdown, `Tip` for tooltips, and `toast` from `svelte-sonner` (the old `#lib/stores/toast.svelte.js` facade still works).
  - **Dialogs and sheets:** use `Dialog.Content sheet` for a phone bottom sheet that is a centered dialog on desktop, and `Dialog.CornerClose` for a close button. Use `Sheet.svelte` for draggable mobile sheets.
  - **Split pill:** use Button `shape="segment-start"`/`"segment-end"`.
  - **Docks:** test and review docks use `DOCK_ISLAND_CLASS`/`DOCK_PHONE_BAR_CLASS`, `TOOL_TILE_CLASS` and `dockGlass()` from `quiz-dock/dockStyles`.
  - **Icons:** import one icon per module, `import X from '@lucide/svelte/icons/x'`. ESLint blocks the barrel and `lucide-svelte`, which pull every icon into the build. Type icon props as `LucideIcon` (`import type { LucideIcon } from '@lucide/svelte'`).
  - **CLI:** `bunx shadcn-svelte add` overwrites customized primitives (Button, Badge, Dialog content, Select, Card…). Check `git diff src/lib/components/ui` afterward and restore the brand changes. Never pass `-o` blindly.
  - **Links:** use `resolve()` from `$app/paths` for internal links.
- **Svelte 5:** use runes (`$state`, `$derived`, `$effect`, `$props`). Prefer a writable `$derived` over `$state` plus an `$effect` that copies.
- **SvelteKit 3:** config lives in the `sveltekit()` call in `vite.config.ts` (there is no `svelte.config.js`).
  - Import from `src/lib` with `#lib/…` plus the file extension (`#lib/utils/format.js`, `#lib/components/ui/button/index.js`). `package.json` `imports` has a `bun` condition that maps `.js` to the `.ts` source, because Bun's test runner doesn't.
  - Environment variables are declared in `src/env.ts` and read from `$app/env/public` or `$app/env/private`. `$env/*` is deprecated, and its dynamic modules only see declared variables. `$app/env` has `browser` and `dev`.
  - `resolve()` takes route IDs with a leading slash (`resolve('/blog/[slug]', { slug })`) or paths without one (``resolve(`classes/${id}`)``). Use `asset('file.png')` for `static/`.
  - Shallow routing uses `setPageState()` from `#lib/utils/backNavigation.js` (`goto('', { shallow: true })`), not `pushState`/`replaceState`. `goto` options are `replace`, `reset: false` and `refreshAll`, and `goto` rejects non-app URLs, so use `window.location` for those.
- **Lint:** fix problems rather than disabling rules. When a disable is genuinely needed, scope it to one line and give a reason (`-- why`). Prefix intentionally unused args with `_`.
- **Comments:** keep them minimal. Add one only when the logic isn't obvious.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
