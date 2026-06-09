# LearnTerms v4 Trinity: Restructuring Plan

**Document version:** 0.1  
**Date:** June 8, 2026  
**Status:** Future architecture and product plan

---

## Executive Summary

LearnTerms v4, code-named **Trinity**, should remain a managed, curator-controlled question bank first. Its major evolution is the addition of deeply integrated knowledge bases and agents that make the question bank faster to build, easier to maintain, and substantially more useful to study from.

The three foundational parts of Trinity are:

1. **Managed question banks** remain the authoritative, curated learning product for each class.
2. **Knowledge bases and agents** ground and accelerate question creation, explanations, flashcards, search, and curator maintenance.
3. **Learning telemetry** closes the loop by showing students what to study and showing curators where questions, source material, or learners need attention.

The key architectural shift is not away from question banks. It is away from AI operating mainly on one-off pasted context. Question generation and other AI actions should begin with an authorized knowledge base, retrieve relevant evidence, produce a structured result, cite its sources, and record enough telemetry to evaluate quality and cost.

v4 should also make class creation self-service. A class owner should be able to create a class, pay for a semester license, invite up to a defined seat limit, upload material, assign curators, and begin studying without developer intervention.

---

## Product Thesis

### Current model

The current product is correctly centered on managed question banks, but its AI pipeline is optimized around generating questions from supplied material. This creates several constraints:

- Source material is temporary context instead of a reusable institutional asset.
- Questions are generated in batches and become disconnected from their source.
- Students cannot consistently ask follow-up questions against the same trusted corpus.
- Corrections to source material do not naturally propagate to generated content.
- Quality, latency, model cost, and curator acceptance are difficult to compare across workflows.
- New class setup still depends too heavily on privileged operators and existing product structure.

### v4 model

In v4, the primary student-facing product remains the **managed class question bank**. Knowledge bases become the evidence and intelligence layer behind that bank.

Every class receives a persistent workspace containing:

- one or more managed question banks organized into classes and modules;
- source documents and links;
- parsed pages, sections, tables, and images;
- chunked and embedded knowledge;
- source metadata and version history;
- curator annotations and trusted summaries;
- source links and generation history for questions;
- supporting flashcards, explanations, and study guides derived from sources and questions;
- agent conversations and reusable outputs;
- learning and content-quality telemetry.

Published questions remain the authoritative class study content. RAG and agents supercharge the lifecycle around them: drafting questions, validating them against sources, improving distractors, explaining answers, generating related personal practice, detecting stale content, and helping curators act on telemetry. Flashcards and chat are complementary experiences, not replacements for the managed bank.

---

## Goals

### Product goals

- Make every managed question bank more grounded, searchable, explainable, and maintainable.
- Let students move from a question to an evidence-backed explanation or related flashcards in one action.
- Let curators create, review, regenerate, publish, and retire AI artifacts with full source visibility.
- Let a new customer create and operate a class without developer onboarding.
- Provide enough agentic value around the question bank that a student does not need a separate general-purpose AI study tool for normal course review.
- Preserve the student-led, privacy-first identity of LearnTerms.

### Technical goals

- Adopt OpenRouter as the model gateway and use selected OpenAI models by default.
- Use Convex components for agent state and RAG where they fit the production requirements.
- Enforce tenant isolation at every database, retrieval, agent, and analytics boundary.
- Stream user-facing AI responses and move expensive ingestion/generation to durable background jobs.
- Record token usage, retrieval quality, latency, errors, and user feedback for every AI run.
- Support model changes without rewriting product workflows.
- Keep common study actions fast even when AI services are unavailable.

### Non-goals for the first v4 release

- Fully autonomous publication of AI-generated educational content.
- Replacing human curators with agents.
- Training a proprietary foundation model.
- Supporting every document type or learning-management system at launch.
- Promising unlimited AI usage under a low fixed class fee.
- Building a general-purpose research assistant unrelated to enrolled classes.

---

## Experience Pillars

### 1. The question bank is the home base

The active class, module, and question-bank context should be consistently available across the site. Knowledge bases should work mostly behind the experience so students do not repeatedly upload the same files or re-explain their course context.

Recommended interface:

- A persistent class and module switcher in the main navigation.
- Question-bank-first entry points for study, review, and testing.
- A contextual **Ask this class** or **Ask about this question** action.
- Contextual AI actions on questions, modules, sources, and missed concepts.
- Clear source citations that open the relevant page or section.
- A visible distinction between curated, AI-generated, and personal content.

### 2. Expand outward from questions

From a managed question, a student should be able to:

- ask for a simpler or deeper explanation;
- generate personal flashcards;
- create a short practice set;
- compare related concepts;
- identify likely misconceptions;
- save the result to a personal study collection;
- share a draft with class curators where permissions allow.

Sources and agent responses may offer the same actions, but they should generally lead students back into curated questions and structured practice.

### 3. Curators control truth

AI can draft and recommend, but curators control what becomes class-visible. Curators need:

- source-linked artifact review;
- confidence and citation inspection;
- bulk approve, edit, regenerate, archive, and re-index operations;
- duplicate and contradiction detection;
- reports on frequently missed or disputed content;
- prompt/model/version history;
- rollback and audit logs.

### 4. Self-service classes

A class owner should be able to complete this flow:

1. Create an account and choose **Create a class**.
2. Name the institution, course, term, and expected enrollment.
3. Select or purchase a semester plan.
4. Accept content ownership, privacy, and acceptable-use terms.
5. Create the first knowledge base and upload sources.
6. Invite classmates by link, code, or approved email domain.
7. Assign additional owners or curators.
8. Publish the workspace when ingestion checks pass.

The system should enforce seat limits, storage limits, AI budgets, and lifecycle dates automatically.

---

## Proposed Domain Model

v4 should formalize multi-tenancy instead of inferring it indirectly from a user's cohort.

### Core hierarchy

```text
Organization / School
  -> Workspace / Class
      -> Term / Semester
          -> Knowledge Base
              -> Sources
                  -> Source Versions
                      -> Chunks
              -> Artifacts
              -> Agent Threads
              -> Learning Activity
```

### Principal entities

| Entity | Purpose |
|---|---|
| `organizations` | Optional school or customer grouping and billing parent |
| `workspaces` | Tenant and permission boundary for one class |
| `terms` | Semester dates, lifecycle, retention, and renewal |
| `memberships` | User role, status, seat, and workspace scope |
| `knowledgeBases` | Retrieval corpus with access and indexing policy |
| `sources` | Logical file, URL, note, or curator-authored reference |
| `sourceVersions` | Immutable ingestion version and checksum |
| `chunks` | Parsed retrieval units with page/section provenance |
| `artifacts` | Questions, flashcards, summaries, guides, and explanations |
| `artifactSources` | Evidence links between artifacts and chunks |
| `agentThreads` | Conversation state scoped to user and workspace/base |
| `agentRuns` | Model, retrieval, timing, token, cost, and outcome record |
| `events` | Append-only product and learning telemetry |
| `usageLedger` | Billable AI, storage, and seat usage |
| `auditLog` | Privileged changes and moderation actions |

All tenant-owned records should carry a direct `workspaceId`; records participating in retrieval should also carry `knowledgeBaseId`. Do not rely on multi-hop authorization to determine whether a chunk or artifact is accessible.

---

## Convex Architecture

### Convex RAG component

Use the Convex RAG component as the initial retrieval layer if it satisfies the following proof-of-concept gates:

- namespaces or filters can strictly isolate workspaces and knowledge bases;
- metadata can preserve source, version, page, section, and visibility;
- ingestion can be idempotent and old source versions can be removed safely;
- retrieval latency is acceptable at expected corpus sizes;
- the selected embedding provider is supported or can be integrated cleanly;
- evaluation data can expose retrieved chunk IDs and scores;
- cost and operational limits are acceptable at projected scale.

The component should own vector search, not product truth. Source metadata, permissions, ingestion status, and artifact relationships should remain in first-party Convex tables.

### Convex Agent component

Use the Convex Agent component for:

- persistent, resumable conversation threads;
- streaming assistant responses;
- tool invocation and structured tool results;
- context and message management;
- usage records associated with a thread and run.

Do not create one unconstrained universal agent. Define a small registry of purpose-specific agents:

| Agent | Primary tools | Publication rights |
|---|---|---|
| Study Tutor | retrieve, explain, compare, create personal cards | Personal only |
| Question Coach | retrieve, explain question, generate similar practice | Personal drafts |
| Curator Copilot | retrieve, draft artifacts, find conflicts, inspect analytics | Curator review queue |
| Ingestion Reviewer | inspect extraction, classify content, flag weak chunks | No direct publication |
| Admin Analyst | query approved aggregate telemetry | No content publication |

