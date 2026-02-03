# AI Question Assistant Feature

**Date:** February 2, 2026  
**Status:** Prototype Complete  
**Feature Type:** Question Creation Enhancement

---

## Overview

The **AI Question Assistant** is a new feature that bridges the gap between fully manual and fully AI-generated question creation. It allows educators to write their own question stem and correct answer(s), then use AI to generate plausible distractor options and a comprehensive explanation.

### Problem Statement

Current question creation offers two paths:
1. **Fully Manual**: Educator writes everything (stem, all options, explanation)
2. **Fully AI-Generated**: AI creates complete questions from source material

**Gap**: Educators often have excellent question ideas and know the correct answer, but struggle with:
- Creating plausible but incorrect distractor options
- Writing comprehensive explanations that address common misconceptions
- Balancing difficulty levels across options

### Solution

The AI Question Assistant provides **targeted AI assistance** for the hardest parts of question authoring:
- ✅ Educator maintains control over the core question and correct answer
- ✅ AI generates domain-specific distractors based on common misconceptions
- ✅ AI writes explanations that justify correct answers and explain why distractors are wrong
- ✅ Educator reviews and edits all AI suggestions before accepting

---

## User Experience

### Activation Flow

1. **Preconditions** (all must be met):
   - Question type is **Multiple Choice**
   - Question stem is filled in
   - At least one correct answer is marked

2. **Trigger**:
   - Button appears above the Options section: **"Generate Options & Explanation with AI"**
   - Button is disabled with helpful tooltip if preconditions aren't met

3. **AI Assistant Interface Opens**:
   - Shows preview of stem and correct answers
   - Lists any existing options (AI will avoid duplicates)
   - Displays focus domain (optometry/pharmacy/general)
   - Shows AI credit usage (1 credit)

4. **Generation**:
   - User clicks **"Generate Options & Explanation"**
   - Loading state with spinner
   - Handles usage limits with clear error messages

5. **Preview Results**:
   - Displays 3 generated distractor options
   - Shows comprehensive explanation
   - Info alert: "Review and edit after accepting"

6. **User Decision**:
   - **Accept & Add to Question**: Adds distractors to options list, sets explanation
   - **Regenerate**: Generates new suggestions (uses another credit)
   - **Cancel**: Closes assistant without changes

### Smart Merging Behavior

**Options Handling:**
- Filters out empty existing options
- Appends AI-generated distractors to the end
- Preserves all existing options (non-destructive)

**Explanation Handling:**
- If no explanation exists: Sets AI explanation automatically
- If explanation exists: Prompts user with confirmation dialog
  - "You already have an explanation. Do you want to replace it with the AI-generated one?"
  - User chooses to replace or keep existing

---

## Technical Architecture

### Backend: Convex Action

**File:** `/src/convex/question.ts`

**Function:** `generateDistractorsAndExplanation`

```typescript
export const generateDistractorsAndExplanation = action({
	args: {
		stem: v.string(),
		correctAnswers: v.array(v.string()),
		existingOptions: v.optional(v.array(v.string())),
		focus: v.string(),
		numDistractors: v.optional(v.number())
	},
	handler: async (ctx, { stem, correctAnswers, existingOptions = [], focus, numDistractors = 3 }) => {
		// ... implementation
	}
});
```

**Key Features:**

1. **Usage Limits**:
   - Uses same limits as question generation (15 free, 300 pro)
   - Counts as 1 question generation per request
   - Authentication required via Clerk

2. **Domain-Specific Prompts**:
   ```typescript
   const domainHint =
       focusLabel === 'optometry'
           ? '- Distractors should reflect common misconceptions in optometry.'
           : focusLabel === 'pharmacy'
               ? '- Distractors should reflect common pharmacotherapy misconceptions or similar-sounding drugs/mechanisms.'
               : '';
   ```

3. **Structured Output**:
   - Uses Gemini's structured JSON output with schema validation
   - Enforces exact number of distractors (default: 3)
   - Validates explanation is present and non-empty

