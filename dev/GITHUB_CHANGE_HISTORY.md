# LearnTerms GitHub change history

This is the research record for the public `/changelog` page, covering code published in [`jdang00/learnterms`](https://github.com/jdang00/learnterms) from the [first commit](https://github.com/jdang00/learnterms/commit/47b0f4e8e2f71d64ee2fe7fbe410f3bf78e57604) on September 3, 2024 (US Central time), through September 22, 2026. GitHub records the repository as created on September 4, 2024 (UTC). There is no earlier commit history in this repository.

The dated entries below use GitHub release publication and PR merge dates when those exist. Otherwise they use the date of a commit reachable from `main`. A merge into `main` establishes that code was published on GitHub; only a tagged release is called a release here. The links are representative evidence for each change, rather than a claim that every commit was reviewed or that every feature is currently available in production. There were no new `main` commits in May or August 2026; May appears here because two PRs merged on May 1 UTC. Months without a substantive change are omitted from the public timeline.

| Published release | GitHub date (UTC) | Tag |
| --- | --- | --- |
| [LearnTerms 1.0](https://github.com/jdang00/learnterms/releases/tag/releases) | September 23, 2024 | `releases` |
| [LearnTerms v2](https://github.com/jdang00/learnterms/releases/tag/v2) | March 1, 2025 | `v2` |
| [LearnTerms v3](https://github.com/jdang00/learnterms/releases/tag/v3) | March 20, 2026 | `v3` |

The October 2024 “1.1” label appears in a [commit](https://github.com/jdang00/learnterms/commit/15d0bcf), not a separate GitHub release.

## 2026

### September

- [PR #155](https://github.com/jdang00/learnterms/pull/155) merged the refreshed Question Studio and Content Library: source-page and topic mapping, editable evidence-backed candidates, R2 uploads, Datalab processing, and worker and budget tracking. Its description records production verification of a synthetic end-to-end document-to-draft flow.
- [Class progress and join-class access](https://github.com/jdang00/learnterms/commit/ca52c07) were redesigned, followed by a [live curator dashboard and module stats rollup](https://github.com/jdang00/learnterms/commit/1429b29).
- [Study dock, progress, stem highlighting, and announcement](https://github.com/jdang00/learnterms/commit/630155c) added saved dock behavior, progress and completion feedback, and persistent learner highlights. [A follow-up](https://github.com/jdang00/learnterms/commit/e3493c1) made mastery feedback passive and improved progress navigation.
- [Quiz tools](https://github.com/jdang00/learnterms/commit/4eee54d) added calculator and private question-note panels, source editing and previews, and a tools bar. [Telemetry](https://github.com/jdang00/learnterms/commit/569a07a) added study-tool events with question context.
- [Cohort authorization](https://github.com/jdang00/learnterms/commit/2a16ddd) tightened server-side access checks and blocked self-service switching after cohort assignment. [Clerk route and onboarding fixes](https://github.com/jdang00/learnterms/commit/a74d8e9) repaired nested auth routes and display names for users without names.
- [Mobile quiz and free-response changes](https://github.com/jdang00/learnterms/commit/b843173) added free-response checking and responsive quiz changes. [Join-flow refinements](https://github.com/jdang00/learnterms/commit/b9c6538) also updated the small-screen announcement and cohort image setting.
- [Text generation model selection](https://github.com/jdang00/learnterms/commit/a05cbc4) moved to GPT-6 Luna.

### July

- [Question Studio generation](https://github.com/jdang00/learnterms/commit/920aeca) was simplified, then [drafting turns were batched](https://github.com/jdang00/learnterms/commit/b898238) and [workers moved to a tool-first flow](https://github.com/jdang00/learnterms/commit/8810cf8).

### June

- [PR #154](https://github.com/jdang00/learnterms/pull/154) enabled account setup through the join-class flow.
- [Question Studio workflow](https://github.com/jdang00/learnterms/commit/c794770) and [AI generation](https://github.com/jdang00/learnterms/commit/2dd4fe3) were redesigned.
- [Cohort-managed quick links](https://github.com/jdang00/learnterms/commit/fcf3fe9) and [link categories](https://github.com/jdang00/learnterms/commit/d6e3e8c) were added.

### May

- [PR #152](https://github.com/jdang00/learnterms/pull/152) added quiz and finals-season badges, and [PR #153](https://github.com/jdang00/learnterms/pull/153) added the badge display modal. The underlying commits were made April 30 Central time; the PRs merged May 1 UTC.

### April

- [PR #145](https://github.com/jdang00/learnterms/pull/145) added configurable class-card patterns and colors. [PR #146](https://github.com/jdang00/learnterms/pull/146) expanded rich-text editing and study navigation.
- [PR #147](https://github.com/jdang00/learnterms/pull/147) redesigned the grade calculator and updated its course rules; [PR #149](https://github.com/jdang00/learnterms/pull/149) corrected course point values.
- [PR #150](https://github.com/jdang00/learnterms/pull/150) improved question-editor validation and errors; [PR #151](https://github.com/jdang00/learnterms/pull/151) repaired matching answer selection.
- [PR #142](https://github.com/jdang00/learnterms/pull/142) added a **prototype** Study Space route with mock sources, chat, and questions, alongside accessibility and sanitization fixes. The route uses mock content, so the public changelog does not present it as a live study feature. [PR #143](https://github.com/jdang00/learnterms/pull/143) and [PR #144](https://github.com/jdang00/learnterms/pull/144) addressed inline-editor behavior, and [PR #148](https://github.com/jdang00/learnterms/pull/148) improved return-to-module navigation.
- [Quick links](https://github.com/jdang00/learnterms/commit/c16dee2) were added to navigation and the power bar before cohort-managed links arrived in June.

### March — v3

- [LearnTerms v3](https://github.com/jdang00/learnterms/releases/tag/v3) was published March 20. The release documents the Svelte 5, Convex, Clerk, and Bun platform; the school/cohort/class/module data model; rebuilt student and admin flows; Content Library and Question Studio; custom tests; badges; and progress and analytics.
- [PR #141](https://github.com/jdang00/learnterms/pull/141) renamed question explanations to rationales with compatibility and backfill support. [Sanitization and accessibility changes](https://github.com/jdang00/learnterms/commit/02c65f7) followed later in March.
- [Matching and answer stability](https://github.com/jdang00/learnterms/pull/136) and [landing and results formatting](https://github.com/jdang00/learnterms/pull/137) were merged earlier in March. The [changelog](https://github.com/jdang00/learnterms/pull/140) was added March 20. Custom tests and the power bar were introduced in February, before the v3 tag.

### February

- [Custom test building](https://github.com/jdang00/learnterms/pull/130) added selected question pools, timed attempts, scoring, review, and recent attempts; [follow-up fixes](https://github.com/jdang00/learnterms/pull/131) stabilized test mode.
- [Power bar](https://github.com/jdang00/learnterms/pull/129), [mobile solution and question-switching updates](https://github.com/jdang00/learnterms/pull/128), and a [new landing page](https://github.com/jdang00/learnterms/pull/127) updated study and public flows.
- [Badges and cohort redesign](https://github.com/jdang00/learnterms/commit/e4183a6), [AI question generation](https://github.com/jdang00/learnterms/pull/117), [AI helper tuning](https://github.com/jdang00/learnterms/pull/124), and [Open Graph fixes](https://github.com/jdang00/learnterms/pull/118) expanded the platform.

### January

- [PostHog reintegration](https://github.com/jdang00/learnterms/pull/103), [tags](https://github.com/jdang00/learnterms/pull/105), [flag tracking](https://github.com/jdang00/learnterms/pull/106), and [stats](https://github.com/jdang00/learnterms/pull/109) improved discovery and reporting.
- [Content and question workflow redesign](https://github.com/jdang00/learnterms/pull/107), [new curation setup](https://github.com/jdang00/learnterms/pull/108), and [curation ergonomics](https://github.com/jdang00/learnterms/pull/112) expanded editor tooling.
- [Developer class management](https://github.com/jdang00/learnterms/pull/114), [admin and student interface redesign](https://github.com/jdang00/learnterms/pull/115), and [billing implementation](https://github.com/jdang00/learnterms/commit/e1be2b2) completed the month's larger changes.

## 2025

### December

- [Dashboard stats](https://github.com/jdang00/learnterms/pull/99) and [user backfill](https://github.com/jdang00/learnterms/pull/98) changed reporting foundations.
- [Long-running query fixes](https://github.com/jdang00/learnterms/pull/96) and [removal of an expensive progress cache](https://github.com/jdang00/learnterms/pull/101) simplified data access. [Stored module question counts](https://github.com/jdang00/learnterms/pull/102) replaced calculated counts.

### November

- The [About page](https://github.com/jdang00/learnterms/pull/95) and [grade calculator](https://github.com/jdang00/learnterms/commit/5bc394c) received updates.

### October

- [Fill-in-the-blank and matching progress](https://github.com/jdang00/learnterms/pull/91) began contributing to study progress. [Reset fixes](https://github.com/jdang00/learnterms/pull/92) and an [attachment viewer blur fix](https://github.com/jdang00/learnterms/pull/93) followed.

### September

- [Matching answer shuffle](https://github.com/jdang00/learnterms/pull/88), [matching fixes](https://github.com/jdang00/learnterms/pull/90), and [fill-in-the-blank persistence](https://github.com/jdang00/learnterms/commit/d6cbf2d) stabilized question formats.
- [Question-editor and duplicate-content fixes](https://github.com/jdang00/learnterms/commit/d77fc4d) improved authoring.

### August

- [Question CRUD and admin curation](https://github.com/jdang00/learnterms/pull/53), [Content Library](https://github.com/jdang00/learnterms/pull/57), and [AI generation](https://github.com/jdang00/learnterms/pull/59) established the early v3 content workflow.
- [Progress bandwidth changes](https://github.com/jdang00/learnterms/pull/72), [search and docs](https://github.com/jdang00/learnterms/pull/73), and [question images](https://github.com/jdang00/learnterms/pull/76) improved study and management.
- [Cohort module security](https://github.com/jdang00/learnterms/pull/78) closed an access gap.

### July

- [Convex migration](https://github.com/jdang00/learnterms/commit/e9fb836) began; [modules were migrated](https://github.com/jdang00/learnterms/commit/b15c3b6), and [class navigation was overhauled](https://github.com/jdang00/learnterms/commit/2344fc6).

### June

- [Ocular Motility course information](https://github.com/jdang00/learnterms/pull/40), a [chatbot](https://github.com/jdang00/learnterms/pull/41), and a [pocket guide](https://github.com/jdang00/learnterms/pull/45) were added. [The Ocular Motility section was retired](https://github.com/jdang00/learnterms/pull/48) at month's end; the public changelog records the period as historical rather than a current feature list.

### May

- [Course-store updates](https://github.com/jdang00/learnterms/pull/39) adjusted course content and state handling.

### April

- [Calculator and dashboard](https://github.com/jdang00/learnterms/pull/34) work expanded study tools. [Grade calculations](https://github.com/jdang00/learnterms/pull/37) and a [pharmacology/course update](https://github.com/jdang00/learnterms/pull/38) followed.

### March — v2

- [LearnTerms v2](https://github.com/jdang00/learnterms/releases/tag/v2) was published March 1. Its release notes describe broader exam practice, question shuffle, flags, answer elimination, progress, and keyboard shortcuts, plus an AI-assisted content workflow.
- [Dashboard overhaul](https://github.com/jdang00/learnterms/pull/29), [challenge questions](https://github.com/jdang00/learnterms/pull/26), [question uploads](https://github.com/jdang00/learnterms/pull/27), and [AI generation changes](https://github.com/jdang00/learnterms/pull/30) followed the tag.

### February

- [Quiz routing and reset fixes](https://github.com/jdang00/learnterms/pull/4) stabilized the v2 beta. [Admin dashboard](https://github.com/jdang00/learnterms/pull/7), [route protection](https://github.com/jdang00/learnterms/pull/8), and [admin features](https://github.com/jdang00/learnterms/pull/10) prepared the v2 release.

### January

- [v2 beta](https://github.com/jdang00/learnterms/commit/dd1d981) began. [Answer elimination](https://github.com/jdang00/learnterms/commit/bf37960), [saved answers](https://github.com/jdang00/learnterms/commit/be5de29), [shuffle and progress](https://github.com/jdang00/learnterms/commit/2ae5b36), and [mobile navigation](https://github.com/jdang00/learnterms/commit/4790eef) developed the exam-style study flow.

## 2024

### December

- [Svelte 5 migration](https://github.com/jdang00/learnterms/commit/2fc2e4c) and [exam-style quiz work](https://github.com/jdang00/learnterms/commit/4770c82) began a larger rebuild. [Solution display](https://github.com/jdang00/learnterms/commit/eb1abb2) and [landing-page work](https://github.com/jdang00/learnterms/commit/fef7533) followed.

### October–November

- [LENS](https://github.com/jdang00/learnterms/commit/25038be) and [PostHog tracking](https://github.com/jdang00/learnterms/commit/3e74152) appeared in October. [LearnTerms 1.1 saved progress](https://github.com/jdang00/learnterms/commit/15d0bcf) was published October 25. November's reachable `main` commits are small cleanup and reset changes.

### September — 1.0

- The [first commit](https://github.com/jdang00/learnterms/commit/47b0f4e8e2f71d64ee2fe7fbe410f3bf78e57604) created the SvelteKit scaffold. [Flashcard logic](https://github.com/jdang00/learnterms/commit/1318e36) arrived the next day. [Guest access](https://github.com/jdang00/learnterms/commit/cd951d8), [starring](https://github.com/jdang00/learnterms/commit/7aec5d8), [starred-card review](https://github.com/jdang00/learnterms/commit/2ea7db8), [search and deck views](https://github.com/jdang00/learnterms/commit/ce1a8b5), and [mobile changes](https://github.com/jdang00/learnterms/commit/e0fece8) developed the initial study experience.
- [LearnTerms 1.0](https://github.com/jdang00/learnterms/releases/tag/releases) was published September 23. Its release notes describe typed term recall, starred and missed-card review, deck/table search, themes, and optional login.
