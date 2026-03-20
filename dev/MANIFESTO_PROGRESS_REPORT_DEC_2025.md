## LearnTerms Manifesto: Progress Report, Corrections, and Next Steps (as of 21 Dec 2025)

**Context:** This document is written after reading `dev/THE_LEARNTERMS_MANIFESTO.md` as-is and then auditing the current repository (SvelteKit + Convex codebase) to compare the manifesto’s claims against what’s actually implemented today.

This is not a “critique of the vision.” It’s a **reality check + progress log**: what’s been achieved, what changed, what’s outdated/inaccurate in the original text, and the clearest path to tighten the product and the story going forward.

---

## Executive Summary

Your manifesto is strong because it’s **rooted in lived pain**, it has **non-negotiable values**, and it frames the product as a *student-led learning system*, not generic edtech. That tone is rare and it matters.

The biggest update is simple: the manifesto’s “v2 architecture” section is now clearly historical. The codebase in this repo is already operating as a **v3 implementation**:

- **Backend**: Convex (schema, queries/mutations/actions, real-time client queries)
- **Auth**: Clerk (role/permissions in `publicMetadata`)
- **Frontend**: SvelteKit + Svelte 5 runes + Tailwind v4 + daisyUI v5
- **AI**: Gemini via `@google/genai` (question generation + document chunk extraction pipelines)

From a product standpoint, the “Exam Module” vision is partially realized: the current module study UI already includes exam-like ergonomics (fullscreen, navigation, elimination, flags, autosave progress, keyboard shortcuts). What’s missing is the **“test-day simulation” layer** (timed sessions, exam assembly, locking, scoring reports, exam review modes).

The AI system is more real than the manifesto implies: it’s not just an idea. There’s a real **Question Studio** that selects course content, generates questions, and saves them into modules. There’s also a real **document → chunk** pipeline (including PDF extraction and parallel chunking via server endpoints, and storage in Convex) that supports both study and generation workflows.

---

## Feedback on the Manifesto (as written)

### What’s strong

- **The problem statement is vivid and specific**: the “typo costs a point” and “100+ terms” details make the mission legitimate and memorable.
- **You’ve defined non-negotiables** (“privacy”, “for students by students”, “no ads/data sales”) which are exactly the kind of guardrails that prevent a good product from turning into a cynical one.
- **You connect product decisions to real user behaviors** (GroupMe feedback loops, curated corrections, high-yield emphasis). That is the correct anchor for future roadmap debates.
- **The “speed without sacrificing quality” theme is consistent with the repo** (Svelte, daisyUI, heavy use of reactive queries, quick admin workflows).

### What could be tighter

- **The doc mixes “history” with “present tense architecture”** in a way that will keep drifting as the code evolves. Technical architecture should be treated as a snapshot with a clear “as of” date and a changelog trail.
- **Some sections overclaim certainty** (model choice, schema details, infrastructure specifics). These age quickly and become “false” even when the strategy is correct.
- **The “v1/v2/v3” story is compelling**, but it needs a clean update now that the repo is already v3 (Convex-first).

---

## Where LearnTerms Is Today (Repo Reality)

This repo is already a coherent “v3” stack.

### Current stack (verified in repo)

- **Frontend**: SvelteKit, Svelte 5 (runes)
- **Styling**: TailwindCSS v4 + daisyUI v5
- **Backend / DB**: Convex (tables for school/cohort/semester/class/module/question/userProgress/content library, plus indexes + search index)
- **Auth**: Clerk (server protection + Convex identity checks; roles in `publicMetadata`)
- **AI**:
  - **Question generation**: Convex action `question.generateQuestions` called via SvelteKit `/api/generate`
  - **Document chunking/extraction**: SvelteKit `/api/processdoc` (+ parallel + streaming variants) + Convex `chunkContent` storage
- **Ops/Platform signals**: Vercel analytics/speed insights dependencies exist

### Current data model supports scaling (multi-school → cohort → semester → class → module)

The Convex schema is already designed for the multi-tenant future the manifesto describes:

- `school` → `cohort` → `class` (with `semester`) → `module` → `question`
- `users` attach to a `cohort`
- `userProgress` is per-user, per-class, per-question
- `contentLib` and `chunkContent` attach to a `cohort` (shared library) and a `document` (chunks)

This is a major milestone: you’ve moved past “single cohort hard-coded” into a **first-class organizational graph**.

---

## Goal-by-Goal Audit: “Have We Met the Manifesto Goals?”

This section maps the manifesto’s principles and claimed capabilities to what is already implemented.

### Simplicity (product + code)

- **Met (product)**: The primary flows are clear:
  - Sign in
  - Join cohort via class code
  - Browse classes → modules → questions
- **Met (UI)**: daisyUI usage keeps things consistent, and the quiz UI is cohesive.
- **Partially met (code)**: Code organization is decent (components in `src/lib`, routes in `src/routes`, Convex functions in `src/convex`), but there are a few “drift” points in docs and some data access patterns (see improvements section).

### Speed (iteration + runtime)

