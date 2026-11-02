# Human exemplars for Question Studio prompts

Date: 2026-10-28. Purpose: find the best curator-written questions in production, explain why they work, and turn that into compact prompt and reviewer language for the Claude drafting path (Haiku/Sonnet/Opus 5.5). No paid model calls were made. Raw dumps and the machine-readable exemplar set live in `tmp/human-exemplars/` (gitignored; `exemplars.json` there).

Prior work this builds on: `dev/question-template-system/survey/prod-human-question-survey.md` (format taxonomy), `dev/archive/v4trinity/NSUOCO_SPRING_2026_HUMAN_QUESTION_FINDINGS.md` (traits of strong human questions), `dev/question-template-system/guidance/quality-rubric.md`, and the AI failure modes in `dev/benchmarks/question-studio/2026-09-21-sol-terra/quality-notes.md` and `README.md`.

## Selection

- **Deployment:** production, read-only (`bunx convex data question --prod`, newest 20k and oldest 20k merged). That gave 32,072 unique rows, which matches the summed module `questionCount` (32,073), so this is effectively the whole table. Modules, classes and `userModuleStats` were dumped the same way.
- **Human-written:** no `metadata.generation` and `aiGenerated === false`, which leaves 4,679 rows. I excluded 1,299 legacy rows that have `aiGenerated: true` and no generation metadata. No live rows had `deletedAt`.
- **Provenance screen:** I dropped two classes whose questions were created in bulk bursts and read as machine-polished: Clinical Immunology and Microbiology (344 rows created on 2026-10-14, up to 32 per minute, no student activity yet) and Low Vision (108 rows over two days, up to 33 per minute). Systemic Disease is a faculty question set imported in bulk. Its stems and options are faculty-written, but some rationales were revised in Oct 2026. I kept it and marked the one exemplar from it. The remaining classes were authored one by one (at most 9 per minute) by students and faculty between Sep 2025 and May 2026. That leaves 3,151 rows.
- **Candidate filter:** published `multiple_choice` with 4–6 options, a stem of at least 50 characters, a rationale of 180–1,600 characters, and no image-dependent wording ("following picture/figure", "shown here"). That leaves 1,391 rows. I ranked them by how many distractors the rationale addresses, with a bonus for vignettes, then read about 150 in full across 11 classes.
- **Usage:** distinct students with interactions per module (`userModuleStats`). All the kept exemplars come from modules with 14–27 active students. `flagCount` counts student flags, not curator quality, so I didn't use it.
- **Kept:** 13 exemplars: 5 Learn, 4 Clinical and 4 Critical thinking. They come from 7 classes and 5 authors.

Bank context (trusted classes, multiple choice, n=2,562):

| Measure | Value |
| --- | --- |
| Median stem length | 15 words (IQR 11–26) |
| Median rationale length | 36 words (IQR 21–59) |
| Questions with no rationale | 290 (9%) |
| Option counts | 4 options: 911; 5: 700; 6: 394; 7–8: 275; 2: 78 |
| Multi-select | 732 |
| Negative stems (NOT/EXCEPT/LEAST) | 73 |

The current Studio Learn output has a median of 13 stem words and 62 rationale words (41 `question-types-v26` rows).

## Exemplars

Text is plain and trimmed. `*` marks the key. Word counts are for the rationale.

### Learn

**L1. `jx7cmhah6gje02p7n6702g6kv5827sa6`** (prod, General Pharmacology / Practice Quiz CH 4 and 7). Mechanism recall.
Stem: Stimulation of what receptor(s) in the eye is MOST likely to lower IOP by decreasing aqueous production?
Options: alpha-2* · beta-1 and 2 · beta-2 · beta-1 · alpha-1
Rationale (38 words): Stimulation of alpha-2 receptors leads to DECREASED aqueous production (ex: brimonidine). Alpha-1 leads to radial iris muscle contraction. Beta-1 and 2 lead to INCREASED aqueous production (ex: use beta-blocker like timolol to treat).
Why it works:
- The stem is 17 words, a complete question you can answer without seeing the options.
- Every option is an adrenergic receptor subtype, so the student has to know the direction of each effect.
- The rationale gives every distractor its own one-clause effect and ties each to a drug the student already knows.

