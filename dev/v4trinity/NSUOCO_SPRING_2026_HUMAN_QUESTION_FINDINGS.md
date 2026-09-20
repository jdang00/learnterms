# NSUOCO Spring 2026 Human Question Findings

Date: 2026-06-23

Source: production Convex database review of NSUOCO Class of 2028 Spring 2026 content.

## Scope

This review sampled production Convex questions from:

- School: Northeastern State University Oklahoma College of Optometry
- Cohort: Class of 2028
- Semester: Spring 2026
- Classes:
  - Ocular Disease II: Glaucoma
  - Ocular Pharmacology
  - Vision Science III: Motility
  - Contact Lenses II
  - Pediatrics

Full slice reviewed:

- 1,625 questions
- 57 modules
- 5 classes
- 6 author buckets
- 0 AI-generated questions in this target slice

Question types:

- 1,299 multiple choice
- 137 matching
- 101 fill in the blank
- 88 true/false

Author distribution:

- Brayden Dyer: 831
- Justin Dang: 365
- Unknown legacy author records: 279
- Collin Lorenz: 146
- Nate Sudderth: 2
- Kaitlyn Shima: 2

Class distribution:

- Ocular Disease II: Glaucoma: 309
- Ocular Pharmacology: 374
- Vision Science III: Motility: 484
- Contact Lenses II: 156
- Pediatrics: 302

Quality signals observed:

- 1,443 questions had rationales.
- 194 questions used media.
- 392 questions were multi-select.
- 554 questions looked clinically/applied by text heuristic.
- 348 questions were definition-style.
- 646 questions were short recall.
- 319 questions had long/applied stems.

## High-Level Finding

The best human-written questions are not merely "clean" questions. They are locally calibrated study objects. They preserve what classmates are likely to miss, what the professor emphasized, how a topic was explained in class, and what the writer personally found sticky enough to encode.

That is the core reason handwritten questions still matter.

AI can produce well-formatted questions quickly, but the human-written set shows a different value: it captures the lived syllabus, the cohort's confusions, the local exam culture, and the small clinical judgment calls that generic generation often washes out.

## Traits of a Quality Question

### 1. It Tests A Decision, Not Just A Fact

The strongest questions ask the learner to decide what matters in context.

Example:

> Your 44 YOF patient works as a nurse at the local in-patient hospital. She presents with a swollen, red left eye that has slowly gotten worse over the past couple days. She first noticed slight redness after her 18 hour shift, but she was too tired to worry about it. The next time she noticed it was the next day on her way to her 10 hour shift. She has no fever, no pain with eye movements, and both pupils are equally round and reactive to light and accommodation. Allergies include sulfa drugs and codeine. Which of the following would be most effective for this patient?

Correct answer: Clindamycin.

Why this is strong:

- It forces diagnosis first: likely MRSA preseptal cellulitis.
- It includes red-flag exclusions: no fever, no pain with EOMs, normal pupils.
- It includes an allergy constraint: sulfa allergy blocks Bactrim DS.
- The distractors map to real management options: Augmentin, Keflex, Bactrim DS, vancomycin, clindamycin.
- The answer is not just "know clindamycin." It is "choose clindamycin because the clinical picture and allergy profile make other choices worse."

Weak AI versions of this usually ask:

> What is used to treat MRSA preseptal cellulitis?

That loses most of the clinical reasoning.

### 2. It Builds In A Near-Miss Trap

Good questions often include an answer that would be reasonable if one detail changed.

Example:

> Which of the following medications would NOT be indicated in cases of normal tension glaucoma?

Correct answer: Timolol.

Rationale pattern:

- Timolol reduces IOP, so it is tempting.
- But systemic hypotension is bad in normal tension glaucoma because vascular insufficiency may be part of the damage mechanism.
- Betaxolol is also a beta-blocker but was framed as different because of optic nerve head perfusion considerations.

This question is good because the wrong answer is not random. It is a trap based on overgeneralizing "IOP lowering is good."

Future agents should deliberately write distractors that represent plausible but wrong clinical shortcuts.

