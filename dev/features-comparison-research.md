# Features comparison research

Reviewed September 22, 2026. Page: `/features`.

## Positioning

LearnTerms is a shared, course-aligned question bank for daily health-professions coursework. Its strongest combined workflow is curator-managed lecture content, multiple question formats, explanations and source pages, personal review tools, and cohort progress. The page makes a fit-based argument and makes no comparative claims about grades, retention, pass rates, or time saved.

Compare Anki core desktop/mobile workflows, Quizlet including paid study tools, and UWorld USMLE (primarily Step 1). Identify UWorld institutional capabilities separately. Do not generalize these findings to UWorld nursing, MCAT, or other products.

## Research record

The 20 official sources, URLs, and per-cell references are maintained in `src/lib/content/features.ts`. The page contains 28 comparison rows in five groups. Source text is paraphrased. “Not documented” means the reviewed documentation did not establish the capability, not that it is impossible or absent from every product version.

Tavily research could not start because the stored OAuth refresh failed. Research continued through web search and direct reads of official product documentation.

Key findings:

- Anki supports FSRS scheduling, filtered decks, flags, detailed statistics, custom fields/templates, cloze deletion, image occlusion, local collections, and exports. User ratings drive normal recall grading. Add-ons and custom templates can extend the core workflow; deck sharing is not equivalent to a centrally published cohort bank.
- Quizlet supports AI Practice Tests from uploaded notes and sets, including written answers and time limits. This is distinct from ordinary Test mode, whose help page says progress is lost on exit. Class sharing and teacher progress tracking are supported. Paid access, age, language, region, and platform affect availability.
- UWorld includes physician-authored exam questions, explanations, timed/tutor modes, flashcards with spaced repetition, a notebook, performance reporting, and saved test history. Its institutional platform supports assignments and class analytics. Avoid implying it lacks these features.
- LearnTerms currently has no dedicated flashcard mode, FSRS-style due-date scheduling, native mobile app, or complete offline study flow. The table states these differences explicitly.

## LearnTerms implementation evidence

These paths were inspected in the working tree. They establish implemented behavior; this task did not verify the current production release.

| Claims | Evidence |
| --- | --- |
| Classes, modules, cohort organization | `src/routes/classes/+page.svelte`, class/module study routes, existing agent guide |
| Lecture generation and curator review | `src/lib/admin/question-studio/`, `src/lib/admin/questions/`, existing Question Studio UI |
| Source document/page links and citation excerpts | `src/lib/components/QuestionSources.svelte` |
| MCQ, multi-select, matching, blanks, free response | `src/lib/components/MainQuiz.svelte`, `AnswerOptions.svelte`, `FillInTheBlank.svelte`, `FreeResponse.svelte` |
| Image attachments and zoom | `src/lib/components/ImageViewer.svelte`, study UI |
| Custom test scope, count, types, timing | `src/routes/classes/[classId]/tests/new/+page.svelte` |
| Saved tests and result review | `src/routes/classes/[classId]/tests/[attemptId]/+page.svelte`, results route |
| Answer status, flags, missed-question filters, saved progress | `src/routes/classes/[classId]/modules/[moduleId]/states.svelte.ts`, `MainQuiz.svelte`, `ModuleCompletion.svelte` |
| Personal question notes | `src/lib/components/question-notes/QuestionNotesPanel.svelte`, `QuestionNoteEditor.svelte` |
| Stem highlights | `src/lib/components/HighlightedStem.svelte` |
| Mastery semantics | `src/lib/components/ModuleCompletion.svelte`: two correct first checks in completed runs at least 30 minutes apart |
| Staff progress | `src/lib/admin/progress/StudentStatsContent.svelte`, `src/routes/admin/progress/+page.svelte` |
| Curator exports | `src/lib/admin/catalog/ExportModuleModal.svelte` |
| Free student access and curator tiers | `src/routes/pricing/+page.svelte` |

Content and source availability depend on what the cohort publishes. Free response belongs to module study; custom tests currently offer MCQ, blanks, and matching. These scope notes are visible on the page.

## Page integration

- Footer Features link points to `/features`.
- Central SEO metadata and `publicPaths` include the route; the sitemap derives from that list.
- The comparison defaults to all 28 rows. Category buttons filter the view. Cells use checkmarks, caution signs, and dashes; original descriptions are available on hover or focus.
- On mobile, the same semantic table displays LearnTerms and one selected competitor.
- Per user direction, the page has no hero, eyebrows, reviewed-date chips, narrative sections, or links. Official source URLs remain in the content data and this research record.