- **Met (iteration)**: The admin tooling (question studio, library, edit modals) shows a bias toward shipping.
- **Met (runtime)**: Svelte 5 + Convex reactive queries are aligned with fast-feeling UI.
- **Risk**: Some Convex queries use `.filter` where indexes could be used. Today it’s probably fine at current scale, but it becomes a performance risk as cohorts and content expand.

### Community + curation workflows

- **Met (structure)**: There is a real separation between normal student flows (`/classes/...`) and admin tooling (`/admin/...`).
- **Met (roles)**: Admin / contributor roles exist (checked via Clerk `publicMetadata`).
- **Partially met (feedback loop)**: The manifesto imagines in-app feedback and structured flagging/reporting. Current UI supports **flagging for personal study**, but not necessarily “report this question is wrong” as a curated pipeline.

### Built to scale (multi-school, multi-cohort)

- **Strongly met at the data model level**: school/cohort/class/semester/module exists and is used.
- **Partially met at the onboarding/admin level**:
  - Students can self-join a cohort via a code.
  - Creating new schools/cohorts/classes/modules still appears admin-driven (which is fine), but the dream “self-service onboarding” is not fully realized yet.

### Privacy-first

- **Intent is consistent**: No ads are present in the codebase.
- **Reality caveat**: There are analytics packages present (Vercel analytics/speed-insights). That’s not inherently against the manifesto, but the privacy section should acknowledge what “analytics” means operationally (what’s collected, opt-out stance, and where it lives).

---

## The “Exam Module” Vision: What’s Implemented vs Missing

### Implemented now (real exam-like ergonomics)

The study UI inside a module already has meaningful exam-like features:

- **Fullscreen exam-like mode**
- **Question navigation**
- **Answer elimination**
- **Flagging**
- **Filters** (show flagged, show incomplete)
- **Auto-next on correct**
- **Keyboard shortcuts**
- **Progress persistence** (selected answers, eliminated options, flag state saved to Convex)

These are the “high ROI” parts of exam UX: they reduce friction and let students stay in flow.

### Still missing (the true “simulation” layer)

If the manifesto promises an Examplify-like test-day simulation, the missing pieces are roughly:

- **Timed sessions** (countdown, pause/resume rules)
- **Exam assembly** (create an “exam” that spans modules or custom sets)
- **Locks** (no solution view until submission, or configurable modes)
- **Scoring + review reports** (percent correct, question review, categories)
- **Attempt history** (track attempts over time and show performance deltas)
- **Exam mode UX** (a distinct mode, not just “module study in fullscreen”)

This isn’t a criticism; it’s a roadmap clarification. You’ve already built the core mechanics. The simulation layer can now be a focused, testable feature set.

---

## AI Integration: Reality Check and What’s Actually Built

### Question generation (shipped)

There is a real question generation pipeline:

- A curator selects material (often from chunked documents).
- The UI calls `/api/generate`.
- `/api/generate` calls a Convex **action** that runs Gemini via `@google/genai`.
- The result is normalized into LearnTerms’ question structure (type/stem/options/correctAnswers/explanation/metadata).
- The Question Studio can then **bulk insert** generated questions into a module.

This is already a real “content engine,” not a concept.

### Document chunking / extraction (shipped, fairly sophisticated)

There is a real document processing pipeline:

- Upload/select documents in a cohort library.
- Process text or PDFs via `/api/processdoc` and related endpoints (including streaming/parallel variants).
- Store extracted chunks as structured objects in Convex (`chunkContent`) tied to a document (`contentLib`).
- Browse chunks and select excerpts for generation.

Important nuance: the chunking endpoint is explicitly designed for **extraction without paraphrasing** (“NO PARAPHRASING”). That’s a meaningful design choice and should be reflected in future narrative: it’s not “RAG magic,” it’s *controlled transformation*.

### Model reality (what’s changed since the manifesto)

The manifesto references “Gemini 2.5 Pro” and “1 million token context window.” The current repo uses Gemini models via `@google/genai`, but the specific model IDs referenced in code are **different** (example: `gemini-3-flash-preview` for chunking and configurable model IDs for generation).

That doesn’t invalidate the strategy, but the manifesto’s exact model claims should be updated.

---

## Admin + Content Management: What’s Implemented

### Admin dashboard exists (shipped)

Admin routes exist and are protected server-side. The admin area includes:

- **Class/module management** (modals + reorder flows)
- **Question creation and editing**
- **Question Studio** (generate + insert)
- **Content Library** (documents + chunks)

### Cohort join flow exists (shipped)

The student onboarding flow is now concrete and self-serve:

- If a signed-in Clerk user has no Convex user record, the app creates one and routes them to join.
- If they have no cohort assignment, they must join via a class code.

This is a big milestone toward “scaling without developer intervention.”

---

## Inaccurate / Outdated Information in the Manifesto (and Related Docs)

This section is intentionally blunt so you can confidently update the historical record.

### v2 backend details (Supabase/Postgres) are no longer accurate for this repo