### 3. It Explains The Mechanism Behind The Answer

Many strong questions have rationales that teach the causal chain.

Example:

> Which of the following best describes a major ocular side effect of topical carbonic anhydrase inhibitors?

Correct answer: Corneal decompensation.

Rationale substance:

- The corneal endothelium uses carbonic anhydrase to maintain deturgescence.
- In a sick cornea, topical CAI inhibition can cause edema.
- The edema can worsen an already compromised cornea.

This is much better than:

> CAIs can cause corneal decompensation.

The quality comes from the mechanism. A learner can now transfer the fact to a patient with Fuchs, endothelial disease, or prior corneal compromise.

### 4. It Anchors Numeric Thresholds In Use Cases

The database contains many threshold questions. The good ones do not just ask for a number; they attach the number to a workflow.

Examples:

- Head shaking visual acuity: abnormal threshold is 3 lines of VA loss.
- Visual field undercorrection: about 1 dB sensitivity loss per 1 D undercorrection, so 3 D undercorrection causes about 3 dB central depression.
- POAG diurnal IOP fluctuation: abnormal threshold around 10 mmHg.
- Retinoblastoma: most cases diagnosed before age 5.
- Teller acuity approximation: 600 / age in months, so 8 months maps to about 20/75.
- Contact lens vascularization progression: if documented progression occurs, even 0.3 mm more than last year can justify changing lens/care regimen.

The best threshold questions ask the learner to do something with the threshold:

- interpret a field
- decide whether a finding is abnormal
- choose a management step
- calculate an expected acuity
- identify when a change is clinically meaningful

Future agents should avoid isolated "what is the number" unless exact recall is the point.

### 5. It Uses Media When The Skill Is Visual

The human set uses images for skills that cannot be cleanly reduced to prose:

- visual field interpretation
- corneal findings
- contact lens complications
- motility/head movement recognition
- graphs and curves
- fixation disparity diagrams
- ocular dominance histograms

Repeated stems found in media-heavy areas:

- "Analyze the following visual field. What do you suspect?"
- "Consider the following visual field printout. Can you name the defect?"
- "Observe the following figure. What is the name of this inappropriate saccade?"
- "Label the following graph."
- "What is the treatment of choice for a patient with primary congenital glaucoma with the following appearance?"
- "You patient reports the following with the Wesson card. What fixation disparity do they have?"

One strong media-linked example:

> A patient with a self-reported history of POAG presents to your office with the following appearance to his cornea. You probe about their medication history, given their history of POAG. He responds with, "I know I take a drop, but I can't remember what it's called or the color of the cap." Given this presentation, which of the following is most likely that he is taking?

Correct answer: netarsudil 0.002%.

Rationale substance:

- Rhopressa/netarsudil can cause vortex keratopathy, also called whorl keratopathy or corneal verticillata.

Why this works:

- It asks the learner to connect appearance, disease history, drug class, and medication side effect.
- It is a real clinic-style recognition task.

Future agents should not replace image-dependent questions with generic text. If source media exists, use it.

### 6. It Captures Local Voice And Memory Hooks

Several strong questions include classmate-style wording, memorable phrasing, or informal anchors.

Examples:

- "Remember the Spaeth grading system? Yeah me neither."
- "PredForte at 2x/day is inherently wimpy..."
- "This is a dumb question, I know..."
- "We don't know why."
- "sticky stomach" for necrotizing enterocolitis risk with cycloplegia.
- "crusteez" around the eyes for demodex blepharitis.

This voice is not just decoration. It helps students remember.

AI tends to remove these phrases because they look unprofessional. That can make a question less useful for peer study. The goal is not sterile board-item prose in every case. For LearnTerms, the goal is durable recall and clinical transfer.

Future agents should preserve useful human voice unless it makes the question inaccurate, offensive, confusing, or too long.

### 7. It Uses Multi-Select For Category Knowledge

Multi-select is used heavily and often appropriately.

Examples:

> In which TWO conditions would you most likely expect to see keratic precipitates on the corneal endothelium?

Correct answers:

- Glaucomatocyclitic crisis
- Fuchs heterochromic iridocyclitis

Why this is good:

- It asks for a pair of conditions sharing a finding.
- It requires classification, not single-term recall.

Example:

> Which of the following topical meds are approved for a 2yo?

Correct answers include:

- Bepreve
- Zerviate
- Lastacaft
- Pataday

Why this is good:

- The concept is naturally a group.
- A single-answer MCQ would under-test the knowledge.

Example:

> Which of the following have a "soft" preservative?

Correct answers include:

- Xelpros
- Istalol
- Alphagan P
- Travatan Z

Rationale substance:

- Travatan Z uses sofZia.
- Alphagan P uses Purite.
- Xelpros and Istalol use potassium sorbate.

Future agents should use multi-select when the real learning target is a set, but they must include a clear count cue when possible: "Which TWO", "Which THREE", "select all that apply", etc.

### 8. It Uses Fill-In-The-Blank For Exact Recall

Fill-in-the-blank was used for exact facts and calculations.

Examples:

- "Exposure to alcohol during pregnancy is most associated with this lifelong condition:" Answer: Fetal Alcohol Syndrome or FAS.
- "The threshold of viability is at \_\_\_\_ weeks of gestation." Answer: 26.
- "During the first \_\_\_\_ months, the child's refractive error is changing significantly." Answer: 18.
- "Use the approximate Snellen VA equation to calculate the expected Teller acuity results for an 8 month old." Answer: 20/75.
- "CLARE is caused by a gram (\_) bacterial infection." Answer: negative.
- "When measuring the BCR of a GP lens... spokes are not all in focus..." Answer: warpage/warped.

This is good format selection. Do not force every fact into multiple choice. Some facts need production recall.

### 9. It Makes The Rationale Do More Than Confirm

The best rationales have one or more of these jobs:

- teach the mechanism
- distinguish close differentials
- name the trap
- give a clinical pearl
- explain why a tempting option fails
- connect a number to a rule
- encode a memory hook

Examples:

Question:

> A patient taking Losartan presents for her normal 8 a.m. appointment. Her blood pressure is 89/58. She claims her blood pressure always seems to be extremely low in the mornings and eventually works its way up. She confirms taking the medication every night before bed. Which of the following reasons might make you suspicious for glaucoma in her future?

Correct answer: Reduced perfusion causing ONH ischemia.

Rationale substance:

- Nocturnal dips in BP can reduce optic nerve head perfusion.
- This matters especially for normal tension glaucoma style damage.

Question:

> A patient presents with a new-onset nystagmus, characterized by a fast-pulse to the LEFT. Which vestibular apparatus is most likely under duress?

Correct answer: Right.

Rationale substance:

- Loss of tonic firing from the right vestibular apparatus makes the brain perceive left vestibular excitation.
- That creates slow phase right and corrective fast phase left.

Question:

> A child with a history of non-febrile seizures comes into the clinic. Which of the following is contraindicated?

Correct answer: Dilation with cycloplegics.

Rationale substance:

- Cycloplegics can lower seizure threshold and cause CNS side effects.
- Tonometry, motility, and sensory testing do not carry the same systemic risk.

These rationales teach how to think, not only what to choose.

## Course-Specific Observations

### Ocular Disease II: Glaucoma

Strongest patterns:

- visual field interpretation
- glaucoma versus neuro differentiation
- IOP threshold interpretation
- medication side effects
- angle closure subtype classification
- steroid response risk
- normal tension glaucoma vascular reasoning

Specific examples:

1. Undercorrection during visual field testing:

   - Stem asks what happens after accidental 3 D undercorrection.
   - Correct answer: decreased central sensitivity by 3 dB.
   - Quality trait: converts optics error into field interpretation.

2. Normal tension glaucoma medication trap:

   - Stem asks which medication is not indicated.
   - Correct answer: Timolol.
   - Quality trait: rejects a common IOP-lowering shortcut because systemic hypotension matters.

3. Plateau iris subtype:

   - LPI failed, angle occluded to Schwalbe's line, IOP 29 OU.
   - Correct answer: complete plateau iris syndrome.
   - Quality trait: classification based on precise angle and pressure details.