**L2. `jx782s92wmdhsmq2t4wej6hmah7q24e5`** (prod, Ocular Disease I / Lids & Lashes). Test purpose.
Stem: Which test would effectively differentiate a ptosis from a pseudoptosis?
Options: MRD-1 · Palpebral fissure · MRD-2 · Levator function*
Rationale (49 words): Levator (and Müller) function testing is the most important test for differentiating ptosis from pseudoptosis. MRD-1 and palpebral fissure measurements only determine severity and cannot determine the cause or separate the two.
Why it works:
- Every option is a real lid measurement with the same anatomic target. This is the "comparable purpose" rule the Studio prompt states with a long brain-imaging example.
- The distractors are the measurements students actually confuse with levator function.
- The rationale says what the distractors *do* measure, which is the transferable rule.

**L3. `jx7956r8apxcbt01vrz1wsr5jd82d1qp`** (prod, Ocular Disease II: Glaucoma / Chapter 7). Near-miss within a drug class.
Stem: Which of the following medications would NOT be indicated in cases of normal tension glaucoma?
Options: Brimonidine · Timolol* · Rhopressa · Dorzolamide · Betaxolol
Rationale (74 words): Timolol lowers IOP well but induces systemic hypotension, which is a bad idea in NTG, where damage likely comes from vascular insufficiency at the ONH. "Betaxolol is a beta-blocker, too?" Yes, but it, along with dorzolamide and Rhopressa, has been shown to increase ONH perfusion.
Why it works:
- Timolol and betaxolol share a class, so class-level recall fails. The student needs the perfusion mechanism.
- Every option lowers IOP, so "lowers IOP" never settles it.
- The rationale names the trap and resolves it.
- The negative stem is capitalized and has exactly one exception.

**L4. `jx7e0vrfrqepk514k268zh12pn80xch2`** (prod, Glaucoma / Chapter 7). Threshold tied to a use.
Stem: Regarding central corneal thickness, which of the following measurements should flag your glaucoma suspicion?
Options: 480 µm* · 620 µm · 580 µm · 530 µm · 560 µm
Rationale (92 words, trimmed): Low CCT is a significant POAG risk factor, largely because thin corneas underestimate IOP. A thin cornea at 20 mmHg is more concerning than a thick cornea at 24 mmHg. Normal CCT is around 530 µm; OHTS used about 555 µm as higher risk, though that may be a touch high.
Why it works:
- The number is attached to a clinical decision, not asked bare.
- The rationale teaches why the number matters and gives a worked contrast.
- It flags uncertainty in the threshold instead of overstating it.
- Caution: only one option sits below normal, so this item is easier than it looks. The structure is the lesson, not the option set.

**L5. `jx70z7wgy7fq7c74rmfswd281x820xss`** (prod, Pediatrics / History). Safety relationship.
Stem: A child with a history of non-febrile seizures comes into the clinic. Which of the following is contraindicated?
Options: Measurement of intraocular pressure · Assessment of extraocular motility · Dilation with cycloplegics* · Stereopsis testing with polarized glasses
Rationale (70 words): Cycloplegics such as cyclopentolate lower the seizure threshold and can trigger CNS effects in susceptible children; use them with extreme caution or avoid them with a seizure history. Tonometry, motility and sensory testing carry no comparable risk.
Why it works:
- There is one patient constraint and nothing else. It is a Learn item, not a decorative vignette.
- The options are parallel routine pediatric procedures of similar length.
- The rationale gives the mechanism, the practical action and why the others are safe.

### Clinical

