# Compact Production Examples

These examples are cleaned from human-authored production questions. HTML tags were removed for readability, and raw database identifiers were omitted. Stems, option substance, correct answers, and rationales are preserved. Some source spelling and grammar issues are intentionally left visible so agents can distinguish source examples from recommended template language.

## 1. Recall Threshold

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 1

Type: `multiple_choice`

Stem:

> What is the threshold for normal stereoacuity in the adult population?

Options:

- `40"` correct
- `60"`
- `100"`
- `20"`
- `30"`

Rationale:

> 95% of the population has a stereoacuity of 40 arc seconds or better. If your patient is 40" or better, they are considered normal.

## 2. Recognition Feature Set

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `multiple_choice`, multi-select

Stem:

> Which of the following do visuoscopy, the Macular Integrity Tester, and the After-image Transfer all have in common?

Options:

- They are done binocularly
- They are done monocularly correct
- They test for eccentric fixation correct
- They test for anomalous correspondence
- They rely on foveal fixation phenomenon correct
- You must do all these test at near

Rationale:

> Visuoscopy, the Macular Integrity Tester, and After-image Transfer are diagnostic tools specifically designed to identify and measure eccentric fixation by utilizing the patient's subjective or objective monocular fixation patterns. These tests rely on foveal markers, such as Haidinger's brushes or the foveal reflex, to determine if a non-foveal point is being used for steady monocular fixation.

## 3. Discrimination

Context: OPT5134 Vision Science II: Sensory Aspects / Quiz 8

Type: `true_false`

Stem:

> Pseudoisochromatic plates can be used to distinguish dichromatic and anomalous trichromatic vision.

Options:

- True
- False correct

Rationale:

> Pseudoisochromatic plates can indicate a color deficiency, but cannot differentiate between dichromatic and anomalous trichromatic color deficiency. The only test that can do this is the anomaloscope.

## 4. Mechanism

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `multiple_choice`, multi-select

Stem:

> In Hubel & Wiesel's Occlusion Kittens experiment, which of the following BEST explains what happened regarding when the kittens were deprived of their binocular visual input?

Options:

- If the kittens were visually deprived during the critical period only and allowed binocular vision after the end of that period, their visual cortex would slowly return to normal
- If the kittens were visually deprived during the critical period only and allowed binocular vision after the end of that period, their visual cortex would never recover normal binocularity correct
- Enucleation helped return performance of the deprived eye after the critical period
- Enucleation did not help return performance of the deprived eye after the critical period correct

Rationale:

> Hubel and Wiesel demonstrated that the visual cortex possesses a critical period of high plasticity where neural connections are permanently shaped by sensory experience. If normal binocular input is not established during this specific developmental window, the structural changes in ocular dominance columns become permanent and cannot be reversed by subsequent visual experience or surgical interventions like enucleation.

## 5. Diagnostic Interpretation And Management

Context: OPT5273 Ocular Disease I: Anterior Segment / Trauma to the Anterior Segment

Type: `multiple_choice`, multi-select

Stem:

> Your 34 YOM patient recently took a football to the side of the dome, near the left temple area. He notes some moderate to severe pain behind the eye. You notice limited EOM motility in the left eye with FROM in the right eye. His pressures were OD: 17 mmHg OS 32 mmHg. You conduct the red cap test to check for any gross optic nerve issues. He states the redness is a 35% decrease in the left eye vs the right eye. You also notice a mild afferent pupillary defect in the left eye. You send him for a CT scan and get the following results. What is your diagnosis and treatment?

Options:

- Orbital Blow-Out Fracture
- Orbial Inflammatory Pseudotumor
- Traumatic Retrobulbar Hemorrhage correct
- Thyroid Eye Disease
- Orbital Cellulitis
- Artificial Tears PRN
- Keflex 500 mg P.O. correct
- Bandage Contact Lens
- Lateral Canthotomy correct
- Timolol QID correct

Rationale:

> This presentation aligns with traumatic retrobulbar hemorrhage. Treatments include lateral canthotomy to release the pressure from blood buildup within the orbit and oral antibiotics for potential orbital cellulitis coverage. The IOP spike should also be addressed with IOP control medications such as timolol or acetazolamide.

