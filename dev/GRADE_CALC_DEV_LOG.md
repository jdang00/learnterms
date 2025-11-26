

# Fall 2025 Grade Calculator

Hey everyone,

I built a custom grade calculator specifically for our Fall 2025 semester. While Blackboard is okay for checking individual assignments, it’s often terrible at predicting your final grade because it doesn't handle the weird syllabus rules (like dropping lowest grades, replacing quiz scores, or conditional bonuses) very well.

I’ve gone through every syllabus for this semester and "hard-coded" the specific grading logic into this app. Here is a breakdown of how it calculates your grades for each class.

## Privacy Note
**This calculator runs entirely in your browser.** Nothing you type is saved to a server or seen by me.

---

## Course-Specific Logic

### OPT 5134: Vision Science II 
This was the hardest class to model because the syllabus has complex "safety nets." The calculator handles them automatically:
*   **Quiz Replacement:** If your Final Exam score is higher than your weekly quiz scores, the calculator automatically takes your **2 lowest quizzes** and replaces them with your Final Exam percentage.
*   **The Bonus Rule:** If you’ve taken all quizzes and your quiz average is higher than your Final Exam score, the calculator automatically adds the difference (up to 3%) to your Final Exam grade.
*   *Note:* The calculator checks these rules in real-time. You can type in a hypothetical Final Exam score to see how it saves your quiz grade!

### OPT 5164: Ophthalmic Optics I
This course allows for dropped grades, which generic calculators usually mess up.
*   **Reading Quizzes:** It tracks all 6 quizzes but automatically **drops the lowest 1**.
*   **Homework:** It tracks all 7 assignments but automatically **drops the lowest 1**.
*   **Grading Scale:** It applies the 92% cutoff for an A.

### OPT 5153: Contact Lenses I
*   **Grading Scale:** It uses the specific cutoff points (A = 90%, B = 80%).

### OPT 5183: Clinical Methods III
*   **Total Points:** Calculated out of **522 points**.
*   **The "92%" Threshold:** This class uses a tougher grading scale where an A starts at 92% and a B starts at 82%. The calculator is programmed to switch colors/letters based on these specific thresholds so you don't get a false sense of security with a 90%.
* There are a ton of bonus points to be had, just like Binocular. Just add those on top of your raw score.

### OPT 5113: Binocular & Refractive Anomalies
*   **Points Based:** This is a straightforward points accumulation course (240 points total).
*   **Friday Challenges:** All 5 are tracked here.
* Once again, bonus points are to be added on top of the raw score. (I can technically but this might be a nice feature only to be added later down the road.)

### OPT 5273: Ocular Disease I
*   **Even Split:** This calculates based on weights rather than raw points.
*   **Weights:** Exam 1, 2, 3, and the Final are all weighted equally at **25% each**.
*   **Cutoffs:** Note that an A is a 91% and a B is an 82%.

---

## FAQ

**Why does my grade change when I leave a box blank?**
The calculator treats blank boxes as "not yet graded." It shows you your current standing based *only* on the work you've turned in. If you want to see "What if I get a 0?", you need to type "0".

**Can I use this to plan my finals?**
Yes! This is the main reason I built it. Fill in your real grades for everything you've done so far, then type theoretical numbers into the Final Exam boxes to see exactly what you need to keep your A (or save your B).

***

*Disclaimer: Always double-check your math against the official syllabus!*