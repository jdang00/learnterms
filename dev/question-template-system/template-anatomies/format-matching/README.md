# Format Matching

Template label: `format.matching`

## Purpose

Several prompts map cleanly to answers in the same family.

## Reasoning Order Fit

- Format does not determine order.
- Use `first` for direct associations, `second` for classification or sequencing, and `third` only if the matching depends on case integration.

## Do Not Use When

The pairings are unrelated trivia.

## Common Stem Patterns

- Match each [prompt family] with its [answer family].
- Classify each prompt as [category A] or [category B].

## Anatomy Of This Template

- Stem defines the mapping task.
- Prompts are homogeneous.
- Answers are homogeneous.
- Rationale explains the organizing principle.

## Considerations

- Use 3-7 prompts for most generated questions.
- Reused answers are fine if classification is the goal.
- Keep prompt and answer labels clean.

## Production Examples

Each example keeps only the content and semantics needed to understand the template. Source wording is preserved where useful, but new generated questions should use clean wording.

### Example 1: Binocular Vision, Part 2

#### Question Content

- Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2
- Format: matching
- Stem: Classify each prompt with whether or not it is characteristic of harmonious or unharmonious correspondence.
- Correct pairings:
  - prompt:Angle S is 0 -> answer:Harmonious
  - prompt:Angle S is smaller than Angle H -> answer:Unharmonious
  - prompt:Angle H does not equal Angle A -> answer:Unharmonious
  - prompt:Angle A - Angle H = 0 -> answer:Harmonious
- Rationale: In harmonious AC, the angle of anomaly (A) is equal to the objective angle of strabismus (H). This means the subjective angle (S) is 0 since the eccentric retinal point is perceived as "straight ahead.". In unharmonious AC, the subjective angle S is smaller than the objective angle (H), meaning there is a discrepancy between Angle A and Angle H. If H and A don't agree, you have unharmonious AC.

#### Why This Is Good

- Learning target: format.matching in OPT5215 Binocular Vision, Part 2.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Angle S is 0 -> answer:Harmonious; prompt:Angle S is smaller than Angle H -> answer:Unharmonious; prompt:Angle H does not equal Angle A -> answer:Unharmonious; prompt:Angle A - Angle H = 0 -> answer:Harmonious
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 2: Binocular Vision, Part 2

#### Question Content

- Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2
- Format: matching
- Stem: Match the following types of refractive amblyopia with their correct association.
- Correct pairings:
  - prompt:Isometropic amblyopia -> answer:Significant refractive errors in both eyes
  - prompt:Anisometropic amblyopia -> answer:Significant unequal refractive error between two eyes
  - prompt:Meridional Amblyopia -> answer:Pronounced astigmatic refractive error
- Rationale: Refractive amblyopia usually has a better prognosis than pattern deprivation. Isometropic has significant refractive errors in BOTH eyes, so neither eye receives a well focused image. The amblyopia is bilateral, but the cortical processes can either balance or treatment options are plenty so the prognosis is good. Anisometropic amblyopia revolves around unequal refractive error. In clinic it's often just referred to as "refractive amblyopia". Say you have this completely random, arbitrary, totally not real and definitely not HPI RX of OD: -0.25 -0.25 x076 and OS: +4.25 -1.50 x167. An RX likely would lead to this (more common in hyperopia as it was in this case). The brain will take the path of least resistance. The prognosis in these cases are often salvageable, as one eye still probably has excellent acuity after correction. Meridional amblyopia is another form of optical defocus and is caused by very high astigmatic refractive error.

#### Why This Is Good

- Learning target: format.matching in OPT5215 Binocular Vision, Part 2.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Isometropic amblyopia -> answer:Significant refractive errors in both eyes; prompt:Anisometropic amblyopia -> answer:Significant unequal refractive error between two eyes; prompt:Meridional Amblyopia -> answer:Pronounced astigmatic refractive error
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 3: Binocular Vision, Part 2

#### Question Content

- Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2
- Format: matching
- Stem: Match the timeline in which the development of stereo perception in an infant might happen.
- Correct pairings:
  - prompt:Simultanous preception -> answer:1-3 months
  - prompt:Aversion to rivalry -> answer:3 months
  - prompt:Stereopsis develops suddenly -> answer:3-5 months
