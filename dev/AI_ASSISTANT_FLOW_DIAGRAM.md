# AI Question Assistant - Flow Diagrams

**Visual guide to the feature's architecture and user flows**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      QUESTION EDITOR UI                          │
│                 (QuestionEditorInline.svelte)                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Educator writes stem                                  │  │
│  │  2. Marks correct answer(s)                               │  │
│  │  3. Clicks "Generate Options & Explanation with AI"       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        AI ASSISTANT COMPONENT                             │  │
│  │      (QuestionAIAssistant.svelte)                         │  │
│  │                                                            │  │
│  │  • Shows stem preview                                     │  │
│  │  • Shows correct answers                                  │  │
│  │  • Shows existing options                                 │  │
│  │  • Displays domain focus                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │     CONVEX CLIENT (Browser)      │
        │   calls action via API           │
        └──────────────┬───────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                       CONVEX BACKEND                              │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  generateDistractorsAndExplanation ACTION                 │  │
│  │  (question.ts)                                            │  │
│  │                                                            │  │
│  │  1. Check authentication                                  │  │
│  │  2. Check usage limits (15 free / 300 pro)               │  │
│  │  3. Build domain-specific prompt                          │  │
│  │  4. Call Gemini API                                       │  │
│  │  5. Validate structured JSON response                     │  │
│  │  6. Return {distractors, explanation}                     │  │
│  └───────────────────────┬───────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   GOOGLE GEMINI API   │
                  │  (gemini-3-flash)     │
                  │                       │
                  │  • Temperature: 0.8   │
                  │  • Max tokens: 2048   │
                  │  • Structured JSON    │
                  └──────────────────────┘
```

---

## User Flow - Success Path

```
START
  │
  ▼
┌────────────────────────┐
│  Educator opens        │
│  QuestionEditorInline  │
│  (Add New Question)    │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Select "Multiple      │
│  Choice" question type │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐     ┌─────────────────────┐
│  Write question stem   │────▶│  AI button appears  │
│  (rich text editor)    │     │  but is DISABLED    │
└──────────┬─────────────┘     └─────────────────────┘
           │
           ▼
┌────────────────────────┐
│  Add options and mark  │
│  correct answer(s)     │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐     ┌─────────────────────┐
│  AI button becomes     │────▶│  Tooltip: "Use AI   │
│  ENABLED (primary)     │     │  to generate..."    │
└──────────┬─────────────┘     └─────────────────────┘
           │
           ▼
┌────────────────────────┐
│  Click AI button       │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│  AI Assistant Component Opens               │
│  ┌──────────────────────────────────────┐  │
│  │  Preview Panel                        │  │
│  │  • Your stem                          │  │
│  │  • Your correct answer(s)             │  │
│  │  • Existing options (if any)          │  │
│  │  • Focus: optometry/pharmacy/general  │  │
│  │  • Cost: 1 AI credit                  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [Generate Options & Explanation] [Cancel]  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌────────────────────────┐     ┌─────────────────────┐
│  Loading state         │────▶│  "Generating..."    │
│  (3-5 seconds)         │     │  Spinner animation  │
└──────────┬─────────────┘     └─────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  Preview Generated Content                            │
│  ┌────────────────────────────────────────────────┐  │
│  │  ✓ Generated Distractors:                      │  │
│  │    1. [Distractor option 1]                    │  │
│  │    2. [Distractor option 2]                    │  │
│  │    3. [Distractor option 3]                    │  │
│  │                                                 │  │
│  │  ✓ Generated Explanation:                      │  │
│  │    [Comprehensive explanation text...]         │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ℹ️ Review and edit after accepting                  │
│                                                       │
│  [Accept & Add] [Regenerate] [Cancel]                │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │             │
        ▼             ▼
   [Accept]      [Regenerate]
        │             │
        │             └─────────────┐
        │                           │
        ▼                           ▼