Every agent invocation must receive server-derived authorization context. The client must never be trusted to choose an arbitrary `workspaceId`, knowledge base, role, or tool permission.

### Durable ingestion workflow

Ingestion should be asynchronous and resumable:

```text
upload
  -> malware/type/size checks
  -> text and layout extraction
  -> page/section normalization
  -> chunking
  -> metadata enrichment
  -> embedding/indexing
  -> retrieval smoke test
  -> curator review
  -> active
```

Each stage should have an explicit status, attempt count, error, timestamps, and idempotency key. A source version becomes active only after its index passes validation. Replacing a document should create a new immutable version, then atomically switch the active version after indexing succeeds.

Store original files in object storage rather than Convex documents. Convex should store ownership, checksums, object references, extraction state, and searchable metadata.

### Retrieval pipeline

The default query pipeline should be:

1. Resolve the authenticated user and workspace membership.
2. Determine the allowed knowledge bases and source visibility.
3. Rewrite or decompose the query only when needed.
4. Retrieve a bounded candidate set.
5. Apply metadata filters and optional reranking.
6. Construct a token-budgeted context with source diversity.
7. Generate a structured, cited response.
8. Persist the run, citations, token counts, latency, and feedback hooks.

Where the evidence is insufficient or contradictory, the product should say so rather than invent an answer.

---

## OpenRouter and Model Strategy

### Provider migration

Replace direct Google GenAI calls with a server-only model gateway abstraction backed by OpenRouter. OpenRouter credentials must remain in Convex or server environment variables and must never reach the browser.

The abstraction should expose tasks rather than model names:

```text
fastTutor
deepTutor
questionDraft
flashcardDraft
ingestionEnrichment
embedding
rerank
evaluation
```

Each task maps to a configured model, timeout, retry policy, maximum output, and budget. This keeps the product independent from OpenRouter model slugs and permits controlled upgrades.

### Default policy

- Use a smaller OpenAI model for high-volume explanations, query rewriting, classification, and flashcard drafts.
- Use a stronger OpenAI reasoning model for difficult question generation, complex synthesis, and curator-requested deep explanations.
- Use deterministic structured output for artifacts.
- Pin model identifiers in production; do not silently follow an unversioned alias.
- Permit fallback models only when their quality and schema compatibility have been evaluated.
- Log the requested model, actual model/provider, tokens, latency, retries, and estimated cost.

OpenRouter is a gateway, not a guarantee of uniform behavior. Provider routing, data handling, model availability, rate limits, and structured-output support must be tested for each production route.

### Migration sequence

1. Wrap current Gemini calls behind the new task-based interface.
2. Add OpenRouter in shadow or curator-only mode.
3. Run a fixed evaluation set across old and new pipelines.
4. Compare correctness, citation support, curator acceptance, latency, and cost.
5. Move one low-risk task at a time.
6. Retain a kill switch and bounded fallback during the migration.
7. Remove Google-specific prompts, schemas, SDK code, and secrets after parity is proven.

---

## Question, Flashcard, and Explanation Performance

### Question delivery

The normal quiz experience is the core product and must not require an LLM call. Published questions, answers, explanations, media, and progress should load from indexed Convex queries.

Targets for common cached paths:

- question navigation feels immediate;
- progress writes are debounced and optimistic;
- module payloads are paginated or incrementally loaded;
- media is separately cached and lazy-loaded;
- aggregate analytics are precomputed rather than scanned on demand.

Final numerical service-level objectives should be based on production measurements, but v4 should instrument p50, p95, and p99 for all critical queries before setting launch gates.

### AI explanations

Each question can expose:

- **Explain this answer** using the question's cited source set;
- **Why is my choice wrong?** comparing the selected and correct options;
- **Teach the prerequisite** for a missing foundational concept;
- **Go deeper** for advanced context;
- **Show evidence** linking directly to source passages.

Published curator explanations should be returned instantly. AI generation should be used for personalized or missing explanations, streamed to the UI, cached by question/source-version/model/prompt version where privacy permits, and invalidated when the source or question changes.

### Flashcards

Support two distinct products:

- **Class flashcards:** curator-reviewed, shared, versioned, and source-linked.
- **Personal flashcards:** generated from a student's weak areas, saved privately, editable, and optionally submitted for curation.

Flashcard generation should avoid near-duplicates, include source citations, support cloze and front/back forms, and record the source version. A future spaced-repetition scheduler can use review events without changing the artifact model.

---

## Curation and Administration

### Curator console

The v4 curator home should prioritize decisions, not raw tables:

- ingestion failures and low-confidence extraction;
- artifacts awaiting review;
- sources changed since linked artifacts were published;
- questions with abnormal miss, flag, or dispute rates;
- unanswered student queries;
- duplicate or contradictory content;
- AI spend and usage anomalies;
- recommended updates with evidence.

### Content lifecycle

Use explicit states:

```text
draft -> in_review -> published -> needs_review -> archived
```

An artifact should enter `needs_review` when a linked source version changes materially, citations disappear, or telemetry crosses a configured quality threshold.

### Roles

Suggested workspace roles:

| Role | Capabilities |
|---|---|
| Owner | Billing, lifecycle, role assignment, all workspace settings |
| Admin | Membership, bases, sources, policies, analytics |
| Curator | Ingest, draft, review, publish, and maintain artifacts |
| Contributor | Create drafts and suggestions |
| Student | Study, ask, create personal artifacts, report issues |

Platform administrators should use separate audited capabilities. A workspace role must never implicitly grant platform-wide access.

### Telemetry

Capture events with a stable schema and avoid storing unnecessary raw prompts in broad analytics tables.

Important measurements:

- retrieval hit quality and citation coverage;
- answer helpfulness and unsupported-claim reports;
- generation acceptance, edit distance, regeneration, and rejection;
- question accuracy, distractor selection, flags, and explanation opens;
- flashcard creation, saves, edits, and reviews;
- active students and meaningful study sessions;
- ingestion time, failures, document size, and chunk counts;
- model tokens, cost, latency, errors, and fallback rate;
- per-workspace gross margin and budget consumption.

Sensitive student-level data should be visible only where necessary. Default curator dashboards to aggregates, enforce minimum cohort sizes for comparisons, and offer students clear privacy controls.

---

## Self-Service Onboarding and Billing

### Proposed semester plan

The idea of **$20 per class per semester for up to 100 classmates** is attractive as a low-friction pilot price, but it should not be treated as economically validated.

At 100 seats, this is only `$0.20` per student for an entire semester. Payment processing alone can consume a meaningful part of a $20 transaction, and AI-heavy usage can exceed the remaining revenue quickly. The plan is viable only if AI usage is tightly pooled and capped, subsidized, or sold separately.

### Recommended packaging experiment

Start with three concepts:

| Plan | Purpose | Limits |
|---|---|---|
| Free trial | Prove ingestion and study value | Small base, few seats, limited AI |
| Class Semester | Shared workspace and core study tools | Seat/storage allowance plus pooled AI credits |
| Class Plus | AI-heavy classes | Larger pooled AI budget, advanced agents and telemetry |

Keep student access to the managed question bank and already-published core study content available even if an AI budget is exhausted. AI generation can pause or offer a top-up without blocking quizzes, tests, or curated flashcards.

### Billing implementation

The existing Polar integration can remain the billing foundation if it supports the required one-time semester purchase, recurring renewal, tax handling, receipts, webhooks, and usage add-ons. Otherwise, evaluate a change before tying the domain model to provider-specific subscription objects.

Billing records should include:

- billable workspace and owner;
- plan and included allowances;
- term start and end dates;
- seat, storage, and AI usage;
- grace period and renewal state;
- immutable ledger entries for credits and debits;
- webhook idempotency and reconciliation status.

Do not use AI "credits" as an opaque marketing unit internally. Maintain the ledger in real usage and currency estimates, then convert to customer-facing allowances through versioned plan rules.

---

## Cost Model

Pricing changes frequently. Before each launch or model change, update a checked configuration from current Convex, OpenRouter, OpenAI-model, embedding, object-storage, extraction, observability, email, authentication, and payment pricing.

### Per-workspace semester cost

```text
total cost =
  payment fees
  + Convex database/function/file/bandwidth usage
  + object storage and egress
  + extraction/OCR
  + embedding and re-embedding
  + retrieval/reranking
  + LLM input, cached input, and output tokens
  + email/auth/observability allocations
  + support and moderation reserve
```