- Rationale: Regarding the development of binocular vision and stereo perception in infants: Between 3-6 months, the ocular system lines up and the motor fusion prevents disparity between the eyes. Before this, the alignment is often unstable. Before 3 months, infants prefer adducting. Pursuits equalize both ways between 3-5 months. Considering this, it makes sense that the development of stereopsis happens around 3-5 months. It first begins with making sure they can see two images on the retina. If the images are different, the won't be able to stand it around age 3 leading to rivalry or suppression. This indicates that they have at least flat fusion. Stereopsis goes from 45 min of arc to 1 min of arc in a few weeks around 35 months. It develops even faster than VAs.

#### Why This Is Good

- Learning target: format.matching in OPT5215 Binocular Vision, Part 2.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Simultanous preception -> answer:1-3 months; prompt:Aversion to rivalry -> answer:3 months; prompt:Stereopsis develops suddenly -> answer:3-5 months
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 4: Ocular Health

#### Question Content

- Context: OPT5233 Pediatrics / Ocular Health
- Format: matching
- Stem: Identify the correct anterior segment camera with the correct number for kids.
- Correct pairings:
  - prompt:1 -> answer:Volk Pictor Prestige
  - prompt:2 -> answer:Welch Allyn IEXAMINER PRO
  - prompt:3 -> answer:Opthalmika Instruments QuikVue
- Rationale: Don't be afraid to take pictures! These options give you some ability to take fundus photos for progression and observation in kiddos. The Pictor Prestige is an all in one handheld fundus camerea. It's a little fiddly, but can get some high quality results. Welch Allyn IEXAMINER PRO and similar options like the Vista View and D-Eye use your smartphone to take fundus photos with the help of a special lens or the PanOptic. The QuickVue is an anterior segment camera that attaches to your phone. There is a flexible air cushion for easy clip on and has lights and a battery to help you take pictures.
- Media cue: image, alt: Fundus.webp

#### Why This Is Good

- Learning target: format.matching in OPT5233 Ocular Health.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:1 -> answer:Volk Pictor Prestige; prompt:2 -> answer:Welch Allyn IEXAMINER PRO; prompt:3 -> answer:Opthalmika Instruments QuikVue
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 5: Chapter 5-6

#### Question Content

- Context: OPT6023 Ocular Disease II: Glaucoma / Chapter 5-6
- Format: matching
- Stem: Label the following portions of the optic nerve in its pre-chiasmal portion.
- Correct pairings:
  - prompt:1 -> answer:Superior Nasal
  - prompt:2 -> answer:Superior Temporal
  - prompt:3 -> answer:Papillomacular Bundle
  - prompt:4 -> answer:Inferior Temporal
  - prompt:5 -> answer:Inferior Nasal
- Rationale: This picture shows the fiber orientation of the optic nerve after it exits the globe and as it approaches the optic chiasm. The papillomacular bundle at the core of the nerve should help explain why central vision is likely the last to go in the case of optic nerve damage.
- Media cue: image

#### Why This Is Good

- Learning target: format.matching in OPT6023 Chapter 5-6.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:1 -> answer:Superior Nasal; prompt:2 -> answer:Superior Temporal; prompt:3 -> answer:Papillomacular Bundle; prompt:4 -> answer:Inferior Temporal; prompt:5 -> answer:Inferior Nasal
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 6: Binocular Vision, Part 1

#### Question Content

- Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 1
- Format: matching
- Stem: Compare the following velocities of vergence.
- Correct pairings:
  - prompt:Fast Vergence -> answer:Responds to coarse disparity
  - prompt:Slow Vergence -> answer:Responds to fine disparity
- Rationale: Fast vergence quickly brings the eyes to the general area of the target in response to large amount of disparity, while slow vergence makes adaptation movements (vergence adaptation) to fine-tune motor fusion and minimize disparity as much as possible.

#### Why This Is Good

- Learning target: format.matching in OPT5215 Binocular Vision, Part 1.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Fast Vergence -> answer:Responds to coarse disparity; prompt:Slow Vergence -> answer:Responds to fine disparity
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 7: Systemic Disease and Prescribing for Pedatrics

#### Question Content

- Context: OPT5233 Pediatrics / Systemic Disease and Prescribing for Pedatrics
- Format: matching
- Stem: Match the following conditions you might find in a pediatric patient with a correct key clinical finding:
- Correct pairings:
  - prompt:Osteogenesis Imperfecta -> answer:Blue sclera
  - prompt:Sickle Cell -> answer:Angioid streaks
  - prompt:Sturge-Weber Syndrome -> answer:Port-wine stain
  - prompt:Tay-Sachs -> answer:Cherry red spot in the macula
  - prompt:Wilson's Disease -> answer:Kayser-Fleischer Ring