┌───────────────────┐      ┌──────────────────┐
│  Add distractors  │      │  Generate again  │
│  to options list  │      │  (uses 1 more    │
│                   │      │   credit)        │
│  Set explanation  │      └────────┬─────────┘
│  (smart merge)    │               │
└────────┬──────────┘               │
         │                          │
         │      ┌───────────────────┘
         │      │
         ▼      ▼
┌────────────────────────┐
│  Close AI Assistant    │
│  Return to editor      │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Educator reviews and  │
│  edits if needed       │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Click "Save" button   │
│  Question created!     │
└────────────────────────┘
           │
           ▼
         END
```

---

## Error Handling Flow

```
┌────────────────────────┐
│  User clicks Generate  │
└──────────┬─────────────┘
           │
           ▼
     ┌────────────┐
     │ Check Auth │
     └────┬───────┘
          │
    ┌─────┴─────┐
    │           │
    NO          YES
    │           │
    ▼           ▼
┌───────────┐  ┌─────────────────┐
│ Show      │  │ Check Usage     │
│ "Login    │  │ Limits          │
│ Required" │  └─────┬───────────┘
└───────────┘        │
                ┌────┴────┐
                │         │
             OVER      UNDER
                │         │
                ▼         ▼
    ┌──────────────────┐  ┌─────────────┐
    │ Show Limit Error │  │ Call Gemini │
    │ "Daily limit     │  │ API         │
    │  reached.        │  └─────┬───────┘
    │  Upgrade to Pro" │        │
    └──────────────────┘   ┌────┴────┐
                           │         │
                        SUCCESS   ERROR
                           │         │
                           ▼         ▼
                  ┌──────────────┐  ┌──────────────┐
                  │ Show Preview │  │ Show Error   │
                  │ (normal flow)│  │ "Failed to   │
                  └──────────────┘  │  generate.   │
                                    │  Try again." │
                                    └──────────────┘
```

---

## Smart Explanation Merging Logic

```
AI Assistant returns explanation
          │
          ▼
    ┌──────────────┐
    │ Check current│
    │ explanation  │
    │ field        │
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
   EMPTY      HAS TEXT
     │           │
     ▼           ▼
┌──────────┐  ┌────────────────────────────────┐
│ Auto-set │  │ Confirm Dialog:                │
│ AI       │  │ "You already have an           │
│ explanation│ │  explanation. Replace with    │
│          │  │  AI-generated?"                │
└────┬─────┘  └──────────┬─────────────────────┘
     │                   │
     │             ┌─────┴─────┐
     │             │           │
     │            YES          NO
     │             │           │
     └─────────────┴───────────┘
                   │           │
                   ▼           ▼
         ┌──────────────┐  ┌──────────────┐
         │ Set AI       │  │ Keep existing│
         │ explanation  │  │ explanation  │
         └──────────────┘  └──────────────┘