**C1. `jx7d8kqgpmm1reka570dxpxjxn7qh759`** (prod, Ocular Disease I / Conjunctiva, Episclera, Sclera). Diagnosis from findings.
Stem: A 43-year-old man presents with a red eye only along the temporal bulbar conjunctiva for 3 days, with no discharge and mild 3/10 discomfort. What is your diagnosis?
Options: Allergic conjunctivitis · Viral conjunctivitis · Episcleritis* · Scleritis · Uveitis
Rationale (40 words): Episcleritis produces no discharge. Lack of discharge rules out viral and allergic conjunctivitis. Mild pain and lighter red vessels rule out scleritis, and the lack of diffuse redness rules out uveitis.
Why it works:
- The diagnosis is withheld, and every stem detail is a discriminator: sectoral location, no discharge, mild pain, short course.
- The options are the red-eye differential a clinician actually runs.
- The rationale is an elimination map: each distractor is excluded by a named stem finding. It is short and complete.

**C2. `jx73m9w40117zht6rafxn2y1vn814qhz`** (prod, Contact Lenses II / GP Lens Problem Solving).
Stem: A GP contact lens patient comes in for a "red eye" exam, reports more lens awareness for 2 weeks and a new small white bump at 9:00. What is most likely the cause?
Options: VLK* · GPC · Pinguecula · Phlyctenule
Rationale (47 words): VLK presents as a white, elevated nodule at 3 or 9 o'clock in rigid lens wearers. GPC affects the tarsal conjunctiva, pingueculae are chronic and not lens-related, and phlyctenules reflect hypersensitivity rather than mechanical lens friction.
Why it works:
- Lens type, clock position and onset are each necessary. Change one and the answer moves.
- Every option is a white or elevated ocular-surface lesion.
- The rationale separates each distractor by location or mechanism.

**C3. `jx781z3v5xa2sm0xp975bz8ap981qwa0`** (prod, Glaucoma / Chapter 8). Contraindication from a comorbidity.
Stem: You diagnose your 65-year-old female patient with mild POAG. Her ocular history includes long-standing Fuchs endothelial dystrophy. Which of the following medications should you avoid?
Options: Cholinergic agonists · Rho-kinase inhibitors · Carbonic anhydrase inhibitors* · Alpha-agonists · Beta-blockers · Prostaglandin analogues
Rationale (77 words, trimmed): Topical CAIs act on CA-II, the main isoform in the ciliary body, but CA-II is also central to the corneal endothelial pump that maintains deturgescence. In a compromised cornea such as Fuchs, CAIs can cause decompensation and significant edema.
Why it works:
- The patient detail decides the answer. Without Fuchs, every class is acceptable.
- The rationale teaches a mechanism that transfers to any compromised endothelium.

**C4. `jx7ea09ccsz70yzpn7k5w8x4h98gtp1z`** (prod, Systemic Disease / Test 2; faculty-written stem, rationale revised Oct 2026).
Stem: A 10-year-old boy presents for a general eye exam with no complaints. You find bilateral anterior uveitis with small keratic precipitates, mild endothelial dusting, no hypopyon and one small posterior synechia. Which is the most common systemic cause?
Options: Reactive arthritis · Juvenile idiopathic arthritis* · Ankylosing spondylitis · Behçet's
Rationale (59 words): JIA is the leading systemic association of childhood anterior uveitis and may be asymptomatic, bilateral and nongranulomatous. AS more often causes acute unilateral alternating uveitis; reactive arthritis more often causes conjunctivitis; Behçet classically has a transient mobile hypopyon. Being male does not exclude JIA.
Why it works:
- Age and the asymptomatic presentation point to the answer. Pertinent negatives (no hypopyon) exclude Behçet.
- Every distractor is a classic uveitis association with a signature absent from the stem.
- The rationale defuses the one misleading stem detail (sex).

### Critical thinking