- **Manifesto says**: v2 runs on Supabase/Postgres with Supabase client SDK and JSONB question blobs.
- **Repo reality**: this repo uses **Convex** as the database/backend. There are no meaningful Supabase references in the codebase outside the manifesto text itself.
- **Update needed**: treat the Supabase description as “past tense v2” and add a v3 section describing Convex as the active system.

### Exact table names and schema details described for v2 do not match v3

- **Manifesto says**: tables like `pharmquestions`, `pharmchallenge`, etc.
- **Repo reality**: tables are `question`, `module`, `class`, `cohort`, `userProgress`, `contentLib`, `chunkContent`, etc.
- **Update needed**: remove the hard-coded v2 table list from any “current architecture” framing.

### Model claims have drifted

- **Manifesto says**: “Gemini 2.5 Pro” with “1 million token window,” positioned as the core reason quality improved.
- **Repo reality**: Gemini is still the foundation, but:
  - model IDs used in code are different than “2.5 Pro”
  - the system relies on structured JSON schemas and constrained prompts to enforce output shape
- **Update needed**: talk about “Gemini via structured prompting + schema validation” rather than anchoring on a specific model generation.

### A related dev doc is now inaccurate: `dev/GEMINI.md`

`dev/GEMINI.md` claims Tailwind configuration is in `tailwind.config.js`, but this repo is Tailwind v4-style and does not appear to rely on that file (configuration is handled via CSS / build tooling patterns). This isn’t a product issue, but it’s exactly the kind of “doc drift” that causes confusion for collaborators.

### “Pro / Teams” positioning exists in UI, but enforcement isn’t obvious in code

There is a pricing page describing Free/Pro/Teams. That’s fine, but if the manifesto emphasizes “paywall-free core,” it would be good to clarify what is actually gated today (if anything) and what is merely planned.

---

## How to Improve: Concrete Recommendations (Prioritized)

This is a practical roadmap focused on strengthening what’s already built.

### High-impact “quick wins” (days)

- **Documentation truth pass**
  - Add a small “v3 architecture addendum” to the manifesto (or reference this doc).
  - Fix or replace `dev/GEMINI.md` so it matches reality (Svelte 5 runes, Tailwind v4 patterns, Convex/Clerk/Gemini).

- **Convex query/index hygiene**
  - Identify “hot path” queries using `.filter` where an index should exist (users by clerkUserId, cohort by classCode, contentLib by deletedAt patterns, modules by status).
  - Add the missing indexes and switch to `.withIndex` so scaling doesn’t degrade silently.

- **Permissions tightening**
  - Ensure any mutation that changes cohort membership or content is consistently protected (right now, there are multiple `joinCohort` implementations across files; unify the intended one and lock it down).

### Medium-term product upgrades (weeks)

- **Finish the “Exam Module” promise**
  - Add “exam session” entities (exam config, question set, mode flags, timers).
  - Implement timed mode + scoring + review.
  - Keep the current module UI as “Practice Mode,” and add an explicit “Exam Mode.”

- **Close the feedback loop**
  - Add “Report question issue” (separate from personal flagging).
  - Add a curator triage queue in admin.
  - Add changelog/patch notes per question to keep trust high.

- **Make progress tracking a first-class product surface**
  - You already store `userProgress`. Use it for:
    - spaced repetition scheduling
    - “review missed/flagged/incomplete” sets
    - mastery states (if you intend to use `isMastered`, define the rules)

### Longer-term scaling upgrades (months)

- **True self-service onboarding**
  - Admin creates school/cohort, gets a join code, assigns initial roles.
  - Students join and are placed correctly without manual patching.
  - Add a “cohort health” view: number of users, number of questions, activity.

- **Operational maturity**
  - Add clearer environment-variable docs (Convex URLs, Clerk config, Gemini key, UploadThing token, app base URL).
  - Add monitoring/error dashboards that match your privacy stance.

---

## Suggested “v3 Addendum” to the Manifesto (What I’d Change in the Text)

If you want the manifesto to remain a “source of truth,” it needs a lightweight update pattern.

- **Add a new section:** “Technical Architecture (as of Dec 2025 / v3)”
  - SvelteKit + Svelte 5 + Tailwind v4 + daisyUI v5
  - Convex as the reactive DB + function backend
  - Clerk for auth + roles
  - Gemini via structured schema-driven generation (questions) and extraction (chunks)

- **Move the Supabase section into “v2 retrospective”**
  - Keep it as history and lessons learned (it’s valuable), but mark it clearly as not current.

- **Reframe AI claims**
  - Replace “we win because 1M tokens” with:
    - “we win because prompt + structure + human curation + tight UI workflow”

- **Clarify the Exam Module promise**
  - State what is already shipped (practice UX with exam-like features)
  - State what the full simulation will include (timer, scoring, modes)

---

## Closing Note

The most important result of this audit is not “the manifesto is outdated.” It’s that the manifesto’s direction proved correct: the repo now embodies the v3 move (Convex), the student-led content engine (Question Studio), and the exam-like study experience (practice UI with real test ergonomics).

What you need next is mostly *clarity and tightening*, not reinvention: update the story so it matches reality, finish the exam simulation layer deliberately, and keep the data/query discipline clean so scaling stays smooth as cohorts multiply.