- Rationale: OI is a genetic bone disorder that leads to fragile and brittle bones. Patients might have progressive hearing loss and a blue sclera due to ectasias. Other ocular manifestations include arcus, cataracts, keratroconus, and megalocornea. Sickle cell is a hereditary disease which the red blood cells form an abnormal sickle shape. It primarily affects people of African decent. CAIs are contraindicated for glaucoma management in these patients. Sickle cell patients also may have angioid streaks, being the S in PEPSI. Sturge-Weber -> port wine stain. Tay-Sachs is an AR disorder in the Hex-A gene. It is characterized by a cherry red spot in the macula. Wilson's Disease results in a copper deposition issue. The Kayser-Fleischer Ring is a ring of copper deposits at the limbus. You'll also have development of sunflower cataracts in these patients.

#### Why This Is Good

- Learning target: format.matching in OPT5233 Systemic Disease and Prescribing for Pedatrics.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Osteogenesis Imperfecta -> answer:Blue sclera; prompt:Sickle Cell -> answer:Angioid streaks; prompt:Sturge-Weber Syndrome -> answer:Port-wine stain; prompt:Tay-Sachs -> answer:Cherry red spot in the macula; prompt:Wilson's Disease -> answer:Kayser-Fleischer Ring
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 8: Working with Special Populations, ASD, and Child Abuse

#### Question Content

- Context: OPT5233 Pediatrics / Working with Special Populations, ASD, and Child Abuse
- Format: matching
- Stem: Match the following classifications of intellectual disability with the percentage that includes the population it describes.
- Correct pairings:
  - prompt:Mild Intellectual Disability -> answer:85%
  - prompt:Moderate Intellectual Disability -> answer:10%
  - prompt:Severe Intellectual Disability -> answer:3-4%
  - prompt:Profound Intellectual Disability -> answer:1-2%
- Rationale: As many things to consider when working with the special needs population, intellectual disability comes in a spectrum. Patients can range from mild, being able to blend in socially and functions in daily life, to profound where they need constant supervision and are not capable of independent living. Severe intellectual disability patients needs direct supervision in social settings.

#### Why This Is Good

- Learning target: format.matching in OPT5233 Working with Special Populations, ASD, and Child Abuse.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Mild Intellectual Disability -> answer:85%; prompt:Moderate Intellectual Disability -> answer:10%; prompt:Severe Intellectual Disability -> answer:3-4%; prompt:Profound Intellectual Disability -> answer:1-2%
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 9: Verification of GP Lenses

#### Question Content

- Context: OPT5253 Contact Lenses II / Verification of GP Lenses
- Format: matching
- Stem: Match these terms considering GP specific gravities.
- Correct pairings:
  - prompt:Lens specific gravity is lower than the solution -> answer:The lens floats
  - prompt:Lens specific gravity is higher than the solution -> answer:The lens sinks
- Rationale: Specific gravity is an intrinsic property of a lens material. It is not dependent on lens size, thickness, or shape and can be used to identify a lens material (almost all GP material vary in specific gravity). Solutions of known specific gravities are used. The lens is successively placed in each solution to determine if it sinks or floats. This information allows the specific gravity of the lens to be narrowed to a number that can be looked up on a chart of known specific gravities for materials.

#### Why This Is Good

- Learning target: format.matching in OPT5253 Verification of GP Lenses.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Lens specific gravity is lower than the solution -> answer:The lens floats; prompt:Lens specific gravity is higher than the solution -> answer:The lens sinks
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 10: Anti-Inflammatory meds

#### Question Content

- Context: OPT5203 Ocular Pharmacology / Anti-Inflammatory meds
- Format: matching
- Stem: Rank the following in terms of clinical efficacy. (1=strongest, 7=weakest)
- Correct pairings:
  - prompt:Lotemax (loteprednol etabonate 0.5%) -> answer:3
  - prompt:Durezol (difluprednate 0.05%) -> answer:1
  - prompt:PredForte (prednisolone acetate 1%) -> answer:2
  - prompt:Alrex (loteprednol etabonate 0.2%) -> answer:6
  - prompt:Flarex (fluorometholone acetate 0.1%) -> answer:4
  - prompt:FML (fluorometholone alcohol 0.1%) -> answer:5
  - prompt:PredMild (prednisolone acetate 0.125%) -> answer:7