**T1. `jx77c83q3bxdb6vwfgsctywk5d8225sa`** (prod, Ocular Pharmacology / Antibiotics). Infer the diagnosis, then apply a constraint.
Stem (trimmed from 106 words): A 44-year-old female hospital nurse has a swollen, red left eye that has slowly worsened over a couple of days after long shifts. No fever, no pain with eye movements, pupils equal and reactive. Allergies: sulfa drugs, codeine. Which would be most effective?
Options: Augmentin · Keflex · Bactrim DS · Vancomycin · Clindamycin*
Rationale (52 words): This is likely MRSA preseptal cellulitis, so Keflex and Augmentin will be ineffective. Bactrim DS would be next, but the sulfa allergy rules it out, so choose clindamycin. Vancomycin is unnecessary because this is not orbital cellulitis.
Why it works:
- There are two linked steps: the healthcare exposure and the pertinent negatives point to MRSA preseptal (not orbital) cellulitis, then the allergy eliminates the usual oral choice.
- Each distractor fails at a different step. The closest one (Bactrim) is correct until the constraint applies.
- The rationale follows the decision in order.

**T2. `jx761p1pw8smkqxakn5pxxfmyd8ef8wv`** (prod, Systemic Disease / Test 1; faculty-written stem). Timeline decides between two parallel causes.
Stem (trimmed): A 40-year-old man with GERD has taken PPIs for several years and recently had bariatric surgery. He reports slowly progressive, painless vision loss in both eyes over the last year: 20/40 OU, mild color loss, subtle central field defects, mild temporal pallor. Most likely explanation?
Options: Toxic/nutritional optic neuropathy from chronic PPI use* · Toxic/nutritional optic neuropathy from recent bariatric surgery · Hereditary optic neuropathy · Nonorganic vision loss
Rationale (85 words, trimmed): Chronic PPI use causes B12 deficiency, which can cause nutritional optic neuropathy. Symmetric, painless loss with dyschromatopsia, central defects and temporal pallor fits. The loss began a year ago, before the recent surgery, while PPI use spans years. Hereditary and nonorganic causes are on the differential but the history points to a nutritional cause.
Why it works:
- The first relationship (the presentation fits nutritional optic neuropathy) narrows to two options. The second (timing) separates them.
- The two closest options are grammatically identical except for the cause, so length and wording give nothing away.

**T3. `jx7awrpcx8mz3y3hzp294nax6980cyxd`** (prod, Pediatrics / Human and Visual Development). Integrate findings with an explicit exclusion.
Stem (trimmed): An 11-year-old girl, born at term, has normal IOP and mild inferior field restriction. Large cups in normally sized discs OU. Acuity is reduced beyond what crowding explains; poor spatial ability; abnormal motility. Primary congenital glaucoma has been ruled out. Most consistent with?
Options: Optic nerve hypoplasia · Periventricular leukomalacia* · Retinopathy of prematurity · Juvenile open-angle glaucoma
Rationale (70 words, trimmed): PVL is hypoxic-ischemic periventricular white-matter injury that can produce cupping with normal IOP, field defects, acuity loss beyond crowding, poor spatial processing and abnormal motility. Discs are normally sized and cupping reflects trans-synaptic degeneration rather than pressure.
Why it works:
- No single finding settles it. Cupping alone suggests glaucoma, and neurologic signs alone don't localize.
- The stem states the exclusion (PCG ruled out) that keeps the key unique. Disc size separates ONH.
- The rationale contrasts mechanisms, not just labels.
- Caveat: "born at term" makes PVL less typical. A reviewer should confirm that it matches the lecture.

**T4. `jx70hnddhg6qmmk2x8w637922d80ztkr`** (prod, Glaucoma / Chapter 7). Connect a drug timing pattern to a disease mechanism.
Stem: A patient taking losartan nightly has a BP of 89/58 at her 8 a.m. appointment and says her BP is always lowest in the morning. Which reason might make you suspicious for glaucoma in her future?
Options: Reduced aqueous production masking glaucomatous IOP · More severe diurnal fluctuations · Elevated episcleral venous pressure · Reduced perfusion causing ONH ischemia* · ICP gradient pushing the lamina anteriorly
Rationale (41 words): Nocturnal BP dips, typically from an antihypertensive taken at night, reduce perfusion to the ONH during sleep, exposing it to vascular-insufficiency damage (relevant to NTG).
Why it works:
- Every option is a real glaucoma mechanism, so the category gives nothing away.
- The student must chain the dosing time, nocturnal hypotension, perfusion and ONH damage.
- Weakness: the rationale doesn't address the closest distractor (diurnal fluctuation). Adding one clause would make it complete.

