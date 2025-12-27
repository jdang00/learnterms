# LearnTerms: 20 Actionable Improvement Suggestions

Quick, actionable fixes focused on dev ergonomics, maintainability, user-facing improvements, and data efficiency.

---

## Performance & Data Fetching

### 1. Eliminate N+1 Query Pattern in Progress Queries
**Location**: `src/convex/progress.ts` - `getStudentsWithProgress()` and `getCohortProgressStats()`

**Issue**: Severe N+1 pattern. For each student, loops through all classes, then all modules, then fetches all questions. A cohort with 50 students × 5 classes × 10 modules = 2,500+ individual queries.

**Fix**: Batch fetch all data upfront and join in memory:
- Fetch all students once
- Fetch all classes once into a Map
- Fetch ALL modules for ALL classes in one query
- Fetch ALL questions for ALL modules in one query
- Aggregate using Maps instead of nested awaits

---

### 2. Optimize `getProgressForClass` with Bulk Prefetching
**Location**: `src/convex/userProgress.ts` - `getProgressForClass()`

**Issue**: Loops through modules and fetches questions for each module sequentially, creating waterfall requests.

**Fix**: Prefetch all question IDs and counts for a class in a single query using the existing indexes, then use Map lookups for aggregation.

---

### 3. Batch Progress Saves with Smarter Debouncing
**Location**: `src/routes/classes/[classId]/modules/[moduleId]/states.svelte.ts` - `scheduleSave()`

**Issue**: 400ms debounce still fires many mutations during rapid interactions (clicking options, flagging, eliminating). Each save is a full mutation call.

**Fix**:
- Increase debounce to 800ms
- Track "dirty" fields and only send changed data
- Consider batching multiple state changes into a single mutation payload

---

### 4. Add Pagination to Empty Search Queries
**Location**: `src/convex/question.ts` - `searchQuestionsByModuleAdmin()`

**Issue**: When search query is empty, falls back to `.collect()` which fetches everything. Defeats the purpose of having a search index.

**Fix**: Use `.paginate()` for the empty query case instead of `.collect()`. Return first 50 results with cursor for "load more".

---

## Code Duplication & Maintainability

### 5. Extract Duplicate Validation Logic
**Location**: `src/convex/class.ts` and `src/convex/module.ts`

**Issue**: Title, description, and field validation is copy-pasted across `insertClass()`, `updateClass()`, `insertModule()`, `updateModule()` (~60+ duplicated lines).

**Fix**: Create `src/convex/lib/validators.ts`:
```ts
export function validateStringField(value: string, min: number, max: number, fieldName: string): string
export function validateTitle(title: string): string
export function validateDescription(desc: string): string
```

---

### 6. Consolidate Question Option Transformation
**Location**: `src/convex/question.ts` - `insertQuestion()`, `updateQuestion()`, `createQuestion()`

**Issue**: The logic for converting options to the `{id, text}` format using `makeOptionId()` is repeated in multiple places.

**Fix**: Create a single `transformQuestionOptions(options: string[]): {id: string, text: string}[]` helper and use it everywhere.

---

### 7. Extract Matching Pair Validation
**Location**: `src/convex/question.ts` - appears 4+ times

**Issue**: The check for `::` delimiter in matching question correct answers is duplicated.

**Fix**: Create `validateMatchingPairs(correctAnswers: string[]): boolean` helper with clear error messages.

---

### 8. Create Shared Database Query Helpers
**Location**: Multiple Convex files

**Issue**: This pattern appears 15+ times:
```ts
.withIndex('by_moduleId', (q) => q.eq('moduleId', moduleId)).collect()
```

**Fix**: Create `src/convex/lib/queries.ts`:
```ts
export async function getQuestionsByModule(ctx, moduleId)
export async function getModulesByClass(ctx, classId)
export async function getProgressByUser(ctx, userId)
```

---

## State Management & Reactivity

### 9. Split QuizState into Smaller State Objects
**Location**: `src/routes/classes/[classId]/modules/[moduleId]/states.svelte.ts`

**Issue**: `QuizState` class has 22+ state fields all together. When checking a single answer, all fields trigger reactivity checks.

**Fix**: Split into focused state objects:
- `navigationState` - current index, question order
- `interactionState` - selected, eliminated, flags
- `uiState` - modal visibility, sidebar hidden
- `progressState` - counts, completion %

This reduces reactivity overhead per user interaction.

---

### 10. Memoize Sidebar Query
**Location**: `src/lib/components/QuizSideBar.svelte` - line 48