- Rationale: Durezol is strongest. Acetates are stronger than alcohol derivatives. Lotemax stronger than FML, but Alrex (lower conc. of loteprednol) is weaker than FML. PredMild is the weakest and basically an artificial tear that you have to shake.

#### Why This Is Good

- Learning target: format.matching in OPT5203 Anti-Inflammatory meds.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Lotemax (loteprednol etabonate 0.5%) -> answer:3; prompt:Durezol (difluprednate 0.05%) -> answer:1; prompt:PredForte (prednisolone acetate 1%) -> answer:2; prompt:Alrex (loteprednol etabonate 0.2%) -> answer:6; prompt:Flarex (fluorometholone acetate 0.1%) -> answer:4; prompt:FML (fluorometholone alcohol 0.1%) -> answer:5; prompt:PredMild (prednisolone acetate 0.125%) -> answer:7
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 11: Posterior Segment Disease

#### Question Content

- Context: OPT5233 Pediatrics / Posterior Segment Disease
- Format: matching
- Stem: Match the genetic condition with the ocular finding when doing a dilated fundus exam.
- Correct pairings:
  - prompt:Leber's Congenital Amaurosis -> answer:Normal appearing fundus
  - prompt:Stargardt's Disease -> answer:Bulls eye maculopathy
  - prompt:Best Disease -> answer:Egg yolk appearance of the macula
  - prompt:Retinitis Pigmentosa -> answer:Bone spicule
  - prompt:Coats' Disease -> answer:Retinal vascular exudation
- Rationale: These genetic conditions require proper diagnosis and treatment courses. Leber's can be detected in infancy genetic testing and patients present with poor VAs and nystagmus Stargardt's is caught in school aged children. Best's Disease is classically diagnosed with a reduced EOG, a test not commonly administered anymore. Parents with RP can test kids with ERG as young as 6 years. If it's clean, the kid won't get RP. Coats' in young boys.

#### Why This Is Good

- Learning target: format.matching in OPT5233 Posterior Segment Disease.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Leber's Congenital Amaurosis -> answer:Normal appearing fundus; prompt:Stargardt's Disease -> answer:Bulls eye maculopathy; prompt:Best Disease -> answer:Egg yolk appearance of the macula; prompt:Retinitis Pigmentosa -> answer:Bone spicule; prompt:Coats' Disease -> answer:Retinal vascular exudation
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.

### Example 12: Treatment of Binocular Vision Disorders

#### Question Content

- Context: OPT5233 Pediatrics / Treatment of Binocular Vision Disorders
- Format: matching
- Stem: Match the following EOM procedure to the correct definition.
- Correct pairings:
  - prompt:Recession -> answer:Weakens the muscle by reattaching it further back in the globe
  - prompt:Resection -> answer:Strengthens the muscle by cutting part of it off and reattaching it (makes it shorter)
- Rationale: In strabismus surgery, you can either do an EOM muscle recession or resection depending on the issue. Sometimes, it can be a combination of both. In the case of an esotropia, a surgeon might consider that the medial rectus is pulling too much, so a recession on it might be needed In the case of an esotropia, a surgeon also might consider that the lateral rectus might not be strong enough, so you'd do a resection. It often is the case that strabismus is NOT purely a muscle issue. Optometrist have a vested interest to treat the optical and neurological correction with glasses and vision thearpy.

#### Why This Is Good

- Learning target: format.matching in OPT5233 Treatment of Binocular Vision Disorders.
- Stem function: it frames the learner's task as several prompts map cleanly to answers in the same family.
- Stem quality: the stem stays focused and does not add unnecessary setup.
- Answer design: The options create prompt/answer pairs rather than ordinary distractors.
- Correct answer role: prompt:Recession -> answer:Weakens the muscle by reattaching it further back in the globe; prompt:Resection -> answer:Strengthens the muscle by cutting part of it off and reattaching it (makes it shorter)
- Rationale role: it teaches the underlying rule and gives transfer value beyond answer confirmation.
- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.

#### Parts To Preserve In New Questions

- Preserve the same cognitive task.
- Preserve the same answer-format contract.
- Preserve the rationale pattern, especially the transfer rule.
- Improve grammar or spelling when source wording is informal or rough.
