# Admin Progress Page: Comprehensive Feature Proposal

**Document Version:** 1.0
**Date:** December 2024
**Status:** Proposal

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [User Interaction Flow](#user-interaction-flow)
4. [Proposed Feature: Admin Progress Dashboard](#proposed-feature-admin-progress-dashboard)
5. [Data Architecture](#data-architecture)
6. [Implementation Phases](#implementation-phases)
7. [Key Stats & Insights](#key-stats--insights)
8. [Technical Considerations](#technical-considerations)
9. [UI/UX Recommendations](#uiux-recommendations)

---

## Executive Summary

The Admin Progress page is a planned feature (currently grayed out in the admin dashboard) designed to give administrators comprehensive visibility into class performance, student engagement, and question effectiveness. This document proposes a robust, phased implementation that balances real-time insights with Convex data efficiency through strategic use of aggregation tables and cron jobs.

**Core Value Proposition:**
- Track student performance and mastery at class, module, and individual levels
- Identify struggling students and difficult questions early
- Measure question quality and engagement patterns
- Provide actionable insights without overwhelming administrators

---

## Current State Analysis

### What's Already Being Tracked

The `userProgress` table currently captures:

| Field | Description | Analytics Potential |
|-------|-------------|---------------------|
| `selectedOptions` | User's answer choices | Answer pattern analysis |
| `eliminatedOptions` | Options marked for elimination | Study strategy insights |
| `isFlagged` | Questions marked for review | Difficulty indicators |
| `isMastered` | User-marked mastery status | Completion tracking |
| `attempts` | Number of attempts (stored but not incremented) | Not currently functional |
| `lastAttemptAt` | Timestamp of last interaction | Recency tracking |
| `updatedAt` | Last modification time | Activity patterns |

### What's Missing

1. **Correctness Tracking**: System stores `correctAnswers` on questions but never compares against `selectedOptions`
2. **Time-on-Task**: No duration tracking for questions or sessions
3. **Session Data**: No discrete session start/end tracking
4. **Aggregated Stats**: All stats computed on-demand (expensive for large datasets)
5. **Historical Trends**: No snapshots for trend analysis over time
6. **Question Difficulty Metrics**: No computed difficulty scores

### Existing Backend Support

The `getProgressForClass()` query already computes:
- `totalQuestions` per module
- `interactedQuestions` count
- `flaggedQuestions` count
- `masteredQuestions` count
- `completionPercentage`
- `masteryPercentage`

However, this is computed per-request and scoped to a single user.

---

## User Interaction Flow

### How Students Use LearnTerms

```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT LEARNING FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. JOIN CLASS          2. VIEW CLASSES         3. SELECT MODULE │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐  │
│  │ /join-class │   →    │  /classes   │   →    │  Module     │  │
│  │             │        │             │        │  Cards      │  │
│  │ Enter code  │        │ See all     │        │  (progress  │  │
│  │ Join cohort │        │ enrolled    │        │   shown)    │  │
│  └─────────────┘        │ classes     │        └─────────────┘  │
│                         └─────────────┘                          │
│                                                                  │
│  4. STUDY QUESTIONS     5. INTERACT              6. PROGRESS    │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐  │
│  │ MainQuiz   │   →    │ • Select    │   →    │ Auto-saved  │  │
│  │ Component  │        │   answers   │        │ to          │  │
│  │            │        │ • Eliminate │        │ userProgress│  │
│  │ Question   │        │   options   │        │ table       │  │
│  │ navigation │        │ • Flag for  │        │             │  │
│  │            │        │   review    │        │ (debounced  │  │
│  │            │        │ • View      │        │  400ms)     │  │
│  │            │        │   explanation│       └─────────────┘  │
│  └─────────────┘        └─────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Trackable Touchpoints

| Touchpoint | Data Generated | Current State |
|------------|----------------|---------------|
| Module opened | Session start | NOT tracked |
| Question viewed | View count | NOT tracked |
| Option selected | `selectedOptions` | Tracked |
| Option eliminated | `eliminatedOptions` | Tracked |
| Question flagged | `isFlagged` | Tracked |
| Question marked mastered | `isMastered` | Tracked |
| Module exited | Session end | NOT tracked |

---

## Proposed Feature: Admin Progress Dashboard

### Route Structure

```
/admin/progress                    → Class selection / overview
/admin/progress/[classId]          → Class-level analytics
/admin/progress/[classId]/students → Student roster with stats
/admin/progress/[classId]/modules  → Module breakdown
/admin/progress/[classId]/questions → Question analytics
```

### Dashboard Views

#### 1. Progress Overview (`/admin/progress`)

**Purpose:** Quick glance at all classes' health

**Displays:**
- Class cards with engagement rings (similar to Apple Watch)
- Quick stats: Active students, completion %, avg mastery
- Alerts for classes needing attention

#### 2. Class Dashboard (`/admin/progress/[classId]`)

**Purpose:** Deep dive into a single class

**Sections:**
- **Header Stats**: Total students, questions, modules
- **Engagement Timeline**: Activity over past 7/30 days
- **Module Performance Grid**: Heatmap of completion by module
- **Leaderboard**: Top performers (opt-in)
- **Attention Needed**: Struggling students, difficult questions

#### 3. Student Roster (`/admin/progress/[classId]/students`)

**Purpose:** Individual student tracking

**Features:**
- Sortable/filterable student list
- Per-student metrics: completion %, mastery %, last active
- Drill-down to see individual question progress
- Export to CSV

#### 4. Question Analytics (`/admin/progress/[classId]/questions`)

**Purpose:** Question quality and difficulty analysis

**Features:**
- Questions ranked by difficulty (flag rate, elimination patterns)
- Discrimination index (do high-performers get it right?)
- Most-flagged questions
- Question answer distribution charts

---

## Data Architecture

### New Tables Required

#### 1. `progressSnapshot` - Daily Aggregates

```typescript
progressSnapshot: defineTable({
  type: v.union(v.literal('class'), v.literal('module'), v.literal('user')),
  referenceId: v.string(),  // classId, moduleId, or clerkUserId
  classId: v.id('class'),
  date: v.string(),         // YYYY-MM-DD format

  // Aggregate metrics
  totalStudents: v.number(),
  activeStudents: v.number(),      // Students with activity that day
  totalQuestions: v.number(),
  questionsAttempted: v.number(),
  questionsCorrect: v.number(),
  questionsFlagged: v.number(),
  questionsMastered: v.number(),

  // Computed percentages
  completionRate: v.number(),
  masteryRate: v.number(),
  accuracyRate: v.number(),

  metadata: v.object({})
})
.index('by_type_date', ['type', 'date'])
.index('by_class_date', ['classId', 'date'])
.index('by_reference_date', ['referenceId', 'date'])
```

#### 2. `questionStats` - Question-Level Analytics

```typescript
questionStats: defineTable({
  questionId: v.id('question'),
  moduleId: v.id('module'),
  classId: v.id('class'),

  // Attempt metrics
  totalAttempts: v.number(),
  uniqueStudents: v.number(),

  // Answer distribution
  optionDistribution: v.object({}),  // { optionId: count }

  // Difficulty indicators
  correctRate: v.number(),           // % correct on first attempt
  flagRate: v.number(),              // % of students who flagged
  eliminationRate: v.number(),       // % who used elimination
  avgAttemptsToCorrect: v.number(),

  // Quality metrics
  discriminationIndex: v.number(),   // -1 to 1, higher = better

  lastUpdated: v.number()
})
.index('by_module', ['moduleId'])
.index('by_class', ['classId'])
.index('by_flagRate', ['classId', 'flagRate'])
```

#### 3. `activityLog` - Session Tracking (Optional Phase 3+)

```typescript
activityLog: defineTable({
  userId: v.id('users'),
  classId: v.id('class'),
  moduleId: v.optional(v.id('module')),
  questionId: v.optional(v.id('question')),

  action: v.union(
    v.literal('session_start'),
    v.literal('session_end'),
    v.literal('question_view'),
    v.literal('answer_submit'),
    v.literal('flag_toggle'),
    v.literal('mastery_toggle')
  ),

  timestamp: v.number(),
  durationMs: v.optional(v.number()),  // For timed events
  metadata: v.object({})
})
.index('by_user_timestamp', ['userId', 'timestamp'])
.index('by_class_timestamp', ['classId', 'timestamp'])
```

### Cron Job Architecture

Convex supports scheduled functions. We'll use these to offload heavy aggregation:

```typescript
// convex/crons.ts
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Run daily at 2 AM UTC
crons.daily(
  'aggregate-daily-progress',
  { hourUTC: 2, minuteUTC: 0 },
  internal.analytics.aggregateDailyProgress
);

// Run hourly for near-real-time stats
crons.hourly(
  'update-question-stats',
  { minuteUTC: 15 },
  internal.analytics.updateQuestionStats
);

export default crons;
```

---

## Implementation Phases

### Phase 1: Foundation (Easy - 1-2 weeks equivalent effort)

**Goal:** Basic class-level progress visibility

**Backend Changes:**
- Add `isCorrect` computed field logic (compare selectedOptions with correctAnswers)
- Create `getClassProgressSummary` query (aggregates existing userProgress)
- Create `getModuleProgressSummary` query

**Frontend:**
- New route: `/admin/progress`
- Class selection dropdown
- Basic stats cards:
  - Total enrolled students
  - Overall completion %
  - Overall mastery %
  - Last activity timestamp
- Simple module breakdown table

**Data Impact:** Low - Uses existing tables, on-demand queries

**Key Stats Displayed:**
- Total students in class
- Average completion percentage
- Average mastery percentage
- Module-by-module completion rates

---

### Phase 2: Student Tracking (Medium - 2-3 weeks)

**Goal:** Per-student progress visibility

**Backend Changes:**
- Create `getStudentRoster` query
- Create `getStudentProgress` query for individual deep-dives
- Add correctness calculation to progress queries

**Frontend:**
- New route: `/admin/progress/[classId]/students`
- Student roster table with:
  - Name, email, last active
  - Completion %, Mastery %, Accuracy %
  - Progress bar visualization
- Student detail modal/page:
  - Module-by-module breakdown
  - Flagged questions list
  - Incorrect answers list
- CSV export functionality

**Data Impact:** Medium - More queries per page load, consider pagination

**Key Stats Displayed:**
- Student-level completion and mastery
- Time since last activity
- Flagged question counts per student
- Accuracy rates (new metric)

---

### Phase 3: Correctness & Accuracy (Medium - 2 weeks)

**Goal:** Track actual right/wrong answers, not just interaction

**Backend Changes:**
- Modify `saveUserProgress` to compute and store `isCorrect`
- Backfill existing records with correctness data
- Create `calculateAccuracy` helper function

**Schema Change to `userProgress`:**
```typescript
// Add to userProgress table
isCorrect: v.optional(v.boolean()),    // Was first answer correct?
correctOnAttempt: v.optional(v.number()) // Which attempt was correct?
```

**Frontend Updates:**
- Show accuracy % alongside completion %
- Color-code progress: green (correct), yellow (incorrect but interacted), gray (not attempted)
- Add "Needs Review" section for commonly missed questions

**Key Stats Displayed:**
- First-attempt accuracy rate
- Average attempts to correct answer
- "Struggled" questions list

---

### Phase 4: Aggregation & History (Medium-Hard - 3-4 weeks)

**Goal:** Offload stats to aggregation tables, enable historical trends

**Backend Changes:**
- Create `progressSnapshot` table
- Create `questionStats` table
- Implement daily cron job for aggregation
- Create `getProgressTrend` query (7/30/90 day views)

**Frontend:**
- Add time-range selector (7d, 30d, 90d, All time)
- Engagement trend line charts
- Weekly/monthly comparison cards
- Historical accuracy trends

**Data Impact:** Reduced per-request load, increased storage

**Key Stats Displayed:**
- Week-over-week engagement change
- Trend arrows on all metrics
- Historical high/low indicators
- Activity heatmaps

---

### Phase 5: Question Analytics (Hard - 3-4 weeks)

**Goal:** Measure question quality and difficulty

**Backend Changes:**
- Implement discrimination index calculation
- Create hourly cron for question stats updates
- Build answer distribution tracking

**Frontend:**
- New route: `/admin/progress/[classId]/questions`
- Question difficulty rankings
- Answer distribution pie/bar charts per question
- "Problem questions" alerts (high flag rate, low accuracy)
- Question comparison views

**Metrics Calculated:**
- **Difficulty Index**: % of students who got it wrong
- **Discrimination Index**: Correlation between question score and overall performance
- **Flag Rate**: % of students who flagged
- **Elimination Usage**: How many used process of elimination

**Key Stats Displayed:**
- Top 10 hardest questions
- Top 10 most-flagged questions
- Questions with uneven answer distribution (possible issues)
- AI-generated vs manually-created question performance

---

### Phase 6: Real-Time & Sessions (Hard - 4-5 weeks)

**Goal:** Live activity tracking and session-based analytics

**Backend Changes:**
- Create `activityLog` table
- Implement session start/end detection
- Add time-on-task tracking
- Real-time subscriptions for admin dashboard

**Frontend:**
- "Currently Active" indicator on class cards
- Live student count per class
- Average session duration stats
- Time-on-task per module
- "Recent Activity" feed

**Data Impact:** High write volume - need careful indexing and retention policies

**Key Stats Displayed:**
- Live active student count
- Average session duration
- Time spent per module
- Peak activity times (heatmap by hour/day)

---

### Phase 7: Advanced Insights & Reports (Very Hard - 5-6 weeks)

**Goal:** AI-powered insights and exportable reports

**Features:**
- Automated weekly email reports to admins
- AI-generated insights ("Module 3 has 40% lower engagement than average")
- Predictive alerts ("5 students may be falling behind")
- Cohort comparison (this semester vs last)
- Full data export for external analysis

**Technical Requirements:**
- Background job for report generation
- Email integration (SendGrid, Resend, etc.)
- PDF generation for reports
- Data warehouse export option

---

## Key Stats & Insights

### Class-Level Metrics

| Metric | Description | Calculation | Priority |
|--------|-------------|-------------|----------|
| **Enrollment Count** | Total students in class | Count users with classId | Phase 1 |
| **Active Students** | Students with recent activity | Count with lastAttemptAt > 7 days ago | Phase 1 |
| **Completion Rate** | % of questions attempted | interacted / total * 100 | Phase 1 |
| **Mastery Rate** | % of questions mastered | mastered / total * 100 | Phase 1 |
| **Accuracy Rate** | % correct on first attempt | correct / attempted * 100 | Phase 3 |
| **Engagement Score** | Composite health metric | Weighted average of above | Phase 4 |
| **Trend Direction** | Week-over-week change | Compare snapshots | Phase 4 |

### Module-Level Metrics

| Metric | Description | Purpose | Priority |
|--------|-------------|---------|----------|
| **Completion Heatmap** | Visual completion by module | Identify neglected modules | Phase 1 |
| **Difficulty Ranking** | Avg accuracy per module | Find hard content | Phase 3 |
| **Flag Density** | Flags per question | Find confusing content | Phase 2 |
| **Drop-off Rate** | % who don't finish module | UX issues | Phase 6 |

### Student-Level Metrics

| Metric | Description | Purpose | Priority |
|--------|-------------|---------|----------|
| **Overall Progress** | % complete across class | Track individuals | Phase 2 |
| **Mastery Score** | % mastered | Learning depth | Phase 2 |
| **Last Active** | Days since last interaction | Identify inactive | Phase 2 |
| **Accuracy Trend** | Is student improving? | Early intervention | Phase 4 |
| **Time Investment** | Total time in app | Engagement level | Phase 6 |

### Question-Level Metrics

| Metric | Description | Purpose | Priority |
|--------|-------------|---------|----------|
| **Difficulty Index** | % incorrect | Question calibration | Phase 5 |
| **Discrimination Index** | -1 to 1 score | Question quality | Phase 5 |
| **Flag Rate** | % who flagged | Confusion indicator | Phase 5 |
| **Answer Distribution** | % per option | Detect bad distractors | Phase 5 |
| **Avg Attempts** | Mean attempts to correct | Learning curve | Phase 5 |

---

## Technical Considerations

### Convex-Specific Patterns

#### 1. Efficient Aggregation

Avoid N+1 queries by using batch operations:

```typescript
// BAD: N+1 queries
for (const module of modules) {
  const questions = await ctx.db.query('question')
    .withIndex('by_moduleId', q => q.eq('moduleId', module._id))
    .collect();
}

// GOOD: Batch query
const allQuestions = await ctx.db.query('question')
  .withIndex('by_classId', q => q.eq('classId', classId))
  .collect();
const questionsByModule = groupBy(allQuestions, 'moduleId');
```

#### 2. Pagination for Large Datasets

For classes with 1000+ students:

```typescript
export const getStudentRoster = query({
  args: {
    classId: v.id('class'),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { classId, cursor, limit = 50 }) => {
    let query = ctx.db.query('users')
      .withIndex('by_cohortId');

    if (cursor) {
      query = query.filter(q => q.gt(q.field('_id'), cursor));
    }

    const users = await query.take(limit + 1);
    const hasMore = users.length > limit;

    return {
      users: users.slice(0, limit),
      nextCursor: hasMore ? users[limit - 1]._id : null
    };
  }
});
```

#### 3. Cron Job Best Practices

```typescript
// convex/analytics.ts
import { internalMutation } from './_generated/server';

export const aggregateDailyProgress = internalMutation({
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    // Get all classes
    const classes = await ctx.db.query('class').collect();

    for (const cls of classes) {
      // Aggregate and store
      const stats = await computeClassStats(ctx, cls._id);

      await ctx.db.insert('progressSnapshot', {
        type: 'class',
        referenceId: cls._id,
        classId: cls._id,
        date: today,
        ...stats,
        metadata: {}
      });
    }
  }
});
```

#### 4. Data Retention Strategy

For `activityLog` (high-volume):

```typescript
// Cron job to clean old logs
export const cleanOldActivityLogs = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days

    const oldLogs = await ctx.db.query('activityLog')
      .withIndex('by_timestamp')
      .filter(q => q.lt(q.field('timestamp'), cutoff))
      .take(1000); // Batch delete

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }
  }
});
```

### Performance Budget

| Page | Target Load Time | Max Queries | Strategy |
|------|------------------|-------------|----------|
| Class Overview | < 500ms | 3 | Aggregation table |
| Student Roster | < 800ms | 2 + pagination | Cursor-based |
| Question Analytics | < 1s | 2 | Pre-computed stats |
| Real-time Dashboard | N/A | Subscription | WebSocket |

---

## UI/UX Recommendations

### Design Principles

1. **Progressive Disclosure**: Show summary first, details on demand
2. **Actionable Insights**: Every stat should suggest an action
3. **Mobile-Responsive**: Admins may check on phone
4. **Accessible**: WCAG 2.1 AA compliance
5. **Consistent**: Match existing admin UI patterns

### Component Reuse

Leverage existing patterns from the codebase:
- Modal dialogs for student/question details
- DaisyUI stats cards for metrics
- Existing table patterns from Question Studio
- Loading skeletons matching current admin pages

### Color Coding

```
Green (#22c55e)  - Above target (>80% completion, >70% accuracy)
Yellow (#eab308) - Needs attention (50-80% completion, 50-70% accuracy)
Red (#ef4444)    - Critical (<50% completion, <50% accuracy)
Gray (#9ca3af)   - No data / inactive
```

### Key Visualizations

1. **Ring Charts**: Overall health (like Apple Watch)
2. **Heatmaps**: Module completion grid
3. **Sparklines**: Trend indicators inline with stats
4. **Bar Charts**: Answer distribution
5. **Line Charts**: Progress over time

---

## Summary: Recommended Roadmap

| Phase | Effort | Impact | Dependencies |
|-------|--------|--------|--------------|
| 1. Foundation | Easy | High | None |
| 2. Student Tracking | Medium | High | Phase 1 |
| 3. Correctness | Medium | High | Phase 2 |
| 4. Aggregation | Medium-Hard | Medium | Phases 1-3 |
| 5. Question Analytics | Hard | Medium | Phase 4 |
| 6. Real-Time | Hard | Medium | Phase 4 |
| 7. Advanced Reports | Very Hard | Low-Medium | Phases 1-6 |

**Recommended MVP (Phases 1-2):**
- Class selection and overview stats
- Module completion breakdown
- Student roster with basic metrics
- ~3-4 weeks of development

**Full Feature Set (Phases 1-5):**
- Complete analytics suite
- Historical trends
- Question difficulty analysis
- ~12-16 weeks of development

---

## Appendix: File Locations

**Key Backend Files:**
- `/src/convex/userProgress.ts` - Current progress tracking
- `/src/convex/schema.ts` - Database schema
- `/src/convex/question.ts` - Question data access

**Key Frontend Files:**
- `/src/routes/admin/+page.svelte` - Admin dashboard (line 233: progress placeholder)
- `/src/lib/admin/` - Admin component library
- `/src/routes/classes/[classId]/modules/[moduleId]/states.svelte.ts` - Quiz state management

**Related Documentation:**
- `/dev/CONVEX_OPTIMIZATION_REVIEW.md` - Index optimization patterns
- `/dev/CONVEX_API_DOCUMENTATION.md` - API patterns

---

*This document was generated as a feature proposal. Implementation details may evolve based on user feedback and technical constraints.*
