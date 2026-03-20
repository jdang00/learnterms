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

### Quick Start - Backfill Everything

```bash
./scripts/backfill-all-prod-stats.sh
```

This script will:
1. Show current status of all cohorts
2. Ask for confirmation
3. Backfill cohort-level stats for all cohorts
4. Backfill user-level stats for each cohort (paginated)
5. Show final status

### Manual Commands

#### Check Status
```bash
bunx convex run migrations:getAllCohortsStatus --prod
```

#### Backfill All Cohort Stats
```bash
bunx convex run migrations:backfillAllCohortsStats --prod
```

#### Backfill User Stats for a Specific Cohort
```bash
# Single batch
bunx convex run migrations:backfillUserProgressStats '{"cohortId": "jd7..."}' --prod

# Continue with pagination (use cursor from previous result)
bunx convex run migrations:backfillUserProgressStats '{"cohortId": "jd7...", "cursor": "abc..."}' --prod
```

#### Find Next Cohort Needing Backfill
```bash
bunx convex run migrations:getNextCohortForUserBackfill --prod
```

#### Backfill Specific Cohort Stats
```bash
bunx convex run migrations:backfillCohortStats '{"cohortId": "jd7..."}' --prod
```

## Migration Functions

All migration functions are in `src/convex/migrations.ts`:

- `getAllCohortsStatus` - Query to check backfill status
- `backfillAllCohortsStats` - Mutation to backfill all cohort-level stats
- `backfillCohortStats` - Mutation to backfill single cohort stats
- `backfillUserProgressStats` - Mutation to backfill user stats (paginated)
- `getNextCohortForUserBackfill` - Query to find next cohort needing backfill

## Performance Considerations

- **Cohort stats**: Computed in a single mutation per cohort
- **User stats**: Paginated (default 20 users per batch) to avoid timeouts
- **Batch size**: Configurable via `batchSize` parameter (default: 20)
- **Total time**: Depends on number of cohorts and users (typically 5-10 min for full backfill)

## When to Re-run

You should re-run the backfill when:
1. New cohorts are created
2. Significant user activity has occurred
3. Admin dashboard shows stale/missing data
4. After bulk imports of questions or users

## Automated Updates

The following operations automatically update stats in real-time:
- `saveUserProgress` - Updates user stats when progress is saved
- Flag count increments/decrements are handled automatically
- Cohort stats require manual backfill (no real-time updates)

## Troubleshooting

### Script Fails Midway
The script is idempotent - you can safely re-run it. It will:
- Skip cohorts that already have stats
- Only process users without progressStats

### Check Specific Cohort
```bash
bunx convex run migrations:findCohortByName '{"search": "NSUOCO"}' --prod
bunx convex run migrations:backfillCohortStats '{"cohortId": "<id>"}' --prod
```

### Verify Results
After backfill, check the admin dashboard:
- Navigate to `/admin/progress`
- Verify that stats load quickly
- Check that student details modal loads without delay