## Cross-cutting patterns

The strong items share a shape: **the stem holds the discriminating facts, the options share one category, and the rationale is a mechanism plus an elimination map.** None of them is long. Exemplar stems run 10–18 words for Learn and 35–106 for vignettes. Rationales run 38–92 words (median 59), with one clause per distractor.

### Rubric

| # | Criterion (checkable) | Learn | Clinical | Critical thinking | AI failure it blocks |
| --- | --- | --- | --- | --- | --- |
| 1 | **Cover test:** with options hidden, the stem is a complete question with one answer. | ✔ | ✔ | ✔ | Tautological stems; "which is listed/emphasized" |
| 2 | **Necessary detail:** removing or changing at least one stem detail changes the key. Delete details that do neither. | none should be needed | ✔ | ✔ (≥2 details) | Decorative vignettes |
| 3 | **Withhold the label:** the stem gives findings or context, never the diagnosis or class the student must infer. | n/a | ✔ | ✔ | Recall disguised as a case |
| 4 | **Pertinent negatives:** when a distractor would be right under a common variant, the stem states the finding that excludes it (no fever, normal pupils, condition X ruled out). | qualifier words | ✔ | ✔ | Emergency-label ambiguity (GCA vs angle closure) |
| 5 | **Homogeneous options:** one category, same purpose and anatomic target, parallel grammar, similar length. | ✔ | ✔ | ✔ | Mixed test modalities; unrelated distractors |
| 6 | **Near-miss:** at least one distractor would be correct if one fact changed (same class, different subtype; right drug blocked by a constraint; right test, wrong purpose). | ✔ | ✔ | ✔ (resolved by the second relationship) | Throwaway or "gradual bilateral loss" distractors |
| 7 | **Each wrong option is excludable** by a stem finding or a supported relationship, never by "not stated". | ✔ | ✔ | ✔ | Justifying distractors by source absence |
| 8 | **Rationale = rule + elimination:** state the mechanism or rule, then one clause per wrong option, most words on the closest one. About 40–90 words. | ✔ | ✔ | ✔ | Answer restatement; padding with unsupported claims |
| 9 | **No conceded alternatives:** the rationale never says another option is also acceptable. If it would, fix the stem or the option. | ✔ | ✔ | ✔ | Non-unique keys |
| 10 | **Numbers have a use and units;** numeric options don't overlap or nest. | ✔ | ✔ | ✔ | Overlapping thresholds |
| 11 | **Two relationships required:** the first narrows the options, the second separates the finalists. The diagnosis alone doesn't settle the answer. | n/a | n/a | ✔ | Disguised recall labeled Critical thinking |
| 12 | **Plain clinical register:** standalone, no source framing, no jokes or asides, no option letters. | ✔ | ✔ | ✔ | "The lecture states…", meta-commentary |

### Weak human patterns not to copy

These are by ID only; I don't quote the content.