4. Neuro versus glaucoma field:

   - Visual field repeats with symmetric defects.
   - Correct answer: neuro.
   - Quality trait: forces pattern recognition and warns against over-calling glaucoma.

5. Steroid-induced IOP elevation risk:

   - Multi-select asks which uses increase risk.
   - Correct answers include long/intense FML, Durezol QID, and inadequate PredForte dosing that prolongs treatment.
   - Quality trait: tests potency, duration, and undertreatment risk together.

Future agent guidance:

- Prioritize visual field and optic nerve pattern recognition.
- Include "not glaucoma" neuro mimics.
- Build medication questions around contraindications, systemic effects, and real management decisions.
- Keep numeric glaucoma thresholds attached to patient or testing scenarios.

### Ocular Pharmacology

Strongest patterns:

- drug indication and contraindication
- dosing schedules
- age approvals
- preservatives
- side effects
- acute versus chronic treatment selection
- allergy constraints

Specific examples:

1. Topical CAI corneal decompensation:

   - Correct answer: corneal decompensation.
   - Quality trait: explains endothelial deturgescence, not just the adverse effect.

2. Diamox non-IOP uses:

   - Correct answers: macular edema secondary to RP and idiopathic intracranial hypertension.
   - Quality trait: uses mechanism across compartments: aqueous/CSF and retinal fluid movement.

3. Acute angle closure medication trap:

   - Avoid prostaglandin due to onset and avoid Diamox capsule because extended release is poor for acute spikes.
   - Quality trait: distinguishes chronic and acute pressure treatment.

4. Pediatric allergy med approvals:

   - Correct answers include Bepreve, Zerviate, Lastacaft, Pataday.
   - Quality trait: age threshold group knowledge.

5. Oxervate:

   - Dose: 6 times daily for 8 weeks.
   - Indication: neurotrophic keratitis.
   - Quality trait: one question tests exact dosing; another clinical vignette tests when to prescribe it.

6. XDemvy:

   - Demodex blepharitis with collarettes.
   - Course: 6 weeks.
   - Quality trait: connects slit lamp finding to FDA-approved treatment and duration.

Future agent guidance:

- Write pharmacology questions as "which drug for this patient, and why not the others?"
- Include drug class, active ingredient, dosing, side effect, age approval, and contraindication as separate angles.
- Use multi-select for drug families and approvals.
- Include allergy and comorbidity constraints.

### Vision Science III: Motility

Strongest patterns:

- lesion localization
- vestibular pathway reasoning
- saccades and pursuits
- binocular vision perception
- clinical diplopia interpretation
- media-supported head movement/graph/field recognition

Specific examples:

1. New-onset right ptosis, diplopia, down-and-out eye, contralateral tremor, ipsilateral hand coordination issue:

   - Correct answer: Claude's syndrome.
   - Quality trait: combines CN III findings with red nucleus/cerebellar signs.

2. Neutral density filter and swinging pendulum:

   - Correct answer: counterclockwise oval.
   - Quality trait: forces temporal disparity reasoning, crossed/uncrossed disparity, and perceived depth.

3. Fast-pulse nystagmus to the left:

   - Correct answer: right vestibular apparatus under duress.
   - Quality trait: asks learner to infer damaged side from fast/slow phase.

4. Decompensated esophoria case:

   - Gradual worsening distance diplopia, fatigue, comitant ET at distance, full versions, near esophoria.
   - Correct answer: prescribe base-out prism and refer for VT.
   - Quality trait: differentiates decompensation from CN VI palsy or urgent neuro.

5. INO etiology:

   - Correct answer: multiple sclerosis.
   - Quality trait: concise high-yield association.

6. LGN P stream:

   - Correct answers: layers 3, 4, 5, 6.
   - Quality trait: multi-select maps anatomy to pathway.

Future agent guidance:

- Motility questions should often be causal chains.
- Include directionality and laterality.
- Use diagrams/media when the answer depends on spatial orientation.
- Avoid generic "what structure controls X" unless it is a short recall item in a broader module.