```

---

## Component Communication

```
┌─────────────────────────────────────────────────────────┐
│  QuestionEditorInline.svelte                            │
│                                                          │
│  State:                                                  │
│  • questionStem: string                                 │
│  • correctAnswers: string[]                             │
│  • options: Array<{text: string}>                       │
│  • questionExplanation: string                          │
│  • showAIAssistant: boolean                             │
│  • userFocus: Focus                                     │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Functions:                                     │    │
│  │  • canShowAIAssistant() → boolean              │    │
│  │  • handleAIAccept(distractors, explanation)    │    │
│  │  • handleAICancel()                             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Render:                                        │    │
│  │  {#if showAIAssistant}                          │    │
│  │    <QuestionAIAssistant                         │    │
│  │      stem={questionStem}                        │────┼──┐
│  │      correctAnswers={...}                       │    │  │
│  │      existingOptions={...}                      │    │  │
│  │      focus={userFocus}                          │    │  │
│  │      onAccept={handleAIAccept}                  │    │  │
│  │      onCancel={handleAICancel}                  │    │  │
│  │    />                                           │    │  │
│  │  {/if}                                          │    │  │
│  └────────────────────────────────────────────────┘    │  │
└─────────────────────────────────────────────────────────┘  │
                                                             │
                                                             │
┌────────────────────────────────────────────────────────────┘
│
│  Props passed ▼
│
│  ┌─────────────────────────────────────────────────────┐
│  │  QuestionAIAssistant.svelte                         │
│  │                                                      │
│  │  Props:                                              │
└─▶│  • stem: string                                     │
   │  • correctAnswers: string[]                         │
   │  • existingOptions: string[]                        │
   │  • focus: Focus                                     │
   │  • onAccept: (distractors, explanation) => void    │
   │  • onCancel: () => void                             │
   │                                                      │
   │  State:                                              │
   │  • isGenerating: boolean                            │
   │  • error: string                                    │
   │  • generated: {distractors, explanation} | null     │
   │  • showPreview: boolean                             │
   │                                                      │
   │  ┌────────────────────────────────────────────┐    │
   │  │  async generateContent()                    │    │
   │  │    ↓                                        │    │
   │  │  client.action(                             │    │
   │  │    api.question.generateDistractorsAnd...   │─┐  │
   │  │    {stem, correctAnswers, ...}              │ │  │
   │  │  )                                          │ │  │
   │  └────────────────────────────────────────────┘ │  │
   └─────────────────────────────────────────────────┼──┘
                                                     │
                                                     │
   ┌─────────────────────────────────────────────────┘
   │  API call ▼
   │
   │  ┌─────────────────────────────────────────────────┐
   │  │  Convex Backend (question.ts)                   │
   │  │                                                  │
   └─▶│  generateDistractorsAndExplanation()           │
      │                                                  │
      │  1. await ctx.auth.getUserIdentity()           │
      │  2. checkAndIncrementUsage(1, userId)          │
      │  3. Build prompt with domain hints             │
      │  4. await ai.models.generateContent(...)       │
      │  5. Parse and validate JSON response           │
      │  6. return {distractors: [...], explanation}   │
      └────────────────────────────────────────────────┘
```

---

## Data Flow - Acceptance Path

```
1. USER CLICKS "ACCEPT & ADD"
        │
        ▼
2. QuestionAIAssistant calls onAccept(distractors, explanation)
        │
        ▼
3. QuestionEditorInline.handleAIAccept() receives:
   • distractors: ["option 1", "option 2", "option 3"]
   • explanation: "The ciliary body epithelium..."
        │
        ▼
4. Filter existing options (remove empty)
   options = [{text: "Correct answer"}]
        │
        ▼
5. Append distractors
   options = [
     {text: "Correct answer"},
     {text: "option 1"},
     {text: "option 2"},
     {text: "option 3"}
   ]
        │
        ▼
6. Handle explanation
   ┌─────────────────────┐
   │ Is explanation      │
   │ already filled?     │
   └──────┬──────────────┘
          │
    ┌─────┴─────┐
    NO          YES
    │           │
    ▼           ▼
  Auto-set   Confirm with user
    │           │
    │      ┌────┴────┐
    │      YES      NO
    │      │         │
    └──────┴─────────┘
           │         │
           ▼         ▼
    Set AI      Keep existing
    explanation explanation
        │
        ▼
7. Update TipTap editor content
   $explanationEditor.commands.setContent(explanation)
        │
        ▼
8. Close AI Assistant
   showAIAssistant = false
        │
        ▼
9. Trigger onChange() for autosave
        │
        ▼
10. Show success toast
    "AI suggestions added! Review and edit as needed."
        │
        ▼
    USER CAN NOW EDIT AND SAVE
```

---

## Usage Limit Flow

```
┌──────────────────────────┐
│ User attempts to         │
│ generate                 │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ checkAndIncrementUsage(count=1)          │
│                                          │
│ 1. Find user by clerkUserId              │
│ 2. Get current usage from user.gener...  │
│ 3. Check if > 24h since last reset      │
│    • If yes: reset to {count: 0, ...}   │
│    • If no: use existing                 │
│ 4. Check subscription status (Polar)     │
│    • Active/Trialing → isPro = true     │
│    • Else → isPro = false                │
│ 5. Determine limit                       │
│    • isPro ? 300 : 15                    │
└────────────┬─────────────────────────────┘
             │
        ┌────┴────┐
        │         │
   UNDER      OVER
   LIMIT      LIMIT
        │         │
        ▼         ▼
┌──────────┐  ┌─────────────────────────┐
│ Increment│  │ Throw error:            │
│ counter  │  │ "Daily generation limit │
│          │  │  reached. [Upgrade msg]"│
│ Allow    │  └─────────────────────────┘
│ generation│             │
└──────────┘             │
     │                   ▼
     │         ┌─────────────────────┐
     │         │ Frontend catches    │
     │         │ Shows error in UI   │
     │         │ • Red alert box     │
     │         │ • Clear message     │
     │         │ • Upgrade CTA       │
     │         └─────────────────────┘
     ▼
┌──────────────────┐
│ Proceed with API │
│ call to Gemini   │
└──────────────────┘
```

---

## Prompt Construction Flow

```
Input:
• stem: "Which structure produces aqueous humor?"
• correctAnswers: ["Ciliary body epithelium"]
• existingOptions: []
• focus: "optometry"
• numDistractors: 3
        │
        ▼
┌─────────────────────────────────────────┐
│ 1. Determine audience from focus        │
│    optometry → "optometry students"     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 2. Add domain hint                      │
│    "Prefer ocular relevance when        │
│     present"                             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 3. Build correct answers list           │
│    "1. Ciliary body epithelium"         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 4. Add existing options context         │
│    (if any - avoid duplicates)          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 5. Construct full prompt:               │
│                                          │
│ Role: AI assistant for medical ed...    │
│                                          │
│ Goal: Generate 3 distractors +          │
│       explanation                        │
│                                          │
│ Question Stem: [stem]                   │
│ Correct Answer(s): [list]               │
│ Existing options: [list or none]        │
│                                          │
│ Instructions for Distractors:           │
│ - Create exactly 3 incorrect...         │
│ - Make challenging...                   │
│ - [domain hint]                         │
│ - No prefixes...                        │
│                                          │
│ Instructions for Explanation:           │
│ - Explain correct answer...             │
│ - Explain each distractor...            │
│ - 3-6 sentences...                      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 6. Send to Gemini with schema:          │
│    {                                     │
│      type: OBJECT,                       │
│      properties: {                       │
│        distractors: ARRAY[3] of STRING, │
│        explanation: STRING               │
│      }                                   │
│    }                                     │
└─────────────────────────────────────────┘
```

---

## File Structure

```
/Users/justindang/learnterms/
│
├── src/
│   ├── convex/
│   │   └── question.ts
│   │       └── generateDistractorsAndExplanation() ← NEW ACTION
│   │
│   └── lib/
│       ├── admin/
│       │   ├── QuestionAIAssistant.svelte ← NEW COMPONENT
│       │   └── QuestionEditorInline.svelte ← MODIFIED
│       │
│       └── config/
│           └── generation.ts ← Focus type used
│
└── dev/
    ├── AI_QUESTION_ASSISTANT_FEATURE.md ← DOCUMENTATION
    ├── AI_ASSISTANT_PROTOTYPE_SUMMARY.md ← SUMMARY
    └── AI_ASSISTANT_FLOW_DIAGRAM.md ← THIS FILE
```

---

## State Machine - AI Assistant Component

```
                    ┌──────────┐
                    │  IDLE    │
                    │          │
                    └────┬─────┘
                         │
            User clicks Generate button
                         │
                         ▼
                  ┌─────────────┐
                  │ GENERATING  │
                  │ • Show spinner
                  │ • Disable buttons
                  └──────┬──────┘
                         │
              ┌──────────┴──────────┐
              │                     │
          SUCCESS               ERROR
              │                     │
              ▼                     ▼
      ┌──────────────┐      ┌─────────────┐
      │  PREVIEW     │      │   ERROR     │
      │ • Show results      │ • Show message
      │ • Enable actions    │ • Can retry
      └──────┬───────┘      └──────┬──────┘
             │                     │
      ┌──────┼──────┐             │
      │      │      │             │
   Accept  Regen  Cancel          │
      │      │      │             │
      ▼      │      ▼             ▼
    DONE     │    IDLE          IDLE
             │
             └────────▶ GENERATING
```

---

## Error States & Recovery

```
┌─────────────────────────────────────────────────────┐
│                  ERROR SCENARIOS                     │
└─────────────────────────────────────────────────────┘

1. NOT AUTHENTICATED
   ├─ Error: "Unauthenticated"
   ├─ UI: Generic error message
   └─ Recovery: User should log in (handled by app)

2. USAGE LIMIT REACHED (Free)
   ├─ Error: "Daily generation limit reached..."
   ├─ UI: Special limitReached state
   │   ├─ Shows ModuleLimitModal
   │   └─ Upgrade CTA
   └─ Recovery: Wait 24h or upgrade to Pro

3. USAGE LIMIT REACHED (Pro)
   ├─ Error: "Daily generation limit reached..."
   ├─ UI: Shows limit without upgrade option
   └─ Recovery: Wait 24h

4. GEMINI API KEY MISSING
   ├─ Error: "GEMINI_API_KEY is not configured"
   ├─ UI: Generic error message
   └─ Recovery: Admin must configure environment

5. GEMINI API FAILURE
   ├─ Error: Network timeout / API error
   ├─ UI: "Failed to generate questions. Try again."
   └─ Recovery: Retry button available

6. INVALID RESPONSE STRUCTURE
   ├─ Error: "Failed to parse AI-generated..."
   ├─ UI: Generic error message
   └─ Recovery: Retry with new generation

7. INSUFFICIENT DISTRACTORS
   ├─ Error: "Only generated N distractors..."
   ├─ UI: Generic error message
   └─ Recovery: Retry generation

┌─────────────────────────────────────────────────────┐
│              RECOVERY STRATEGIES                     │
└─────────────────────────────────────────────────────┘

All errors allow:
• Cancel button (closes assistant)
• Error message display
• Maintains form state (no data loss)

Specific recoveries:
• Retry: Click Generate again (for transient errors)
• Wait: Timer shows when limits reset
• Upgrade: Link to subscription page
• Edit manually: Close assistant, continue without AI
```

---

## Performance Considerations

```
┌─────────────────────────────────────────────────────┐
│                   PERFORMANCE                        │
└─────────────────────────────────────────────────────┘

Generation Time Breakdown:
├─ Frontend to Convex: ~100-200ms
├─ Auth + Usage Check: ~50-100ms
├─ Gemini API Call: ~2000-4000ms ← Biggest factor
├─ Response Parsing: ~10-20ms
└─ Total: ~3-5 seconds

Optimization Strategies:
1. ✅ Structured JSON output (faster than text parsing)
2. ✅ Temperature: 0.8 (balanced speed/quality)
3. ✅ Max tokens: 2048 (sufficient but not excessive)
4. ✅ Single API call (no retry loop)
5. ⏳ Future: Cache common patterns

User Experience:
├─ Loading state with spinner
├─ "Generating..." text
└─ Future: Progress bar, fun facts, estimated time
```

---

## Testing Scenarios

```
┌─────────────────────────────────────────────────────┐
│                 TEST SCENARIOS                       │
└─────────────────────────────────────────────────────┘

HAPPY PATH
├─ 1. Simple MC question → generates 3 distractors
├─ 2. Multiple correct answers → context-aware distractors
├─ 3. Existing options → avoids duplicates
└─ 4. Different focus domains → domain-specific distractors

EDGE CASES
├─ 1. Very long stem (500+ words) → still works
├─ 2. Very short stem (5 words) → quality may vary
├─ 3. Empty existing options list → works normally
├─ 4. 10 existing options → generates without duplicates
└─ 5. Special characters in stem → handles correctly

ERROR CASES
├─ 1. Usage limit hit → shows clear error + upgrade
├─ 2. Network timeout → retry available
├─ 3. Invalid auth → error message
├─ 4. Gemini API down → graceful failure
└─ 5. Malformed response → retry available

USER INTERACTIONS
├─ 1. Click Generate → Accept → Save
├─ 2. Click Generate → Regenerate → Accept
├─ 3. Click Generate → Cancel (no changes)
├─ 4. Accept with existing explanation → confirm dialog
└─ 5. Edit after accepting → all editable

BOUNDARY CONDITIONS
├─ 1. First use (usage count = 0) → works
├─ 2. Exactly at limit (14/15 used) → allows 1 more
├─ 3. Over limit by 1 (15/15 used) → blocks
└─ 4. After 24h reset → count resets to 0
```

---

## Future Enhancement Hooks

```
Current Architecture Allows:

1. DIFFICULTY CONTROL
   └─ Add "difficulty" param to action
   └─ Modify prompt: "Generate [easy/medium/hard] distractors"

2. QUANTITY SELECTION
   └─ UI: Dropdown for 2-5 distractors
   └─ Pass numDistractors param (already supported!)

3. REGENERATE INDIVIDUAL
   └─ UI: "Regenerate" button per distractor
   └─ New action: regenerateSingleDistractor()

4. EXPLANATION TEMPLATES
   └─ UI: Radio buttons for brief/detailed/case
   └─ Modify prompt based on selection

5. CUSTOM INSTRUCTIONS
   └─ UI: Text field for custom guidance
   └─ Append to prompt (already supported via customPrompt!)

6. LEARNING FROM EDITS
   └─ Track: which distractors get edited
   └─ Store: original vs edited text
   └─ Analyze: common edit patterns
   └─ Improve: prompts based on patterns

7. BATCH MODE
   └─ UI: Queue multiple questions
   └─ Backend: Process in parallel
   └─ Frontend: Show progress per question
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────┐
│         EXISTING SYSTEMS USED                        │
└─────────────────────────────────────────────────────┘

1. AUTHENTICATION (Clerk)
   └─ getUserIdentity() in action
   └─ clerkUserId for usage tracking

2. USAGE LIMITS (Convex)
   └─ checkAndIncrementUsage mutation
   └─ user.generationUsage field

3. SUBSCRIPTION (Polar Component)
   └─ getCurrentSubscription query
   └─ Determines free vs pro limits

4. AI GENERATION (Gemini)
   └─ GoogleGenAI client
   └─ Structured output with schema

5. FOCUS CONFIGURATION
   └─ productModels from generation.ts
   └─ Focus type (optometry/pharmacy/general)

6. TOAST NOTIFICATIONS
   └─ toastStore.success()
   └─ Shows feedback to user

7. EDITOR CONTENT
   └─ TipTap $explanationEditor
   └─ setContent() for explanation

┌─────────────────────────────────────────────────────┐
│         NEW SYSTEMS CREATED                          │
└─────────────────────────────────────────────────────┘

1. CONVEX ACTION
   └─ generateDistractorsAndExplanation
   └─ In question.ts file

2. UI COMPONENT
   └─ QuestionAIAssistant.svelte
   └─ Standalone, reusable

3. INTEGRATION HOOKS
   └─ canShowAIAssistant()
   └─ handleAIAccept()
   └─ handleAICancel()
```

---

This completes the visual documentation of the AI Question Assistant feature!