4. **Temperature**: 0.8 (slightly higher than question generation for creative distractors)

5. **Context Awareness**:
   - Receives existing options to avoid duplication
   - Considers all marked correct answers (supports multiple correct answers)

### Frontend: UI Component

**File:** `/src/lib/admin/QuestionAIAssistant.svelte`

**Props:**
```typescript
type Props = {
    stem: string;
    correctAnswers: string[];
    existingOptions: string[];
    focus?: Focus;
    onAccept: (distractors: string[], explanation: string) => void;
    onCancel: () => void;
};
```

**States:**
- `isGenerating`: Loading state during API call
- `error`: Error message display
- `generated`: Holds AI response (distractors + explanation)
- `showPreview`: Toggles between initial and preview views

**Design System:**
- Gradient background (purple-to-blue) to distinguish from main editor
- Icon: Sparkles (consistent AI indicator)
- Color coding: Green borders for successful generation
- Alert boxes: Info alerts for user guidance

### Integration: QuestionEditorInline

**File:** `/src/lib/admin/QuestionEditorInline.svelte`

**New State:**
```typescript
let showAIAssistant: boolean = $state(false);
let userFocus: Focus = $state('general'); // TODO: fetch from user settings
```

**Helper Functions:**
```typescript
function canShowAIAssistant(): boolean {
    return (
        questionType === QUESTION_TYPES.MULTIPLE_CHOICE &&
        questionStem.trim().length > 0 &&
        correctAnswers.length > 0
    );
}

function handleAIAccept(distractors: string[], explanation: string) {
    // Merge logic with smart explanation handling
}

function handleAICancel() {
    showAIAssistant = false;
}
```

**UI Location:**
- Appears above the Options section (only for Multiple Choice)
- Shows before the existing "Options" header
- Integrates seamlessly with existing layout

---

## Prompt Engineering

### Distractor Generation Prompt

The prompt is carefully crafted to generate high-quality distractors:

**Key Instructions:**
1. ✅ Create exactly N plausible but incorrect options
2. ✅ Make distractors challenging (tempting to students with partial knowledge)
3. ✅ Match length/complexity of correct answers
4. ✅ Use common misconceptions, near-miss answers, or related concepts
5. ✅ Domain-specific guidance (optometry/pharmacy)
6. ❌ Don't make distractors obviously wrong or silly
7. ❌ No leading letters, numbers, or punctuation

**Explanation Instructions:**
1. Explain why correct answer(s) are correct with supporting reasoning
2. Explain why each distractor is incorrect and what misconception it represents
3. Provide educational context for learning from mistakes
4. Self-contained (no external references)
5. Clear, educational language (3-6 sentences)

### Example Prompt Structure

```
Role: You are an AI assistant specializing in medical education, helping educators 
create high-quality distractor options and explanations for assessment questions.

Goal: Generate 3 plausible but incorrect distractor options and a comprehensive 
explanation for this question.

Question Stem:
Which cranial nerve is responsible for visual acuity?

Correct Answer(s):
1. Optic nerve (CN II)

Existing options already created:
(none)

Instructions for Distractors:
- Create exactly 3 incorrect options that are plausible but definitively wrong
- Make distractors challenging - they should be tempting to students who have 
  partial knowledge
- Distractors should be similar in length and complexity to the correct answer(s)
- Use common misconceptions, near-miss answers, or related but incorrect concepts
- Distractors should reflect common misconceptions in optometry.
- Do NOT make distractors obviously wrong or silly
- Each distractor must be a plain string with NO leading letters, numbers, or 
  punctuation (no prefixes like "A.", "1)", or "-")

Instructions for Explanation:
- Write a comprehensive explanation that:
  1. Explains why the correct answer(s) are correct with supporting reasoning
  2. Explains why each distractor is incorrect and what misconception it represents
  3. Provides educational context to help students learn from their mistakes
- The explanation should be self-contained (don't reference "the material" or 
  external sources)
- Use clear, educational language appropriate for optometry students
- Length: 3-6 sentences (concise but thorough)
```