### Contact Lenses II

Strongest patterns:

- GP verification and problem solving
- soft lens complications
- multifocal/monovision selection
- pediatric/cosmetic lens management
- lens material tradeoffs
- real clinic follow-up decisions

Specific examples:

1. Soft contact lens air method with ghost/haze around mires:

   - Correct answer: aphakic powers.
   - Quality trait: connects lensometry artifact to lens thickness.

2. Warped GP lens:

   - Stem describes aerial image spokes not focusing together.
   - Correct answer: warpage/warped.
   - Quality trait: tests interpretation of instrument findings, not a definition.

3. CLARE treatment:

   - Correct answers: discontinue lens wear, antibiotic-steroid combo, switch to daily wear.
   - Quality trait: management set, not just diagnosis.

4. Lens adherence:

   - Incorrect management: steepen the peripheral curve.
   - Quality trait: asks for improper management, forcing understanding of suction/tight fit.

5. Corneal vascularization progression:

   - 0.9 mm last year, 0.3 mm more this year.
   - Correct answer: yes, change lens/care regimen.
   - Quality trait: uses documented progression, not arbitrary threshold.

6. Monovision over-refraction:

   - Over-refract distance first.
   - Use loose lenses/free space for fine tuning.
   - Minus over-refraction over near eye reflects plus coming from the lens.
   - Quality trait: practical workflow.

Future agent guidance:

- Contact lens questions should feel like chairside decisions.
- Use instrument artifacts and fitting observations.
- Ask "what would you change?" often.
- Include material/design tradeoffs.
- Preserve process details from lecture or lab.

### Pediatrics

Strongest patterns:

- developmental milestones
- pediatric contraindications
- history-taking priorities
- infant visual acuity calculations
- cycloplegia risk
- amblyopia/strabismus risk
- systemic disease implications

Specific examples:

1. Ocular history priority:

   - Correct answer: lazy eye.
   - Quality trait: focuses on preventable amblyopia and what parents may report.

2. Non-febrile seizure history:

   - Correct answer: avoid dilation with cycloplegics.
   - Quality trait: identifies systemic risk of routine eye care.

3. NEC or "sticky stomach":

   - Correct answer: cyclopentolate 1% is most contraindicated.
   - Quality trait: connects anticholinergic effect to reduced GI motility.

4. Teller acuity at 8 months:

   - Correct answer: 20/75.
   - Quality trait: requires equation use, not answer recognition.

5. Visual cliff experiment limitation:

   - Correct answer: crawling develops later than early stereopsis.
   - Quality trait: tests experimental interpretation, not just milestone recall.

6. Retinoblastoma:

   - Correct answer: most cases before age 5.
   - Quality trait: exact recall tied to pediatric malignancy recognition.

Future agent guidance:

- Ask what is safe for this child, not just what is normal.
- Include developmental age and systemic history.
- Use fill-in-the-blank for milestone numbers.
- Use vignettes for contraindications and risk factors.

## Weaknesses And Failure Modes Found

The human set is strong, but not perfect. Future AI-assisted workflows should improve these areas.

### 1. Missing Rationales

182 of 1,625 questions lacked rationales.

Missing rationale is the easiest AI win. A future agent can draft rationales from:

- correct answer
- distractors
- module title
- source notes when available
- similar high-quality questions in the same module

Agent requirement:

- Add a concise mechanism or differentiator.
- Do not merely restate the answer.
- If unsure, mark for human review instead of inventing.

### 2. Ambiguous Media-Only Stems

Repeated stems like "Analyze the following visual field. What do you suspect?" can be good if the media is attached and visible. They become weak if the image fails, exports poorly, or appears outside context.

Agent requirement:

- Verify media exists.
- Add alt text or a short description if possible.
- Preserve the visual task, but make the question resilient enough for review.

### 3. Duplicate Or Near-Duplicate Stems

Repeated stems included:

- "Analyze the following visual field. What do you suspect?" appeared 10 times.
- "What is the name of this head movement?" appeared 6 times.
- "Observe the following figure. What is the name of this inappropriate saccade?" appeared 6 times.
- "Label the following graph." appeared 4 times.

