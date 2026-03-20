# Achievement System Proposal (Minimal-Change, Robust)

## Goals

- Reuse existing Convex data flow and denormalized stats patterns.
- Add a durable achievement/badge system with low read cost.
- Support both global badges and tenant-scoped badges (cohort/class).
- Let admins create custom cohort/class badges safely.
- Show badge ownership percentages and clearly show who issued each badge.

## Current Backend Context (What We Reuse)

- Users are tenant-scoped by `cohortId` and already store denormalized progress stats.
- Study interactions are stored in `userProgress` with `lastAttemptAt`, `isFlagged`, `isMastered`, and `attempts`.
- Cohort-level stats are already denormalized and backfilled via migration utilities.
- Role-based access controls already exist for dev/admin/curator mutation boundaries.
- Question creation supports creator metadata, but creator linkage is currently name-based, not strict user-id-based.

## Proposed Data Model

### 1) `badgeDefinitions`

Catalog of all badges.

- `key`: stable machine key
- `name`
- `description`
- `iconKey` (optional UI helper)
- `scopeType`: `global | cohort | class`
- `cohortId?`
- `classId?`
- `ruleTemplate`: enum template name (not arbitrary code)
- `ruleConfig`: numeric/object config for template
- `isActive`
- `awardedCount`: denormalized holder count
- `createdByUserId`
- `updatedAt`

### 2) `userBadgeAwards`

Durable record that user has earned a badge.

- `userId`
- `badgeDefinitionId`
- `awardedAt`
- `cohortId?` (snapshot for scoped badges)
- `classId?` (snapshot for scoped badges)
- `source` (`earned | backfill | manual`)
- Unique index on `(userId, badgeDefinitionId)`

### 3) `userBadgeState`

Per-user counters used for incremental evaluation and cheap queries.

- `userId`
- `cohortId`
- `totalInteractions`
- `totalMastered`
- `correctSubmissions`
- `earlyMorningInteractions`
- `lateNightInteractions`
- `speedCompletions`
- `questionsCreated`
- `streakCurrent`
- `streakBest`
- `lastInteractionAt`
- `updatedAt`

## Custom Cohort/Class Badges

Admins should be able to create badges that only apply within their own tenant scope.

- `scopeType=cohort`: earnable only by users in that cohort.
- `scopeType=class`: earnable only by users in that class context.
- Template-driven rule creation only (safe and auditable), for example:
  - `questions_interacted >= N`
  - `questions_mastered >= N`
  - `correct_submissions >= N`
  - `module_completion >= X%`

### Tenant Safety Rules

- Admin/dev can only create cohort/class badges within their own authorized cohort/class.
- Validation must enforce scope-to-reference consistency:
  - `scopeType=cohort` requires `cohortId`.
  - `scopeType=class` requires `classId` and matching cohort ownership.

## Badge Issuer / Source Metadata (UI Requirement)

Every badge should state who it is from on the achievements page.

Add to `badgeDefinitions`:

- `issuerType`: `platform | cohort | class | event | partner`
- `issuerName`: display label (`LearnTerms.com`, cohort name, class name, event name)
- `issuerUrl?`
- `issuerLogoUrl?`
- `issuerCohortId?`
- `issuerClassId?`
- `issuerEventKey?`
- `seasonLabel?` (optional: e.g. `Spring 2026`)

### Achievements Page Display

For each badge, show a source line/chip:

- `From LearnTerms.com`
- `From your cohort`
- `From Ocular Disease (Class Badge)`
- `From Finals Sprint 2026 (Event)`

Recommended filters:

- `All`
- `Platform`
- `Cohort`
- `Class`
- `Event`

## Evaluation Flow (Few Modifications)

Evaluate badges incrementally in existing server write paths:

1. On `saveUserProgress`:
   - update `userBadgeState` counters
   - evaluate affected badge templates
   - insert into `userBadgeAwards` if newly earned
   - increment `badgeDefinitions.awardedCount` (idempotent)
2. On question creation mutations:
   - increment creator counters in `userBadgeState`
   - evaluate creator badges
3. Add a dedicated answer submission mutation for correctness/speed badges:
   - avoid relying only on client analytics events
4. On cohort invite/join flows:
   - update relevant inviter/invite badges

## Ownership Percentage (`x.xx% of users have this badge`)

Use:

- Numerator: `badgeDefinitions.awardedCount`
- Denominator by scope:
  - `global`: active users
  - `cohort`: students in that cohort (can use denormalized cohort stats)
  - `class`: v1 can use cohort denominator; v2 can use class enrollment denominator if modeled

## Operational Plan

1. Add new tables + indexes for definitions, awards, and badge state.
2. Add achievement evaluator module with template-based rules.
3. Wire evaluator into existing mutations (progress save + question create + explicit answer submit).
4. Add admin CRUD for custom cohort/class badges.
5. Add migration/backfill script to initialize counters and historical awards.
6. Replace mocked badges page percentages with live query output.

## Key Integrity Notes

- Keep awarding idempotent using unique `(userId, badgeDefinitionId)`.
- Prefer server-authoritative signals for correctness/speed and streaks.
- Continue using denormalization for read performance (consistent with existing progress architecture).
- Ensure issuer metadata is required for every badge definition so source always renders on UI.