---

## Usage Limits & Cost

### Credit System

- **Cost per use**: 1 AI generation credit
- **Free tier**: 15 credits/day
- **Pro tier**: 300 credits/day

### Why count as 1 credit?

The AI Assistant uses similar computational resources to generating a single question:
- Gemini API call with structured output
- Context analysis (stem + correct answers)
- Creative generation (3 distractors + explanation)
- Validation and formatting

### Usage Tracking

Same infrastructure as question generation:
```typescript
await ctx.runMutation(internal.question.checkAndIncrementUsage, {
    count: 1,
    clerkUserId: identity.subject
});
```

---

## User Scenarios

### Scenario 1: Clinical Pharmacology Question

**Educator Input:**
- **Stem**: "A patient presents with hypertension and diabetes. Which antihypertensive class should be avoided?"
- **Correct Answer**: "Non-selective beta blockers"

**AI Generates:**
- **Distractors**:
  1. ACE inhibitors
  2. Calcium channel blockers
  3. Thiazide diuretics
- **Explanation**: "Non-selective beta blockers should be avoided because they can mask hypoglycemia symptoms and worsen glycemic control in diabetic patients. ACE inhibitors are actually preferred in diabetic hypertensive patients for renal protection. Calcium channel blockers and thiazide diuretics (in low doses) are acceptable alternatives, though thiazides may slightly worsen glucose tolerance at higher doses."

**Educator Action**: Reviews, accepts, minor edits to explanation for course-specific context.

### Scenario 2: Optometry Anatomy Question

**Educator Input:**
- **Stem**: "Which structure is responsible for producing aqueous humor?"
- **Correct Answer**: "Ciliary body epithelium"

**AI Generates:**
- **Distractors**:
  1. Trabecular meshwork
  2. Canal of Schlemm
  3. Iris sphincter muscle
- **Explanation**: "The ciliary body epithelium produces aqueous humor, which maintains intraocular pressure and provides nutrients to the lens and cornea. The trabecular meshwork and Canal of Schlemm are drainage structures, not production sites. The iris sphincter muscle controls pupil size and is not involved in aqueous humor production."

**Educator Action**: Accepts all, adds clinical note about glaucoma relevance.

### Scenario 3: Multiple Correct Answers

**Educator Input:**
- **Stem**: "Which of the following are first-line treatments for acute bacterial conjunctivitis?"
- **Correct Answers**: 
  1. Moxifloxacin ophthalmic solution
  2. Azithromycin ophthalmic solution

**AI Generates:**
- **Distractors**:
  1. Oral doxycycline
  2. Prednisolone acetate ophthalmic
  3. Artificial tears
- **Explanation**: "Moxifloxacin and azithromycin are both fluoroquinolone and macrolide topical antibiotics, respectively, and serve as first-line treatments for acute bacterial conjunctivitis. Oral doxycycline would be considered for more severe infections like preseptal cellulitis. Prednisolone acetate is a steroid that could worsen bacterial infections. Artificial tears provide symptomatic relief but don't treat the underlying infection."

**Educator Action**: Accepts, notes excellent distractor selection.

---

## Benefits Over Alternatives

### vs. Fully Manual Creation

| Aspect | Manual | AI Assistant |
|--------|--------|-------------|
| **Time to create** | 5-10 min | 2-3 min |
| **Distractor quality** | Varies by educator | Consistently plausible |
| **Explanation depth** | Often brief | Comprehensive by default |
| **Misconception coverage** | May miss common errors | Built-in from training data |
| **Cognitive load** | High (6 components) | Medium (2 components) |

### vs. Fully AI-Generated

| Aspect | Fully AI | AI Assistant |
|--------|----------|-------------|
| **Question stem quality** | Generic, may miss nuance | Educator-crafted, precise |
| **Alignment with learning objectives** | Approximate | Exact |
| **Clinical relevance** | Variable | High (educator ensures) |
| **Correct answer accuracy** | 95% (needs review) | 100% (educator provides) |
| **Educator control** | Low | High |
| **Student trust** | Lower | Higher |