This is not always bad. In image-based modules, repeated stems may refer to different attachments. But future agents should check whether duplicates are intentional.

Agent requirement:

- If duplicate stem plus different media: keep but consider making the stem more specific.
- If duplicate stem plus same answer/media: flag for merge or rewrite.

### 4. Overly Informal Or Typo-Heavy Stems

Some human voice is useful. Some errors reduce trust.

Examples of issues to clean carefully:

- "you patient reports" should be "your patient reports."
- "what fixation disparity to they have" should be "what fixation disparity do they have."
- "APPROAVED" should be "approved."
- "effectivity" may be better as "effectiveness."
- "Pedatrics" should be "Pediatrics."

Agent requirement:

- Fix typos and grammar.
- Do not remove memory hooks automatically.
- Preserve the learning personality when it helps recall.

### 5. Negative Questions Need Guardrails

There were 98 negative/EXCEPT/NOT style questions. Many were useful, but these can confuse if the negative cue is not obvious.

Agent requirement:

- Make NOT/EXCEPT visually obvious.
- Prefer "Which option is contraindicated?" over "Which is not appropriate?" when possible.
- In rationale, explicitly state why the correct answer is the exception.

### 6. Multi-Select Needs Count Cues

Multi-select is valuable, but ambiguous selection count can frustrate students.

Good:

- "Which TWO..."
- "Which THREE..."
- "Which of the following topical meds are approved for a 2yo?" if all true options are clearly part of a known set.

Risky:

- "Which of the following are true?" without count or strong rationale.

Agent requirement:

- Add count cues when the number of correct answers is pedagogically fair.
- Use "select all that apply" only when the content naturally demands exhaustive recall.

## Why Human Writing Still Matters

Human-written questions capture five things AI does not reliably infer from source text alone.

### 1. Local Exam Culture

Students know which details felt testable. For example:

- exact pediatric age approvals
- professor-favored glaucoma thresholds
- the practical meaning of "wimpy" steroid dosing
- which field patterns classmates confuse with glaucoma
- which contact lens instrument artifacts are likely lab exam targets

### 2. Peer Confusion

Humans write from recent confusion. That is why many questions target traps:

- Timolol in NTG
- prostaglandins in acute angle closure
- Bactrim blocked by sulfa allergy
- cyclopentolate in seizure history or NEC
- CLARE versus CLPU
- neuro field loss versus glaucomatous field loss
- CN VI palsy versus decompensated esophoria

### 3. Memory Hooks

The informal explanations often encode retention:

- "soft" preservatives listed by brand
- "sticky stomach"
- "crusteez"
- "PredForte BID is wimpy"
- "Remember Spaeth? Yeah me neither."

These are not polished, but they are useful.

### 4. Practical Clinical Judgment

Human questions often ask "what would you do in clinic?"

Examples:

- change lens/care regimen after documented vascularization progression
- use loose lenses/free space for monovision fine tuning
- choose clindamycin due to MRSA suspicion plus sulfa allergy
- repeat field and consider neuro imaging when defects are symmetric
- avoid cycloplegics in certain pediatric systemic histories

### 5. Selective Compression

Good student questions compress lecture into high-yield decisions. AI often expands. Humans decide what can be omitted.

## How AI Can Close The Gap

AI should not replace human authorship. It should close the quality gap around consistency, coverage, and review.

### Best AI Roles

1. Rationale completion

   - Draft missing rationales.
   - Improve shallow rationales.
   - Add "why not the distractors" explanations.

2. Distractor improvement

   - Replace random wrong answers with plausible confusions.
   - Keep distractors within the same category.
   - Avoid joke distractors unless they serve memory and do not harm assessment.

3. Applied conversion

   - Convert isolated facts into short clinical decisions.
   - Add age, symptom, medication, allergy, or exam constraints.

4. Duplicate detection

   - Detect exact duplicate stems.
   - Detect same answer, same concept, same module near-duplicates.
   - Distinguish media-based repeated stems from actual duplicates.