### AI run estimate

```text
run cost =
  (input tokens / 1,000,000 * input price)
  + (cached input tokens / 1,000,000 * cached-input price)
  + (output tokens / 1,000,000 * output price)
  + retrieval/rerank cost
```

Store the pricing snapshot used for each estimate so historical cost reports do not change when vendor pricing changes.

### Required scenario model

Build a spreadsheet or admin simulation for at least:

- 20, 50, and 100 students;
- light, expected, and heavy AI usage;
- small and large document collections;
- one initial ingestion and multiple re-indexes;
- low-cost default model versus frequent deep-model use;
- semester lengths of 12, 16, and 20 weeks.

Launch pricing only after expected gross margin remains acceptable under the heavy realistic scenario, not merely the average scenario.

### Cost controls

- Workspace and user rate limits.
- Pooled semester budget with warning thresholds.
- Per-task model and token ceilings.
- Prompt/context compaction and retrieval caps.
- Semantic/result caching where privacy permits.
- Batch ingestion and deduplicated embeddings by checksum.
- Explicit confirmation for expensive curator jobs.
- Circuit breakers for cost spikes or retry storms.
- Admin kill switches by model, agent, workspace, and feature.

---

## Privacy, Security, and Academic Trust

### Required controls

- Server-side authorization on every query, mutation, action, retrieval, and tool.
- Workspace isolation tests, including adversarial retrieval tests.
- Encryption in transit and at rest through managed providers.
- Signed, short-lived object access URLs.
- Audit logs for role changes, publication, deletion, exports, and admin impersonation.
- Configurable retention for uploads, extracted text, conversations, and telemetry.
- Account and workspace export/deletion workflows.
- Vendor data-processing review for OpenRouter and routed providers.
- Clear policy on whether provider data may be retained or used for training.
- Secret rotation and separate development/production credentials.
- Abuse prevention for uploads, prompt injection, scraping, and seat sharing.

### Prompt injection

Course documents are untrusted input. Retrieved text must not be allowed to redefine agent instructions or invoke tools. Tool permissions should be enforced in code, source text should be clearly delimited, and suspicious instructions in documents should be ignored and logged.

### Citations and confidence

Source citations are necessary but not sufficient. The system should verify that citations actually support the generated claim, expose the source version, and provide a simple reporting path. High-stakes medical explanations should carry an educational-use notice and should not present themselves as patient-specific clinical advice.

### Copyright and ownership

Class owners must affirm they have permission to upload and share material. Add takedown, deletion, and source-access procedures. Consider limiting cross-class copying even when two classes use similar materials.

---

## Evaluation and Quality Gates

Create a versioned evaluation set from real, permissioned course content before replacing the current pipeline.

### RAG evaluation

- retrieval recall at a fixed `k`;
- source and page correctness;
- answer groundedness;
- citation precision;
- abstention when evidence is absent;
- resistance to cross-workspace retrieval;
- latency and cost.

### Artifact evaluation

- factual correctness;
- answer-key correctness;
- distractor plausibility;
- ambiguity and duplicate rate;
- flashcard atomicity;
- explanation usefulness;
- curator acceptance and edit distance.

### Product evaluation

- time from class creation to first useful study session;
- percentage of classes activated without staff help;
- weekly active learners per activated class;
- repeat agent usage after first week;
- time saved per curator;
- question performance and explanation engagement;
- renewal and AI top-up behavior.

No generated class-wide artifact should bypass human review in the initial release.

---

## Migration Plan

### Phase 0: Discovery and proof of concept

- Inventory current Gemini calls, prompts, usage limits, and generated data.
- Define the workspace/base permission model.
- Prototype Convex RAG and Agent components in an isolated branch or deployment.
- Benchmark retrieval on representative PDFs, slides, and notes.
- Create the evaluation harness and baseline the current system.
- Model semester economics using real current usage.

**Exit gate:** tenant-isolated retrieval, acceptable quality/latency, and a credible cost envelope.

### Phase 1: Foundations

- Add workspace, membership, knowledge-base, source-version, artifact-source, run, ledger, and audit schemas.
- Introduce the task-based model gateway and OpenRouter.
- Add feature flags and kill switches.
- Implement ingestion jobs and source management.
- Add end-to-end usage and cost telemetry.

