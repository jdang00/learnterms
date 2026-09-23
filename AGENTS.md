# LearnTerms: Agent Guide

A study platform for health-professions cohorts. It uses SvelteKit 2 with Svelte 5 runes, Convex, TailwindCSS 4 with DaisyUI 5, Clerk auth, R2 document storage and OpenAI/OpenRouter models. It deploys to Vercel.

## Commands

Use **Bun only**. Never use `npm`, `npx`, `yarn` or `pnpm`. Treat any older `npm`/`npx` mentions as stale.

- `bun run dev` starts SvelteKit. `bun run dev:convex` starts Convex.
- `bun run verify` runs **check, lint and test**. Run it before calling work done; CI runs it on every PR.
- `bun run check` runs svelte-check. `bun run lint` runs prettier and eslint. `bun run format` fixes formatting.
- `bun run test` runs `bun test` for `tests/*.test.ts`, then Vitest for Convex, auth and state tests (`vitest.config.ts` projects).
- `bunx convex run <module>:<fn> '<json args>'`. Add `--prod` for production.
- Migrations live in `src/convex/migrations.ts` (e.g. `bunx convex run migrations:backfillAllFlagCounts`).

## Where things live

| Area                            | Location                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Student study flow              | `src/routes/classes/[classId]/modules/[moduleId]` (`states.svelte.ts` holds quiz state), shared quiz UI in `src/lib/components`              |
| Practice tests                  | `src/routes/classes/[classId]/tests`, backend `src/convex/customQuiz.ts`                                                                     |
| Quiz dock and tools             | `src/lib/components/quiz-dock`, `src/lib/components/side-panel`, `src/lib/components/question-notes`                                         |
| Admin/curator UI                | `src/routes/admin/*`, components grouped under `src/lib/admin/{catalog,questions,question-studio,content-library,source,progress,workbench}` |
| Question Studio (AI generation) | UI `src/lib/admin/question-studio`, backend `src/convex/questionStudio/*` (jobs, workers, review, saving)                                    |
| Documents, RAG and OCR          | `src/convex/ragKnowledge/*` (Node actions), `documentIngestion*.ts`, `datalab.ts`, `r2Documents.ts`                                          |
| Progress and stats              | `src/convex/progress.ts`, `userProgress.ts`, `studyProgress.ts`, `moduleStats.ts` (rollups, `hasInteraction`)                                |
| Badges                          | `src/convex/badges.ts`, `badgeEngine.ts`                                                                                                     |
| Schema                          | `src/convex/schema.ts`                                                                                                                       |
| Plans, benchmarks and history   | `dev/` (`dev/archive/` holds finished plans; hidden from search via `.ignore`)                                                               |

## Conventions (reuse these; don't re-implement them)

- **Convex auth:** use the helpers in `src/convex/access.ts` (`requireCurrentUser`, `requireClassAccess`, `requireModuleAccess`, `requireCohortAccess`, `requireCohortStaff`, `requireClassStaff`, …) or the role-gated wrappers in `src/convex/authQueries.ts` (`authQuery`, `authAdminQuery`, `authAdminMutation`, `authCuratorMutation`, `authDevQuery`). Never write another users-by-`clerkUserId` lookup. `dev` bypasses cohort boundaries; everyone else is scoped to their cohort. Add a case to `convex-tests/security.test.ts` for any new public function.
- **Convex function paths:** call functions through their real module path (`api.questionStudio.jobs.createGenerationJob`). Don't add barrel files that re-export Convex functions: every export registers a second public endpoint.
- **AI models:** every model ID lives in `src/convex/aiModels.ts` (`TEXT_MODEL`, `OPENROUTER_TEXT_MODEL`, `EMBEDDING_MODEL`). The Datalab OCR model stays in `datalab.ts`.
- **Rendering HTML:** question stems, options and rationales are rich HTML. Always render them with `{@html sanitizeHtml(x)}` (`$lib/utils/sanitizeHtml`), and put `<!-- eslint-disable-next-line svelte/no-at-html-tags -->` on the line above.
- **Formatting:** `$lib/utils/format.ts` has `formatBytes` and `formatClock`. `$lib/utils/errorHandling.ts` has `getErrorText` and `isConvexAuthError`.
- **UI:** use DaisyUI classes (`modal`, `btn`, `card`, …) and `lucide-svelte` icons. Use `Sheet.svelte` for mobile bottom sheets and `resolve()` from `$app/paths` for internal links.
- **Svelte 5:** use runes (`$state`, `$derived`, `$effect`, `$props`). Prefer a writable `$derived` over `$state` plus an `$effect` that copies.
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