5. Format selection

   - Use fill-in-the-blank for exact production.
   - Use matching for paired vocabulary/classes.
   - Use multi-select for sets.
   - Use MCQ for single best answer decisions.

6. Media QA

   - Check that media exists.
   - Suggest alt text.
   - Flag stems that depend entirely on missing images.

7. Style-preserving cleanup

   - Fix typos.
   - Keep useful voice.
   - Remove confusing phrasing.

### Risky AI Roles

AI should be constrained when asked to:

- invent clinical facts from memory
- write medication dosing without source context
- generate board-style vignettes without local notes
- replace professor-specific wording
- sanitize all student voice
- overfit to generic NBEO style and lose course specificity

## Future Agent Rubric

Use this scoring rubric when generating or reviewing questions.

### 5-Point Question Quality Score

Score 5:

- Tests a meaningful decision or exact high-yield recall.
- Has plausible distractors.
- Has a rationale that explains mechanism or differentiates close options.
- Matches module/course context.
- Uses the right format.
- If media-dependent, media is attached and necessary.

Score 4:

- Solid question with minor wording or rationale limitations.
- Distractors mostly plausible.
- Learning target is clear.

Score 3:

- Factually useful but basic.
- Rationale may be thin.
- Distractors may be obvious.
- Could be improved by adding context or a mechanism.

Score 2:

- Ambiguous, too broad, missing key context, or overdependent on missing media.
- Correct answer may be hard to justify from the stem.

Score 1:

- Incorrect, misleading, duplicate without purpose, or impossible to answer.

### Required Review Checks

For every generated or edited question, check:

- Is the learning target obvious?
- Is the correct answer uniquely defensible?
- Are distractors plausible and same-category?
- Does the rationale explain why?
- Is this the best question type?
- Does it preserve local course language where useful?
- Is NOT/EXCEPT obvious if used?
- Are all correct answers mapped correctly?
- If multi-select, is the expected count fair?
- If media-based, is media attached?
- Would a student understand why they missed it?

## Prompt Patterns Future Agents Should Use

### Convert Recall To Applied

Input:

> Fact: Timolol may be undesirable in normal tension glaucoma.

Better generated question:

> A patient with suspected normal tension glaucoma has progressive paracentral field loss despite IOPs in the mid-teens. Which medication would you be most cautious about using if nocturnal hypotension is a concern?

Expected answer:

> Timolol.

Rationale:

> Beta-blockers can worsen systemic hypotension, potentially reducing optic nerve head perfusion in a disease pattern where vascular insufficiency may contribute.

### Add A Clinical Constraint

Input:

> Bactrim treats MRSA preseptal cellulitis.

Better generated question:

> A patient likely has MRSA preseptal cellulitis but reports a sulfa allergy. Which oral antibiotic is the best alternative among the options?

Expected answer:

> Clindamycin.

### Turn A List Into Multi-Select

Input:

> Bepreve, Zerviate, Lastacaft, and Pataday are approved for age 2+.

Better generated question:

> Which topical allergy medications are approved for use in a 2-year-old?

Correct answers:

> Bepreve, Zerviate, Lastacaft, Pataday.

### Use Fill-In-The-Blank For Exact Recall

Input:

> Teller acuity estimate: 600 / age in months.

Better generated question:

> Use the approximate Snellen VA equation to calculate expected Teller acuity for an 8-month-old.

Expected answer:

> 20/75.

### Preserve Human Voice While Cleaning

Original:

> Which of the following would be the MOST contraindicated for infants who have necrotizing enterocolitis, or a sticky stomach?

Good edited version:

> Which medication is most contraindicated for an infant with necrotizing enterocolitis ("sticky stomach")?

Why:

- Keeps the memory hook.
- Improves grammar and precision.

Bad edited version:

> Which cycloplegic medication is contraindicated in patients with gastrointestinal disease?

Why bad:

- Too generic.
- Loses pediatric specificity.
- Loses the local memory hook.

## Concrete Generation Requirements For V4 Trinity

Future agents working inside Question Studio should follow these constraints.