- **Concedes another key.** `jx70r9b7s5wxe2d8ws2ws1ba4185zz1m`: the rationale says ordering imaging would also earn credit. `jx73jktvzf8cz0ejjq00pyr4qn81qf2t`: the rationale says only one option is wrong. Both fail criterion 9.
- **Overlapping or nested ranges.** `jx7208z4kbmatr4755b3app1wx83ts99` offers 1–2, 2–8 and 6–8 weeks, and its rationale cites a conflicting 10–14-day figure.
- **Joke or invented distractor.** `jx7ee374vza5ys8ebcet74tv098eh13y` uses a made-up cell class, and the rationale mocks students who pick it.
- **Hidden context.** `jx75drmyh4axajxjka3yr2dv1h7q5jdc`: the rationale excludes options using lesion features that aren't in the stem. Many "following picture" items depend on media. Studio cannot see figures, so it must never imply them.
- **Restating rationale.** `jx7c8380bvy6z385pz6fvmxsnd8efzwy` repeats the stem findings as "characteristic of" the answer and addresses no distractor.
- **Letters baked into options.** `jx791aczrxgrbaepxxxcwv2jd18f72dm` has "B." and "C." prefixes, which break when options are shuffled.
- **Answer-only items.** 9% of trusted-class items have no rationale.
- **Local voice.** Professor-specific references, personal anecdotes and humor help peers but shouldn't be generated. Studio has no authority to speak in a classmate's voice.

## Proposed prompt changes (`src/convex/questionStudio/quality.ts`, `questionTypes.ts`)

### Redundant or counterproductive text in the current prompts

1. **Distractor rules are stated three times.** They appear in `ACCURACY_CONTRACT` ("Require four parallel… throwaway options… answer-length cues"), in `draftSystem` ("Build four thoughtful, parallel alternatives…") and again in `draftSystem` ("Before returning… Keep distractors plausible… conspicuously longer correct option"). Merge them into one block (below).
2. **Rationale rules are stated twice.** `ACCURACY_CONTRACT` has "Write the rationale as a standalone teaching explanation…" and `draftSystem` has "Write a substantive teaching rationale…". Keep one.
3. **Source-framing bans are stated three times.** "NEVER describe what a source says", "Do not write phrases such as 'in the provided material'…" and "Ask about the medical or scientific concept itself, never which item is explicitly described, listed…". One sentence covers all three.
4. **"Never make an option wrong merely because it was not labeled that way"** repeats `ACCURACY_CONTRACT`.
5. **"usually 65–110 words in 3–5 sentences"** is counterproductive. Exemplar rationales are 38–92 words (median 59), and the benchmark notes trace several unsupported claims to padding. Replace it with "about 40–90 words; one clause per wrong option".
6. **"End with a useful takeaway when supported"** is counterproductive. No exemplar does this, and generated takeaways tend to be generic. Drop it.
7. **Two topic-specific examples are overfit.** "Do not ask which condition is an emergency…" and "a brain study requires plausible brain studies…" were added after one cardiovascular lecture (the benchmark notes call them an adaptive regression check). Replace them with the general rules 4 and 5 above, which cover both cases and other subjects.
8. **The tautology example ("which artery condition involves that same named artery") is subject-specific.** Criteria 1 and 3 cover it generically.
9. **The Learn review addendum (line ~501) repeats `reviewSystem` and the contract.** "Length alone is not quality" and "Never approve unsupported or ambiguous answers" are already covered. Keep only its operational instructions (replacement handling, `localCheckFailures`).
10. **Capitalized NEVER/MUST and stacked negatives.** Claude models follow plain imperatives with a reason. Shouting doesn't help, and repeated negative lists can prime the very patterns they forbid.

### Draft block, replacing the distractor, rationale and high-yield sentences in `draftSystem` and `ACCURACY_CONTRACT`

```text
Stem: a complete question answerable with the options hidden. Learn stems are one or two sentences with no vignette. In Clinical and Critical-thinking stems, give findings and context, not the diagnosis or class the learner must infer; every detail must either change the answer or rule out an alternative. When a distractor would be correct under a common variant, state the pertinent negative that excludes it, or replace the distractor.
Options: four mutually exclusive options from one category with the same purpose and target (all drugs of one indication, all tests of one structure, all diagnoses in one differential), parallel in grammar and length. Make at least one a near miss that would be right if one fact changed: same class but different subtype, right drug blocked by a stated constraint, or right test for a different purpose. Each wrong option must be excludable by a stated finding or a supported relationship. Numeric options get units and must not overlap.
Rationale (about 40–90 words): state the rule or mechanism that makes the answer correct, apply it to the stem, then give each wrong option one clause on why it fails, with the most words on the closest one. Never concede that another option is acceptable; fix the stem instead. Plain clinical register. No source framing, asides or option letters.
Prefer distinctions, mechanisms, contraindications, test purposes and thresholds tied to a decision over isolated lists, labels or percentages.
```