**Issue**: Media fetching creates a new query object on every effect run inside `$effect()`.

**Fix**: Move the query outside the effect or use a derived state to prevent unnecessary query instances.

---

## Data Structure & Schema

### 11. Denormalize Question Counts to Modules
**Location**: `src/convex/schema.ts` - modules table

**Issue**: Every query for "how many questions in module" requires a separate count query. This happens on every module list view.

**Fix**: Add `questionCount: v.number()` to module documents. Update it in `insertQuestion()` and `deleteQuestion()` mutations. One write on change vs. many reads.

---

### 12. Add Compound Index for Filtered Progress Views
**Location**: `src/convex/schema.ts` - `userProgress` table

**Issue**: Has indexes for `by_user_question` and `by_user_class`, but filtering "which questions did user interact with in this class" requires post-fetch filtering.

**Fix**: Add `by_user_class_hasInteraction` index if Convex supports it, or denormalize an `interactionCount` field for faster filtering.

---

### 13. Cache Class/Module Metadata in Quiz State
**Location**: Quiz components fetch class and module info repeatedly

**Issue**: The same class and module metadata is re-fetched on navigation within the same quiz session.

**Fix**: Store class/module metadata in the quiz state after first fetch. Only re-fetch if `classId` or `moduleId` changes.

---

## API & Document Processing

### 14. Consolidate Document Processing Endpoints
**Location**: `src/routes/api/processdoc/` and `src/routes/api/processdoc-stream/`

**Issue**: Two nearly identical endpoints exist - one streams, one doesn't. Maintenance burden and confusion about which to use.

**Fix**: Keep only the streaming version. Rename to just `/api/processdoc` and always stream. Clients that don't need streaming can just wait for completion.

---

### 15. Add Request Size Validation
**Location**: `src/routes/api/processdoc/+server.ts`

**Issue**: No visible file size check before sending to Gemini API. Large files could waste API quota or timeout.

**Fix**: Add early validation:
```ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE) {
  return json({ error: 'File too large' }, { status: 413 });
}
```

---

## Developer Experience

### 16. Extract Shared Error Utilities
**Location**: Multiple components have `isAuthError()` function

**Issue**: Auth error checking logic is duplicated across components like `MainQuiz.svelte`.

**Fix**: Move to `src/lib/utils/errors.ts`:
```ts
export function isAuthError(error: unknown): boolean
export function isNetworkError(error: unknown): boolean
export function getUserFriendlyMessage(error: unknown): string
```

---

### 17. Clean Up Archive Folder
**Location**: `src/lib/archive/`

**Issue**: Contains old component versions that aren't used but still get type-checked and could confuse new developers.

**Fix**: Either delete the folder entirely or move it outside `src/` to a top-level `/archive` that's excluded from builds.

---

### 18. Add Convex Function Return Types
**Location**: All Convex queries and mutations

**Issue**: Most functions rely on inferred types. IDE autocomplete works but documentation is implicit.

**Fix**: Explicitly type returns for key functions:
```ts
export const getClassWithModules = query({
  // ...
  handler: async (ctx, args): Promise<ClassWithModules | null> => {
```

---

## User-Facing Improvements

### 19. Add Loading States to Progress Dashboard
**Location**: Admin progress pages

**Issue**: Progress queries are slow (see #1, #2). Users see blank/stale data while waiting.

**Fix**: Add skeleton loaders or progress indicators. Consider showing cached data immediately with a "refreshing..." indicator.

---

### 20. Fix Matching Question Validation on Create
**Location**: `src/convex/question.ts` - `insertQuestion()`

**Issue**: Matching questions require `prompt::answer` format in correctAnswers, but this isn't validated on creation. Invalid questions can be created that then fail in the repair function.

**Fix**: Add explicit validation in `insertQuestion()`:
```ts
if (type === 'matching') {
  for (const answer of correctAnswers) {
    if (!answer.includes('::')) {
      throw new Error('Matching answers must use "prompt::answer" format');
    }
  }
}
```

---

## Priority Order

**High Impact, Quick Wins:**
1. #5, #6, #7, #8 - Validation/query helpers (reduce bugs, improve maintainability)
2. #17 - Clean archive folder (immediate clarity)
3. #20 - Matching question validation (prevent data corruption)

**High Impact, Medium Effort:**
4. #1, #2 - N+1 query fixes (biggest performance gains)
5. #3 - Smarter debouncing (reduces backend load)
6. #11 - Denormalize question counts (speeds up module lists)

**Nice to Have:**
7. Everything else - incremental improvements

---

*Generated: December 2024*