### Generation Should Be Source-Grounded

Every AI-generated question should cite or internally link to:

- source document
- page range or chunk IDs
- destination module
- intended learning target
- reasoning order: first, second, or third order

### Generation Should Match Local Style

Before drafting, retrieve 10 to 30 high-rated human questions from the same module or nearby modules. Use them as style anchors.

Style anchors should include:

- stem length distribution
- common distractor style
- whether the module uses humor or strict wording
- average rationale depth
- common question type
- media usage

### Generation Should Produce A Plan First

Before generating questions, the agent should state:

- topics to cover
- number of questions per topic
- question type mix
- target reasoning level
- source coverage
- duplicate risks

### Generation Should Self-Review

For each candidate, the agent should output hidden or metadata-level review fields:

- learning target
- why this answer is correct
- why each distractor is plausible but wrong
- source support
- possible ambiguity
- duplicate similarity score
- suggested tags

### Generation Should Prefer Human-Like Defects Only When Useful

Do not intentionally add typos. Do not intentionally make questions messy. But preserve:

- memorable phrasing
- local shorthand
- professor/course-specific wording
- useful peer explanations

### Generation Should Flag Human Review Needs

Always flag for human review when a question includes:

- drug dosing
- pediatric contraindication
- surgical management
- urgent referral versus routine management
- image interpretation without accessible alt text
- uncertain source support
- conflicting source notes

## Recommended Product Features

### 1. Question Quality Sidebar

For each question, show:

- rationale present/missing
- media present/required
- duplicate risk
- answer mapping valid
- distractor count
- multi-select count cue
- stem length warning
- negative wording warning

### 2. Human Style Anchors

Let curators choose:

- "match Brayden-style clinical reasoning"
- "match Justin-style explanatory rationales"
- "match Collin-style contact lens workflow"
- "make this stricter board style"
- "make this more peer-study style"

This should not impersonate authors. It should encode observable question-writing patterns.

### 3. Rationale Upgrade Button

One-click AI action:

- preserve existing stem/options/answer
- add or improve rationale
- explain tempting distractors
- keep local voice

### 4. Applied Variant Button

One-click AI action:

- take a recall question
- generate 2 to 3 clinical/applied variants
- keep same learning target
- require human approval before replacing

### 5. Duplicate Cluster Review

Group questions by:

- exact stem
- normalized stem
- same answer in same module
- same image and same answer
- same concept by embedding

Then let humans mark:

- intentional repetition
- needs rewrite
- merge/delete
- keep as separate media item

### 6. Media-First Question Mode

For modules with images:

- require alt text
- require image-specific answer explanation
- prevent generation that ignores the image
- allow repeated stems only if media differs

## Suggested Agent Workflow

1. Identify scope.

   - school, cohort, semester, class, module
   - human versus AI-generated
   - source documents and attachments

2. Pull representative human examples.

   - across authors
   - across modules
   - across question types
   - include high-flag and low-flag examples

3. Build a local style profile.

   - median stem length
   - rationale rate
   - media rate
   - type mix
   - clinical/application rate
   - common traps

4. Draft or revise questions.

   - use source notes
   - match module style
   - preserve local learning hooks
   - keep distractors plausible

5. Self-review.

   - validate correct answer mapping
   - check ambiguity
   - check duplicate risk
   - check rationale quality

6. Hand off to human.

   - show what changed
   - show confidence
   - show source basis
   - show review warnings

## Bottom Line

The Spring 2026 NSUOCO Class of 2028 question set shows why LearnTerms should keep human question writing central.

The best questions are valuable because they are human-shaped:

- they know what classmates confuse
- they encode professor emphasis
- they include practical clinic judgment
- they use memory hooks
- they preserve local language
- they explain the "why" in a way that feels like peer teaching

AI should close the gap by making this human work more consistent, complete, and scalable. The best V4 Trinity direction is not "AI writes the questions." It is:

> Humans provide judgment, local context, and taste. AI provides coverage, cleanup, rationale support, duplicate detection, and applied variants.

That is the model most likely to produce questions that students actually trust and learn from.