## 6. Safety / Contraindication

Context: OPT5233 Pediatrics / Cycloplegic Exams

Type: `fill_in_the_blank`

Stem:

> You should avoid cycloplegia when your patient has this condition:

Accepted answers:

- `exact:Necrotizing Enterocolitis`
- `exact:NEC`
- `exact:Down Syndrome`
- `exact:Narrow angles`
- `exact:Nonfebrile seizure`

Rationale:

> The biggest contraindications for avoiding cycloplegia are premature infants with necrotizing enterocolitis, children with Down syndrome, or children who take anti-seizure medications.

## 7. Sequencing / Timeline

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `matching`

Stem:

> Match the timeline in which the development of stereo perception in an infant might happen.

Prompts and answers:

- `Simultanous preception` -> `1-3 months`
- `Aversion to rivalry` -> `3 months`
- `Stereopsis develops suddenly` -> `3-5 months`

Rationale:

> Regarding the development of binocular vision and stereo perception in infants: between 3-6 months, the ocular system lines up and motor fusion prevents disparity between the eyes. Before this, alignment is often unstable. Before 3 months, infants prefer adducting. Pursuits equalize both ways between 3-5 months. Stereopsis develops around 3-5 months and improves rapidly.

## 8. Fill-In Numeric Range

Context: OPT5203 Ocular Pharmacology / Medical Management of Refractive Error

Type: `fill_in_the_blank`

Stem:

> What is the range of optimal pupil size that you would expect from any one of these drops?

Accepted answers:

- `exact:2-2.5 mm`
- `exact:2.0-2.5 mm`
- `exact:2-2.5`
- `exact:2.0-2.5`

Rationale:

> 2.0-2.5 mm pupils gives the ideal pinhole effect: not too large where peripheral aberrations degrade image quality, and not too small where diffraction degrades image contrast.

## 9. True/False Concept Boundary

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `true_false`

Stem:

> A person with eccentric fixation does not necessarily have anomalous correspondence, but a person with anomalous correspondence has eccentric fixation.

Options:

- True correct
- False

Rationale:

> Eccentric fixation and anomalous correspondence are related but distinct adaptations. Eccentric fixation is a monocular condition where the deviated eye uses a non-foveal point for fixation. Anomalous correspondence is a binocular sensory adaptation where the brain remaps retinotopic connections to pair the fixing eye's fovea with a non-foveal point in the deviating eye. AC brings EF along with it, but EF can exist without AC.

## 10. Matching Classification

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `matching`

Stem:

> Classify each prompt with whether or not it is characteristic of harmonious or unharmonious correspondence.

Prompts and answers:

- `Angle S is 0` -> `Harmonious`
- `Angle S is smaller than Angle H` -> `Unharmonious`
- `Angle H does not equal Angle A` -> `Unharmonious`
- `Angle A - Angle H = 0` -> `Harmonious`

Rationale:

> In harmonious anomalous correspondence, the angle of anomaly is equal to the objective angle of strabismus. This means the subjective angle is 0. In unharmonious anomalous correspondence, subjective angle S is smaller than objective angle H, meaning angle A and angle H do not agree.

## 11. Developmental Research Feature Set

Context: OPT5215 Vision Science III: Motility / Binocular Vision, Part 2

Type: `multiple_choice`, multi-select

Stem:

> Regarding visual research in monkeys, which of the following is true when binocular deprivation was done?

Options:

- Deprivation in the critical period caused an deterioration of visual function such that it never returned to full expected normals correct
- Reverse occlusion following the critical period found some improvement was found
- In fully mature monkeys, binocular deprivation had no effect on the ocular dominance distribution of cortical neurons correct
- Neurons in the primary visual cortex remained equally responsive to inputs from both eyes despite prolonged closure

Rationale:

> Monkey research on binocular deprivation parallels Hubel & Wiesel's cat experiments and reinforces the critical period concept. Monkeys raised in total darkness from about 2 weeks to 3-6 months deteriorated below birth-level visual function and never reached normal peer visual function. In fully mature animals, binocular deprivation had no meaningful effect on cortical organization, confirming that the window had closed.