---

## Future Enhancements

### Phase 1 (Current Prototype)
- ✅ Basic distractor generation (3 options)
- ✅ Explanation generation
- ✅ Domain awareness (optometry/pharmacy/general)
- ✅ Usage limits integration
- ✅ Non-destructive merging

### Phase 2 (Near-term)
- [ ] **Difficulty level control**: "Generate easy/medium/hard distractors"
- [ ] **Quantity selection**: Choose 2-5 distractors
- [ ] **Focus targeting**: "Focus on pharmacokinetics" or "Focus on diagnosis"
- [ ] **User settings**: Save preferred domain focus in user profile
- [ ] **Regenerate individual distractors**: Keep some, regenerate others
- [ ] **Explanation templates**: "Brief", "Detailed", "Case-based"

### Phase 3 (Medium-term)
- [ ] **Learning from edits**: Track which AI distractors get edited/rejected
- [ ] **Adaptive generation**: Improve prompts based on acceptance rates
- [ ] **Batch mode**: Generate for multiple questions in sequence
- [ ] **Citation support**: "Based on [textbook chapter]"
- [ ] **Peer review mode**: Flag AI-generated components for colleague review

### Phase 4 (Long-term)
- [ ] **Student performance integration**: Generate distractors based on common errors in past quizzes
- [ ] **Multilingual support**: Generate in different languages
- [ ] **Voice input**: Dictate question and correct answer
- [ ] **Collaborative editing**: Multiple educators refine AI suggestions together

---

## Technical Debt & TODOs

### Immediate
- [ ] **User focus detection**: Currently hardcoded to 'general', need to fetch from user settings/profile
- [ ] **Error handling improvements**: More specific error messages for different failure modes
- [ ] **Loading state polish**: Add progress indicators or fun facts during generation
- [ ] **Keyboard shortcuts**: Add hotkeys for accept/cancel/regenerate

### Short-term
- [ ] **Analytics tracking**: Log usage patterns (acceptance rate, regeneration frequency)
- [ ] **A/B testing**: Test different prompt variations for quality
- [ ] **Unit tests**: Test distractor validation and merging logic
- [ ] **E2E tests**: Simulate full workflow with mocked AI responses

### Medium-term
- [ ] **Rate limiting UI**: Show usage remaining before hitting limit
- [ ] **Prompt versioning**: Track prompt changes and A/B test improvements
- [ ] **Quality scoring**: Let educators rate AI suggestions to improve over time
- [ ] **Offline mode**: Cache common distractor patterns for quick generation

---

## Success Metrics

### Primary KPIs

1. **Adoption Rate**
   - Target: 40% of question creators use AI Assistant at least once
   - Measurement: Track unique users who click "Generate Options & Explanation"

2. **Acceptance Rate**
   - Target: 70% of AI suggestions accepted with minor or no edits
   - Measurement: Track "Accept & Add" vs "Cancel" after preview

3. **Time Savings**
   - Target: 60% reduction in question creation time
   - Measurement: Compare avg time for questions with vs without AI Assistant

4. **Quality Maintenance**
   - Target: AI-assisted questions perform ≥95% as well as fully manual questions
   - Measurement: Student performance, psychometric analysis

### Secondary KPIs

5. **Regeneration Rate**: <30% (indicates first generation usually acceptable)
6. **Edit Frequency**: Track which components get edited most (distractors vs explanation)
7. **Domain Preference**: Which focus (optometry/pharmacy/general) is most used
8. **Usage Over Time**: Does usage increase with familiarity?

---

## Implementation Checklist

### Backend
- [x] Create `generateDistractorsAndExplanation` Convex action
- [x] Integrate with usage limits system
- [x] Add domain-specific prompts (optometry/pharmacy)
- [x] Implement structured JSON schema validation
- [x] Handle error cases (API failures, limits, invalid inputs)

