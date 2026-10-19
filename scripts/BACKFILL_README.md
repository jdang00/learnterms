# Production Progress Stats Backfill

## Overview

This backfill ensures that all progress statistics are precomputed and stored in the database, preventing the admin progress dashboard from falling back to expensive real-time computation.

## What Gets Backfilled

### 1. Cohort-Level Stats (`cohort.stats`)

Stored on each cohort document:

- `totalStudents` - Count of active students
- `totalQuestions` - Total questions across all modules
- `totalModules` - Total modules across all classes
- `averageCompletion` - Average completion percentage across all students
- `updatedAt` - Timestamp of last update

### 2. User-Level Progress Stats (`user.progressStats`)

Stored on each user document:

- `questionsInteracted` - Questions the user has attempted
- `questionsMastered` - Questions the user has mastered
- `totalQuestions` - Total questions available in their cohort
- `lastActivityAt` - Timestamp of last question attempt
- `updatedAt` - Timestamp of last stats update

## Why This Matters

Without backfilled stats, the admin progress dashboard would:

1. Query all classes in a cohort
2. For each class, query all modules
3. For each student, query all userProgress records
4. Compute stats on-the-fly (O(cohorts × classes × modules × students))

With backfilled stats, the dashboard:

1. Reads precomputed `cohort.stats` and `user.progressStats`
2. Returns results instantly (O(1) for cohort, O(students) for student list)

## Usage

Every backfill is a Convex internal function under `src/convex/migrations/`. Paginated ones
schedule their own next page, so one command runs to completion. Add `--prod` for production.

### Everything in one run

```bash
bunx convex run migrations/progressStats:backfillAllProgressStats --prod
```

This action backfills cohort-level stats for every cohort, then user-level stats for every
cohort page by page, and returns per-cohort counts.

### Manual commands

```bash
# Status per cohort
bunx convex run migrations/progressStats:getAllCohortsStatus --prod

# Cohort-level stats for every cohort, or one cohort
bunx convex run migrations/progressStats:backfillAllCohortsStats --prod
bunx convex run migrations/progressStats:backfillCohortStats '{"cohortId": "jd7..."}' --prod

# User-level stats for one cohort (schedules its own pages)
bunx convex run migrations/progressStats:backfillUserProgressStats '{"cohortId": "jd7..."}' --prod

# Step one page at a time instead
bunx convex run migrations/progressStats:backfillUserProgressStats '{"cohortId": "jd7...", "continueAutomatically": false}' --prod

# Find a cohort id
bunx convex run migrations/lookups:findCohortByName '{"search": "NSUOCO"}' --prod
```

### Other paginated backfills

```bash
bunx convex run migrations/questions:backfillFlagCounts --prod
bunx convex run migrations/questions:backfillQuestionRationales --prod
bunx convex run migrations/questions:backfillSearchTextForAllModules --prod
bunx convex run migrations/modules:backfillPublishedQuestionCounts --prod
bunx convex run migrations/attempts:backfillAttemptItemRationales --prod
bunx convex run migrations/users:clearPlanField --prod
```