That is about 230 words, against about 420 for the sentences it replaces.

### Per-type contract additions (`questionTypes.ts`)

- **Learn** (append): "Ask what something does, why it happens, or how two near neighbors differ. Attach any number to its clinical use."
- **Clinical** (append): "The scenario must contain the discriminating findings, including pertinent negatives; removing the key finding must change the answer."
- **Critical thinking** (replace the second and third sentences): "Use one relationship to narrow the options and a second to separate the finalists, for example: infer the diagnosis, then apply a patient constraint; or choose between two parallel causes using timing or a measurement. The diagnosis alone must not settle the answer."

### Reviewer additions (`reviewSystem`)

```text
For each wrong option, name the stem finding or supported relationship that excludes it; if none exists, the item is ambiguous. Reject if the rationale concedes another option, or if a competent clinician could defend a different option given a common presentation the stem does not rule out. For Clinical and Critical thinking, name the stem detail whose removal would change the key; if none, typeMatches=false. Fail options that differ in category, purpose or target, or that any learner could eliminate without the concept. Fail rationales that restate the stem, skip the closest distractor, or add claims beyond the evidence to reach a length.
```

This replaces the current reviewer sentence "Check every rationale claim… distractor plausibility" and the overlapping-range sentence, since `ACCURACY_CONTRACT` keeps the overlap rule. It is about 100 words.

### Few-shot exemplars: use them sparingly, and in the reviewer first

- **Risk:** full exemplars in the drafting prompt leak topics, facts and phrasings across subjects. Every strong item here is ocular or clinical pharmacology, while Studio also runs on pharmacy, immunology and molecular biology sources. Models also tend to copy surface features such as option count, vignette openings and drug names.
- **Recommendation:** go rubric-first. Add 2–3 compressed, structure-annotated exemplars to the cached system prefix, labeled as structure only. They should cost under about 250 tokens total, since the prefix is cached. Put them in the **reviewer** prompt first, where they calibrate judgment without seeding content. Add them to the drafter only if a later eval shows drafts still miss the elimination-map rationale.
- **Suggested set** (topic-general structures):
  - Learn: L1 (receptor → effect; one clause per receptor).
  - Clinical: C1 (findings-only stem; elimination by named finding).
  - Critical thinking: T2 (two parallel causes separated by timing).

Format proposal:

```text
Structure examples (never reuse their topics, facts, or wording):
Learn — Q: Stimulating which receptor lowers IOP by reducing aqueous production? Options: alpha-2 | alpha-1 | beta-1 | beta-1 and 2. Rationale: alpha-2 agonists reduce production; alpha-1 contracts the iris dilator; beta stimulation increases production.
Clinical — Stem gives location, discharge, pain level, duration; no diagnosis. Rationale rules out each option by one named finding.
Critical thinking — Two options identical except the cause; the history's timing selects one. Rationale states the causal chain, then the timing argument against the closer option.
```

## Top recommendations

1. Replace the three duplicated distractor blocks with one block that requires one category, the same purpose and target, a near miss, and options excludable by a stated finding.
2. Require pertinent negatives in Clinical and Critical-thinking stems whenever a distractor could be right under a common variant. This is the general fix for the emergency-label failure.
3. Change the rationale target to "rule plus one clause per wrong option, most words on the closest, about 40–90 words", and drop the 65–110 word floor and the takeaway sentence.
4. Rewrite the Critical-thinking contract as "narrow with one relationship, separate the finalists with a second", with the two concrete shapes.
5. Add reviewer checks: name the excluding fact for each wrong option, name the necessary stem detail, and reject conceded alternatives. Add few-shot exemplars to the reviewer before the drafter.