### Frontend
- [x] Create `QuestionAIAssistant.svelte` component
- [x] Add trigger button in `QuestionEditorInline.svelte`
- [x] Implement preview/accept/cancel workflow
- [x] Add smart merging logic for options and explanations
- [x] Import Sparkles icon
- [x] Add user focus state (hardcoded to 'general' for now)

### Documentation
- [x] Feature specification (this document)
- [x] User guide section (see User Experience above)
- [x] API documentation (see Technical Architecture above)

### Testing (TODO)
- [ ] Unit tests for merging logic
- [ ] Integration tests for Convex action
- [ ] E2E tests for full workflow
- [ ] Manual QA: Create 10 test questions with AI Assistant
- [ ] User testing: 3-5 educators try the feature

### Deployment (TODO)
- [ ] Deploy backend changes to production
- [ ] Feature flag: Enable for beta testers first
- [ ] Monitor error rates and API usage
- [ ] Gather feedback from beta testers
- [ ] Full rollout after 1 week of stable beta

---

## Risks & Mitigations

### Risk 1: AI generates inappropriate distractors

**Impact**: Medium  
**Likelihood**: Low  
**Mitigation**:
- Preview step forces review before acceptance
- Educators are domain experts who will catch errors
- Track reported issues and refine prompts
- Add content moderation if needed

### Risk 2: Over-reliance on AI reduces question quality

**Impact**: High  
**Likelihood**: Low  
**Mitigation**:
- Feature is opt-in, not default
- Preview encourages critical review
- Documentation emphasizes educator control
- Monitor quality metrics (student performance)

### Risk 3: Usage limits frustrate users

**Impact**: Medium  
**Likelihood**: Medium  
**Mitigation**:
- Clear communication of limits upfront
- Helpful error messages with upgrade path
- Generous pro limits (300/day sufficient for serious use)
- Consider higher limits for verified educators

### Risk 4: Gemini API reliability issues

**Impact**: High  
**Likelihood**: Low  
**Mitigation**:
- Graceful error handling with retry logic
- Fallback: Save draft and try again later
- Status page: Show API health
- Consider multi-provider strategy long-term

---

## Comparison to Industry

### Quizlet
- **AI Features**: Q-Chat (study assistant), Magic Notes (generate flashcards)
- **Gap**: No targeted distractor generation for existing questions
- **LearnTerms Advantage**: Hybrid control (educator stem + AI distractors)

### Kahoot
- **AI Features**: Question generation from text/slides
- **Gap**: All-or-nothing AI generation
- **LearnTerms Advantage**: Surgical AI assistance for specific components

### Canvas/Blackboard
- **AI Features**: Limited to content suggestions, not question creation
- **Gap**: No AI-assisted authoring tools
- **LearnTerms Advantage**: Domain-specific medical education AI

### ExamSoft
- **AI Features**: None (traditional test platform)
- **Gap**: Manual creation only
- **LearnTerms Advantage**: Modern AI tooling

**Conclusion**: LearnTerms' AI Question Assistant fills a unique niche by providing **targeted, educator-controlled AI assistance** rather than black-box generation.

---

## Conclusion

The AI Question Assistant represents a **thoughtful evolution** in question authoring tools:

✅ **Educator Empowerment**: Keeps experts in control of core content  
✅ **Efficiency Gains**: Reduces tedious work (distractor brainstorming)  
✅ **Quality Maintenance**: AI provides domain-specific, plausible options  
✅ **Flexibility**: Non-destructive, review-first workflow  
✅ **Scalability**: Same infrastructure as existing AI features  

This feature **bridges the gap** between fully manual and fully automated question creation, giving educators the best of both worlds:
- **Human expertise** for question stems and correct answers
- **AI efficiency** for distractors and explanations
- **Collaborative refinement** for final quality

Next steps:
1. User testing with 5-10 educators
2. Gather feedback and iterate on prompts
3. Add user focus setting integration
4. Track metrics and optimize for adoption

---

**Document Version:** 1.0  
**Last Updated:** February 2, 2026  
**Author:** AI Development Team  
**Status:** Ready for Beta Testing
