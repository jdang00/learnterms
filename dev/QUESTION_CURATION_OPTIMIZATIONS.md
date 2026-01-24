# Question Curation Optimizations (v3)

## High-Impact UX Fixes (Completed)

### 1. Auto-select newly created question after save (✅ Done)
After creating a question via the inline editor, it is now auto-selected in the detail view.

### 2. Status filter in question list (✅ Done)
Added published/draft/archived filter to `QuestionListControls` with client-side filtering.

### 3. Toast notifications for operations (✅ Done)
Implemented a global toast system with distinct icons (CheckCircle, AlertCircle, Info, AlertTriangle) and improved DaisyUI styling for better visual feedback on all CRUD operations.

### 4. Keyboard shortcut for save (Cmd/Ctrl+S) (✅ Done)
Added Cmd+S / Ctrl+S support to `QuestionEditorInline` for quick saving.

### 5. Quick single-duplicate & Duplicate Many (✅ Done)
- "Duplicate" button now immediately creates 1 copy.
- Added a dropdown arrow next to "Duplicate" for "Duplicate Many...", which opens the quantity picker modal.

### 8. Search result count (✅ Done)
Search input now shows the number of matching results or "No matches".

### 9. Extend recently-added highlight (✅ Done)
Increased highlight duration to 4s with a fade-out transition.

## UI Polish & Refinements (New - ✅ Done)

### Rounded Options
Updated `QuestionDetailView` to display multiple-choice options with `rounded-full` styling, matching the main quiz interface.

### Accessible Delete Button
Moved the "Delete" button out of the generic dropdown menu and placed it directly in the header action group for faster access.

### Better "Default Status" Control
Updated the default status toggle in the sidebar to include a text label ("Save as: Published/Draft") instead of just an icon, clarifying its function.

### Organized List Controls
Refactored the desktop list controls to group Sort/Filter together with a visual separator, preventing the toolbar from looking jumbled.

### Responsive Badge Layout
Adjusted the question detail header to allow badges (AI, Type, Status) to wrap gracefully on smaller screens.

## Module Management (New - ✅ Done)

### Mobile-Friendly Reorder
Implemented an explicit "Reorder Mode" toggle on the main class page. Dragging is now disabled by default to prevent scroll interference on mobile, and a dedicated drag handle appears only when reordering is active.

## Interaction Polish (Pending)

### 6. "Save and Next" button
After saving an edited question, auto-advance to the next question in edit mode.

### 7. Bulk status change
Add "Publish All" / "Draft All" to the bulk action toolbar alongside Move and Delete.

### 10. Scroll new question into view
Ensure the list automatically scrolls to the newly added question (currently handled by auto-selection but scroll behavior needs verification).

## Performance (Future)

### 11. Remove allMediaQuery overhead
Replace with a `hasMedia` boolean field on the question document. Backfill via migration.

### 12. Remove duplicate query in QuestionEditorInline
Pass `nextOrder` as a prop instead of running a separate `getQuestionsByModule` query.

### 13. Avoid unnecessary array copies in syncQuestionList
Compare before overwriting to reduce downstream reactivity.