**Exit gate:** curators can ingest, search, inspect citations, and compare OpenRouter output without affecting students.

### Phase 2: Curator-first RAG

- Launch Curator Copilot and ingestion review.
- Generate source-linked questions and flashcards into a review queue.
- Add contradiction, duplication, and stale-source workflows.
- Migrate selected existing material into knowledge bases.

**Exit gate:** curator acceptance and correctness meet or exceed the current generation pipeline.

### Phase 3: Student study agents

- Launch question explanations and class chat to a limited cohort.
- Add personal flashcards and practice-set generation.
- Add streaming, caching, budget messages, and feedback.
- Verify accessibility and mobile performance.

**Exit gate:** students receive grounded answers reliably with controlled p95 latency and cost.

### Phase 4: Self-service onboarding

- Add class creation, payment, term lifecycle, invitations, seat controls, and role assignment.
- Add setup checklist, sample base, ingestion status, and activation analytics.
- Run a small paid pilot with classes that require no developer setup.

**Exit gate:** a new class can pay, configure, ingest, invite, and study without manual database or code changes.

### Phase 5: Cutover and retirement

- Stop creating new content through the legacy direct-generation path.
- Backfill source links where reliable; mark unverifiable legacy artifacts clearly.
- Keep legacy questions readable during a defined compatibility window.
- Remove Google SDK usage and secrets after rollback criteria expire.
- Publish retention and deletion dates for obsolete ingestion data.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| $20 price cannot fund AI usage | Pooled caps, separate AI allowance, top-ups, and pricing experiments |
| Retrieval returns another class's content | Direct tenant keys, server-derived filters, isolation tests, audit logs |
| AI gives confident unsupported medical answers | Evidence requirement, citation validation, abstention, reporting, curator review |
| RAG component limits future flexibility | Keep product truth and gateway interfaces outside the component |
| Ingestion quality is poor for slides/scans | Extraction QA, OCR fallback, page previews, curator approval |
| Agent latency harms study flow | Stream, cache, precompute, use smaller models, keep core quizzes non-AI |
| Curators are overwhelmed by drafts | Quality thresholds, bounded batches, ranked queues, bulk actions |
| Provider or model changes unexpectedly | Pinned models, evaluation suite, fallback, kill switches |
| Telemetry becomes invasive | Data minimization, aggregates by default, role limits, retention controls |
| Self-service enables abuse or piracy | Verified owners, upload limits, moderation, takedown and suspension workflow |

---

## Key Decisions Still Required

1. Is the billable unit a semester class, an owner subscription, an organization, or a hybrid?
2. Is `$20` a pilot acquisition price or intended sustainable list price?
3. Which AI actions are included, pooled, individually metered, or paid as top-ups?
4. Can a user belong to multiple schools and classes simultaneously in v4?
5. Are instructors permitted as owners/curators, or does the student-only governance principle remain strict?
6. Which source types are supported at launch: PDF, PPTX, DOCX, URLs, pasted notes, audio, or LMS imports?
7. How long are source files, conversations, and detailed learning events retained after a term?
8. Can personal artifacts be promoted into class artifacts, and who owns them afterward?
9. What evidence quality is required before an AI answer is shown versus refused?
10. Which live OpenAI models and embedding model pass the evaluation and cost gates at implementation time?

---

## Recommended First Deliverables

1. A v4 architecture decision record for tenancy, source versioning, and authorization.
2. A Convex RAG/Agent proof of concept using one real class and multiple isolated bases.
3. A provider-neutral model gateway with one OpenRouter task.
4. A golden evaluation dataset and repeatable comparison script.
5. A semester unit-economics workbook fed by actual token and ingestion measurements.
6. A clickable onboarding and persistent knowledge-base navigation prototype.
7. A data retention, copyright, and AI privacy policy review.

---

## Definition of v4 Success

Trinity succeeds when a new class can onboard itself, build and operate a high-quality managed question bank, and use trusted knowledge bases and agents to accelerate curation and provide grounded explanations, flashcards, practice, and class-aware assistance.

The platform should be financially bounded, operationally observable, and fully useful for core question-bank study even when AI is temporarily unavailable. Most importantly, LearnTerms should feel like the best managed question-bank experience, enhanced by coherent agentic capabilities rather than displaced by them.
