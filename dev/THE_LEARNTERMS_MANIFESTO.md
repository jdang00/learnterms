# The LearnTerms Manifesto

**Justin A. Dang**  
**19 July 2025**  
*This document was written with the help of GPT-4.1.*

---

## Introduction

A statement of purpose and history. The “why” behind LearnTerms, how it started, who it’s for, and what this document aims to be—a source of truth for the platform’s mission, technology, and future direction.

### The Problem: Old-School Study Materials

At the NSU Oklahoma College of Optometry, the reality of first-year study hit fast: each week, our class was handed a dense workbook crammed with over a hundred new terms—each one a possible target for the next quiz. These were not digital or interactive, but plain, black-and-white sheets: endless lists of medical roots, disease names, and anatomical parts, each with a blank beside it and maybe a pronunciation guide if you were lucky. The official expectation was that every student would handwrite or type out every term, memorize the exact spelling, and somehow be ready for a closed-book exam where a single typo could cost a point.

As the weeks wore on, the pain points became obvious. There was no way to know which terms would actually show up on a quiz, so most of us defaulted to brute force—rewriting, reciting, and re-highlighting every single word. If you wanted digital help, you were on your own. Most people dumped all 100+ terms into Quizlet or Anki, creating decks that were just as overwhelming as the original workbook. Flashcards helped with repetition, but not with focus: time was wasted reviewing obscure or irrelevant terms that, in hindsight, were never tested at all.

The more we tried to optimize, the more friction we hit. There was no centralized way for the class to pool corrections, flag mistakes, or highlight high-yield concepts. When a word’s definition changed (which happened more than it should), or if a typo made its way into the Quizlet deck, every student had to fix it manually. There was no real analytics, no “star this for review,” and absolutely no AI-powered question generator to break up the monotony. By mid-semester, it was clear that the tools we’d inherited weren’t built for the way we actually needed to study. We weren’t just fighting the material—we were fighting the format itself.

---

## The Origin Story: From Study Tool to Community Platform

LearnTerms began in the quiet frustration of a single fall semester at the NSU Oklahoma College of Optometry. Faced with the reality of memorizing more than a hundred unfamiliar terms each week, I found myself staring at yet another thick packet of workbook pages, the kind that demanded not just rote memorization but perfect spelling and recall. Each quiz was a stress test—one misplaced letter and you lost the point. There was no shortcut, no guided review, and certainly no digital aid that fit the way we actually learned.

Like most of my classmates, I started by manually transcribing every term, hoping sheer repetition would stick. It didn’t take long to realize this was unsustainable—not just for me, but for everyone. The class GroupMe were full of people asking for quiz tips, sharing last-minute corrections, and wondering if anyone had made a Quizlet deck that actually matched the instructor’s key. There were plenty of digital flashcards floating around, but no quality control, no way to prioritize, and certainly no way to collaborate in real time.

Late one night, after yet another round of hand-typing definitions, I decided to build something better—a site where I could type terms directly, get instant feedback, and review only the words that needed extra work. At first, LearnTerms was just for me, a way to keep my own study habits on track. But it didn’t stay private for long. As soon as I shared the first version with the class, people started using it. The response was immediate and overwhelming: classmates wanted more features, more flexibility, and a way to quickly find, flag, or star the terms that actually mattered.

Within a few weeks, LearnTerms shifted from a solo project to a true community tool. Feature requests rolled in from every corner of the class. Some wanted a better way to search; others wanted to track missed terms or create custom review sets. Feedback poured in through texts and late-night study group messages—sometimes with bug reports, sometimes just with thanks for making quizzes a little less stressful. Every suggestion shaped the roadmap, and every update made the platform more responsive to real student needs.

It became clear that LearnTerms was more than a digital flashcard deck. It was becoming a collaborative platform, one that grew directly out of our lived experience in optometry school—a tool designed not just to survive the next quiz, but to change the way we studied together.

---

## Core Principles

At the heart of LearnTerms are a set of core principles that have guided every decision, from the very first flashcard to the latest AI-powered upgrade. These principles were forged not in a boardroom, but in the day-to-day reality of optometry school—between lectures, late-night study sessions, and candid conversations with classmates about what actually works. LearnTerms is not a generic edtech solution; it is built on the foundation of real problems, lived by real students, and tested under the pressure of real exams.

**Simplicity** stands above all. Every feature begins as small as possible and only grows when genuine need and user feedback demand it. If a tool or interface doesn’t solve a tangible problem, it doesn’t belong on the platform. LearnTerms always favors clear workflows, direct feedback, and minimal cognitive overhead. This principle extends to the codebase, where logic is separated from presentation, and every component is designed for both speed and maintainability.

Another guiding value is that **LearnTerms solves only for what its builders deeply understand**. There are no hypothetical features built for imagined use cases. Instead, development is grounded in first-hand experience—especially with the unique demands of optometry education. If a feature isn’t rooted in the reality of NSUOCO students, it’s left for later, if at all. As the platform grows, this commitment to domain expertise ensures that LearnTerms stays focused, relevant, and effective.

**Community** is the engine that drives everything. LearnTerms is, and will always be, a tool for students, by students. The platform is collaborative at its core: new features emerge from user requests, curators are fellow classmates, and improvements are shipped with the whole class in mind. Authority is distributed, not centralized—there are no instructors dictating content, no outside administrators, and no top-down mandates. Every new school or class that joins will be able to shape their own content and contribute to the platform’s evolution.

**Speed** matters, but not at the expense of quality. Every release is tested with real data and real users, with a bias toward launching early and iterating often. Honest trade-offs are acknowledged and documented—especially when resource constraints or technical limitations force hard choices. This means the platform evolves quickly, but always with an eye toward reliability and the needs of actual users.

Finally, LearnTerms is **built to scale, but never at the cost of its soul**. No matter how many schools or students use it, the non-negotiables remain: student-led creation, zero tolerance for ads or data sales, and relentless respect for privacy. Technology changes, and so will the platform—but these core principles are the DNA that will guide LearnTerms for years to come.

---

## v1: Manual Flashcards and the Birth of LENS

The first iteration of LearnTerms was shaped entirely by necessity and sheer volume. Every student in our class was tasked with mastering well over a hundred medical terms each week—an undertaking that felt less like active learning and more like an exercise in survival. The earliest version of the platform was simple by design: a digital flashcard tool that let you type out each term and its definition, then quiz yourself with instant feedback. There was no login, no analytics, and no system for sharing progress or suggestions. You opened the site, loaded the week’s deck, and started typing—hoping that repetition would translate into retention.

But the raw reality soon set in: not all terms were created equal, and not all study time was well spent. Some terms appeared on nearly every quiz, while others never showed up at all. Long, complex, or redundant words soaked up hours of effort without ever being tested. Many classmates, myself included, noticed that even with all the right tools and diligent review, our results didn’t always match the work we were putting in. The inefficiency was obvious, but the solution wasn’t.

After a few weeks of wrestling with endless decks, I began tracking which terms actually appeared on quizzes and which ones could be safely deprioritized. This wasn’t guesswork—it was driven by patterns in the assessments, conversations with classmates, and honest frustration at how much time was being wasted on irrelevant material. It was clear that a smarter system was needed: something that could separate the high-yield, high-probability terms from the rest, allowing everyone to focus their energy where it counted most.

That’s when the **LENS algorithm** was born. LENS—short for **Learning Efficiency and Nomenclature Scoring**—offered a systematic way to prioritize every term. It evaluated each entry by three metrics: **importance to optometry, quizzability (how likely it was to appear on an exam), and difficulty to learn**. The formula was simple, but the impact was immediate. By multiplying importance by quizzability and dividing by difficulty, LENS assigned every term a score. The lowest-scoring terms—often those that were redundant, rarely tested, or impossibly convoluted—were cut from the weekly deck.

Within a few cycles, the difference was unmistakable. Students were spending less time studying but performing just as well, if not better, on weekly quizzes. No one missed a single term that actually appeared on a test, and the overall stress in the class noticeably dropped. For the first time, we had a tool that didn’t just digitize the old workbook—it improved on it, giving every student a strategic advantage. The process was part manual, part automated, and part AI-assisted, blending scripting, human insight, and even some large language model assistance to score and refine each deck. LENS wasn’t perfect, but it set a new standard for efficiency and focus in how we approached optometry’s dense vocabulary.

The success of LENS marked a turning point. LearnTerms was no longer just a flashcard app. It had become a dynamic, adaptive study platform—one rooted in real data, honest reflection, and the lived experience of its users.

---

## v2: Smarter Studying, Simplified

The launch of **LearnTerms v2** marked a transformation from a simple flashcard utility to a purpose-built platform engineered for true mastery and exam readiness. The lessons of v1—especially the success of LENS—made it clear that students needed not just a smarter way to curate what they studied, but a fundamentally better way to practice for the realities of optometry school assessments. This new version set out to deliver both.

From the ground up, LearnTerms v2 was a technical and user experience overhaul. The frontend was rebuilt with **Svelte 5**, bringing near-instant load times, smooth transitions, and a modern look powered by the latest versions of **daisyUI and TailwindCSS**. No more waiting for bloated web pages or clunky navigation—everything was designed to be as fast and frictionless as possible. Progress could now be tracked across devices, saving a student’s place in real time and allowing them to pick up right where they left off, whether on a laptop at the library or a phone before class.

But the real breakthrough was the introduction of the **Exam Module**. Inspired by the Examplify software used for real tests, this feature created a full simulation of the optometry exam experience. Every detail was considered: from question shuffling and elimination, to flagging tough items for later review, to built-in keyboard shortcuts and automatic progress saving. The interface didn’t just look like the actual testing environment—it worked like it, down to the smallest details. For the first time, students could practice under conditions that mirrored test day, building familiarity and reducing anxiety long before the real exam.

LearnTerms v2 also embraced the power of artificial intelligence. Instead of relying solely on curated lists or static decks, the platform now leveraged large language models to generate new, class-specific questions on demand. By feeding the models real course materials—syllabi, lecture notes, even instructor slide decks—students and curators could quickly create high-quality, relevant questions complete with explanations and multiple-choice options. Every generated question went through a validation process, with both AI and human curators ensuring accuracy and clarity before questions went live. The end result was a constantly evolving bank of practice material, always tailored to the latest course content and exam patterns.

None of these upgrades happened in a vacuum. Throughout the v2 development process, feedback from classmates continued to shape the roadmap. New features, interface tweaks, and bug fixes were shipped in rapid cycles, with real students testing every change. The result was a smarter, faster, and more engaging study environment—one that didn’t just save time, but actively built confidence and improved performance. For the first time, LearnTerms felt less like a workaround and more like a competitive advantage, letting every student prepare smarter, not harder.

A key difference between v1 and v2 was the pace and timing of development. The original LearnTerms came together gradually, built piecemeal in spare moments throughout a busy semester. It was a labor of necessity, evolving organically in direct response to each week’s study demands and class feedback. In contrast, the leap to v2 was a focused, intentional push that took place almost entirely over the winter break, spanning late December into January. Free from daily classes and with the lessons of an entire semester in mind, I was able to dedicate long, uninterrupted hours to rethinking the platform from top to bottom. This sprint allowed for a much more cohesive, integrated upgrade—replacing old components, designing new features, and stress-testing every workflow before the next term began. As a result, v2 launched not as an incremental patch, but as a clear next-generation platform, ready to meet the evolving needs of the class from the very first week of the new semester.

---

## AI Integration: How LearnTerms Generates Its Edge

The true leap forward in LearnTerms v2 was not just in speed or usability, but in the integration of artificial intelligence at the core of the platform. Early experiments included various combinations of orchestration and retrieval tools, but it quickly became clear that the highest quality questions came from harnessing the unique capabilities of **Gemini 2.5 Pro**. With its one million token context window, Gemini 2.5 Pro allowed LearnTerms to move beyond retrieval-augmented generation (RAG) and instead focus on feeding entire swaths of course-relevant material directly into the model. This shift enabled curators to hand-select lecture notes, instructor slides, and textbook excerpts and present them to the AI as a single, comprehensive context.

By leveraging Gemini 2.5 Pro’s ability to absorb and reason across vast amounts of content in a single prompt, LearnTerms achieved a dramatic jump in question quality, accuracy, and creativity. The questions generated weren’t generic or surface-level—they reflected the nuance, language, and emphasis of the real class material, often echoing the style of the actual course exams. Every batch of AI-generated questions followed a strict format, including options, question text, explanation, and correct answer keys. This ensured that each question was both reviewable and ready for immediate use in the platform.

The workflow didn’t end with AI alone. Every new set of questions went through an additional layer of review by human curators, who checked for clinical relevance, clarity, and alignment with course objectives. Corrections, edits, and feedback could be applied on the spot, thanks to a transparent and rapid question generator UI. What once took hours of drafting or crowdsourcing could now be completed in minutes, with more time left for thoughtful review and continuous improvement.

This AI-first workflow turned LearnTerms into a content engine—able to stay ahead of the curriculum and deliver practice questions that genuinely matched what students needed to know for exams. In this way, Gemini 2.5 Pro didn’t just automate question generation; it supercharged the platform’s capacity for personalized, relevant, and challenging study material, making smarter studying not just a goal, but the new standard.

---

## Technical Architecture (as of v2)

LearnTerms v2 is powered by a modern, componentized stack centered on **SvelteKit** for the frontend, **Supabase/Postgres** for the backend and database, and **Clerk** for authentication. The architecture is optimized for rapid prototyping, fast iteration, and the unique needs of a student-driven study platform, while exposing several pain points that have directly informed the design of v3.

The frontend is a single-page application built in SvelteKit (using Svelte 5 and runes for state management), styled with TailwindCSS 4.0 and daisyUI v5. This stack ensures fast initial load, responsive UI transitions, and a clean separation of logic and presentation. All user-facing features—study decks, the Exam Module, progress dashboards, and the AI question generator—are accessible as Svelte components, with routing handled by SvelteKit and real-time updates synchronized via Supabase’s client SDK.

Authentication and role management are handled by Clerk. User objects are created and maintained in Clerk, with additional metadata (such as role assignments for admins and curators) stored in the Clerk user object and verified server-side within SvelteKit endpoints. Access control is strictly enforced: only users with the “curator” or “admin” role can add or edit questions, while all others are limited to standard study features. All user authentication and session management, including SSO, social login, and token refresh, are delegated to Clerk for security and reliability.

The backend utilizes Supabase as both a managed Postgres database and a set of RESTful and real-time APIs. The schema is designed around the following primary tables: `pharmquestions` (main question bank), `pharmchallenge` (advanced challenge questions), `pharmchapters` (module metadata), and user tables (`[PROD] users`, `[DEV] users`, `users_dev`). Each question record is stored as a strict JSONB blob, requiring the presence of options, question text, explanation, and answer key fields. Every question and challenge is always tied to a specific chapter by a smallint chapter number (referenced in pharmchapters). This association forms the core of the module structure and enables efficient loading and progress tracking for students.

User interaction data is captured in two main tables: `user_question_interactions` and `user_challenge_interactions`. These tables record each user's selected answers, eliminated choices, flags, and timestamps for every attempt, with foreign keys linking back to the main questions and user tables. This structure enables granular analytics, such as completion rates, mastery by chapter, and per-question error rates, as well as real-time progress updates in the UI.

All admin and content management tools are accessed via the same SvelteKit frontend, with server-side authorization logic in `+page.server.ts` files enforcing permissions. Admins and curators use a dynamic dashboard to create, edit, and validate questions, manage chapters, and review analytics. UI updates are immediately reflected in the database thanks to Supabase’s real-time listeners, though performance can degrade under heavy load due to the lack of fine-grained indexing and the inflexibility of querying deeply nested JSONB fields.

Technical limitations of this architecture are candidly acknowledged. The use of JSONB for question storage, while flexible for rapid schema changes and AI pipeline integration, makes certain queries (search, analytics, mass edits) unwieldy and inefficient—especially as the dataset grows. Staging and development tables (`flashcards_dev`, `users_dev`) are maintained separately from production, requiring manual migration and no automated promotion. Backups are managed via Supabase’s dashboard, with no automated disaster recovery pipeline beyond standard cloud provider guarantees.

The AI question generator is architected as a front-end Svelte module that interfaces directly with Gemini 2.5 Pro via secured API calls. Curators paste in source material, initiate question generation, and receive structured results for review and export. Generated questions follow the strict JSON format required by the platform, and all edits/approvals are performed inline before committing to the database.

In summary, LearnTerms v2’s architecture is optimized for rapid, student-led development and collaborative content creation, leveraging modern web frameworks, real-time APIs, and role-based access control. However, its known bottlenecks—especially around querying, indexing, and large-scale multi-class support—are the direct drivers for the planned migration to Convex and a more modular, scalable schema in v3.

---

## The Curator Workflow

Curators are the backbone of LearnTerms’ collaborative content engine. These are students, not instructors or external admins, who have demonstrated both subject mastery and a commitment to improving study resources for their cohort. Curators are granted special roles within Clerk, enforced at the API and server level within SvelteKit, which allows them to create, edit, validate, and manage the bank of practice questions and challenge items for their class.

The question creation process is intentionally streamlined but rigorous. Curators begin by identifying high-yield material from the latest lectures, instructor-provided slides, or textbook excerpts. Using the platform’s integrated AI question generator (backed by Gemini 2.5 Pro), they input the source material and receive a set of proposed questions, each formatted with options, answer keys, and explanations. Each question is reviewed inline; curators edit, clarify, or discard as needed, ensuring accuracy, clinical relevance, and alignment with course objectives. This blend of AI-powered generation and human oversight is central to the quality of the LearnTerms question bank.

Once questions are finalized, they are assigned to the appropriate chapter and committed to the `pharmquestions` or `pharmchallenge` tables. Every question must conform to the platform’s strict schema, including the required fields and association with a chapter. The admin dashboard gives curators a transparent, searchable view of all active questions, supporting rapid editing and easy updates as course material evolves or as errors are flagged.

Feedback and correction are core to the workflow. While formal in-app flagging is planned for future versions, the current system relies on direct communication: students text or message curators when a question seems ambiguous or incorrect. Curators can immediately edit or withdraw problematic items, with changes reflected in real time for all users thanks to Supabase’s live sync. This high-touch approach, while informal, has proven highly effective in a class-sized deployment and fosters a strong sense of community ownership.

Role assignment is explicit and secure. Curator privileges are tied to individual schools or classes, meaning a curator from one program cannot edit or access materials from another. Only platform admins (typically developers or core maintainers) have global edit rights and can update platform-wide settings or assign new curators. This ensures that each school’s content is maintained by people with firsthand experience, and preserves the principle that LearnTerms is always student-driven.

Overall, the curator workflow is a deliberate balance of speed, control, and accountability—empowering motivated students to create high-quality, relevant study material while maintaining the flexibility and responsiveness that only peer-driven tools can provide.

---

## Admin, Access, and Scaling

As of v2, LearnTerms is intentionally lean and focused on serving a single class, cohort, and subject. All onboarding, module setup, and data structure changes are developer-driven. If a new class or cohort needs to be added, a platform admin manually creates new tables in Supabase, configures API endpoints, and adapts frontend interfaces to handle the new content. Every expansion—whether for a new semester or a parallel group—requires direct code changes and database schema updates. This approach works for a tightly knit cohort, but is neither scalable nor sustainable as LearnTerms grows.

User roles are centrally managed via Clerk and enforced at the server level in SvelteKit. Each user is assigned one of three roles: **student, curator, or admin**. Students have access to all study modules and personal progress tracking, but cannot change content. Curators are students who have earned the privilege to create and edit questions for their class or cohort, but only within the scope of their assigned school. Admins, typically developers or trusted maintainers, have full platform rights and can assign new curators, edit any content, and manage platform-wide settings. LearnTerms is and will remain a student-driven platform—faculty and instructors are intentionally excluded from the curation pipeline to maintain peer-to-peer collaboration.

With the transition to v3, LearnTerms is being rebuilt to support true multi-class, multi-cohort, and multi-school scaling. The move to **Convex** as a backend unlocks a modular, document-oriented data model with native real-time sync, schema enforcement, and clean separation of development and production environments. This foundation will allow new schools, classes, and modules to be added with little or no developer intervention. Curators will be able to manage content at the class level and down, and every student will be automatically connected to their appropriate curriculum.

In v3 and beyond, onboarding a new school or class becomes as simple as filling out an online form, assigning curators, and starting to build study modules—no database migrations or manual configuration required. Roles and permissions remain strictly enforced, with students as the center of content creation and curation. The goal is to preserve the core principles of privacy, student leadership, and collaboration, while giving LearnTerms the scalability to serve any optometry program or health science course that shares its vision.

---

## Analytics, Feedback, and Continuous Improvement

In its earliest days, LearnTerms offered little more than anecdotal feedback and informal bug reports. During v1, progress tracking was entirely manual. Students would share quiz results, flag confusing terms in group chats, or message the developer directly to report typos or mismatches in the decks. There were no built-in analytics, no dashboards, and no way to measure which terms were most missed or which features were actually being used. Improvements came piecemeal, based on individual reports and the developer’s own observations.

In v2, analytics and feedback have become central to the platform’s daily operation. Every user interaction—whether answering a question, flagging an item, or completing a module—is recorded in dedicated interaction tables. The system tracks which questions are most frequently missed, which chapters have the highest completion rates, and how individual users progress over time. Curators and admins can access real-time dashboards to monitor engagement, identify problem areas, and prioritize improvements. Students can immediately see their mastery levels by chapter, review flagged or missed questions, and track their study history across devices. Error correction and quality assurance remain highly responsive, as students are still encouraged to report problematic questions directly to curators, who can make instant edits that are reflected in real time for the whole cohort.

Looking ahead to v3, LearnTerms will make feedback and continuous improvement even more seamless and scalable. In-app flagging, reporting, and suggestion tools will empower every student to participate directly in content quality assurance. Analytics will expand to include cohort-wide performance, comparative benchmarking, and automated notifications to curators when specific questions or modules show signs of confusion or widespread error. Improvements in data architecture—especially with Convex—will enable more advanced queries, deeper insights, and faster iteration on new features. The goal is to transform LearnTerms into a living platform, where every interaction is an opportunity for enhancement, and every user has a voice in shaping the study experience for themselves and for future cohorts.

---

## Lessons Learned and Technical Debt

The journey from LearnTerms v1 to v2 has revealed both the strengths and the growing pains of building a grassroots, student-led platform under real academic pressure. Many early choices, while effective for quick launches, have introduced significant technical debt and design limitations as usage has grown and ambitions have expanded.

One of the most persistent pain points is the reliance on **JSONB blobs** for storing question data in Supabase. This schema was originally adopted for its flexibility—allowing rapid changes to question format and easy integration with the evolving AI pipeline. However, as the dataset expanded, this approach proved difficult to scale. Querying, filtering, and aggregating question data became increasingly inefficient, especially when trying to analyze trends, surface analytics, or perform mass edits. Search operations were slow, updates were error-prone, and any schema changes required manual workarounds. This has become one of the central drivers behind the shift to a more structured, document-oriented model in v3.

Another challenge has been the manual nature of onboarding new classes or cohorts. In v2, adding a new subject or module still requires developer intervention: creating tables, writing new endpoints, and wiring up frontend changes for every expansion. While this tight control was an asset in the platform’s infancy, it is a clear bottleneck as LearnTerms seeks to support multiple cohorts and schools.

The real-time performance offered by Supabase’s APIs has been essential for quick updates and instant feedback, but maintaining responsiveness under high load has required constant attention to indexing, database maintenance, and resource allocation. Early on, maintenance tasks like vacuuming and tuning indexes were sometimes neglected, resulting in slowdowns and occasional downtime during peak usage.

AI integration has also proven to be both a powerful accelerant and a persistent source of complexity. While AI dramatically reduced the time required to generate high-quality questions, the process of prompt engineering, model validation, and human curation took far more time and effort than anticipated. Reliance on a single model (Gemini 2.5 Pro) required the team to stay current with API changes, model behavior, and shifting best practices in AI safety and prompt design.

Despite these challenges, the lessons are clear. Flexibility is invaluable for early-stage development, but scalability, structure, and maintainability must follow close behind. Feedback loops—both technical and human—are essential for quality, and any future architecture must prioritize self-service onboarding, modular design, and analytics built on a truly queryable foundation. As LearnTerms moves forward, these lessons will inform every architectural and workflow decision, ensuring the platform stays responsive, reliable, and ready for whatever comes next.

---

## AI: The Path Forward

Artificial intelligence has moved from a novelty to the central engine powering LearnTerms’ most transformative features. In v2, the adoption of Gemini 2.5 Pro with its expansive context window enabled an entirely new paradigm for question generation: curators can now feed entire lectures, slides, and textbook sections into the model and receive nuanced, relevant, and well-structured multiple-choice questions in seconds. This process does not rely on generic retrieval or black-box pipelines. Instead, every generation session is guided by the judgment and intent of real students, who carefully curate source material and review every output before publication.

AI’s value in LearnTerms is not just speed—it’s the capacity for true adaptation and creative synthesis. The system ensures every question is specific to the current curriculum, reflects the instructor’s style and emphasis, and is formatted to be both challenging and educational. Each batch of questions is validated, edited, and improved by human curators, creating a seamless cycle where technology and experience work together to maximize quality. This hybrid approach has allowed LearnTerms to keep pace with ever-evolving course content and to respond immediately to feedback from the cohort.

Looking ahead, the platform is committed to staying at the cutting edge of AI capability. Every new generation of large language model—whether from Google, OpenAI, or other providers—will be evaluated and, if superior, rapidly adopted. The plan is to move toward fully in-line, admin-friendly, and eventually student-personalized generation workflows, allowing for question creation, review, and deployment within a single, cohesive interface. AI will continue to be used as a collaborator, not a replacement for student insight or subject-matter expertise. Prompt design, context selection, and final approval will always remain in human hands.

The guiding philosophy is clear: never settle for generic, template-driven content or “set it and forget it” automation. LearnTerms exists to empower students to do their best work, and that means continuously pushing the boundaries of what AI can contribute to the learning process. As new models and tools emerge, the platform will always move fast to integrate the best, ensuring that smart, creative, and rigorously validated study material is never more than a click away.

---

## Moonshot Features and Dreams

The future of LearnTerms is limited only by imagination—and, if we’re being honest, by how many hours I can stay awake and how wild the school schedule gets. If there were unlimited time, unlimited caffeine, and a few extra hands on deck, LearnTerms would be the ultimate hub for every optometry student, and one day, every health sciences learner who ever stared down a hundred-term workbook and thought, “there has to be a better way.”

In the dream scenario, LearnTerms would talk to everything—Anki, Quizlet, random PDFs, maybe even that mysterious folder of handwritten notes everyone seems to have but nobody can read. Any user could build their own modules, generate personalized questions on demand, and share them instantly with their friends or the whole community. The AI question generator would be everyone’s study buddy, not just an admin tool, and would adapt to your habits, your weak spots, and yes, even your favorite exam meme themes.

The experience would be as social as a group study session (minus the 2 a.m. existential crisis). Peer feedback, live leaderboards, and real-time discussion would keep everyone motivated and a little competitive, but always supportive. AI would nudge you with reminders and custom reviews, but never judge you for that last-minute cram session before a big test. Learning would feel less like a chore, more like a win—even on those days when the only thing standing between you and a nap is a pharmacology deck.

And while we’re dreaming: every feature would be mobile-first, lightning-fast, and universally accessible, with room for every kind of learner. Maybe there’s a world where even instructors and schools chip in verified content (as long as they don’t ruin the vibe). Most importantly, the heart of LearnTerms would never change. It would always be about students helping students—removing barriers, reducing anxiety, and making the journey just a bit more fun and a lot less lonely.

Maybe someday, with a few more contributors and a little more sleep, this dream will be reality. Until then, LearnTerms will keep growing one deck, one question, and one very late night at a time.

---

## What Must Never Change

As LearnTerms evolves, expands, and adapts to new schools, new technologies, and new cohorts, there are a few foundational truths that must always remain untouched. First and foremost, **LearnTerms is for students, by students**. This isn’t just a slogan—it’s the backbone of everything. The platform exists to empower peers to help each other, to create and curate study material together, and to build a culture of support that can’t be outsourced or manufactured from the top down. If LearnTerms ever becomes a tool managed primarily by faculty, administrators, or third parties, it will have lost the very essence that made it valuable.

**Privacy and trust are non-negotiable**. There will never be ads, no sale or exploitation of user data, and no invasive analytics that do more harm than good. Student progress, preferences, and study habits will always belong to the students themselves. Any analytics or data collected are solely for the improvement of the platform and the learning experience, not for monetization or outside interests.

**Openness to feedback and relentless iteration** must also persist. LearnTerms should always be flexible enough to adapt to real student needs, quick to correct mistakes, and honest about its own shortcomings. Every update, whether technical or content-based, should serve the goal of making studying more effective, less stressful, and more enjoyable.

And finally, the **community spirit**—built on late nights, group chats, and the quiet understanding that nobody gets through professional school alone—should always infuse every feature, every deck, and every decision. No matter how large the platform grows, LearnTerms must keep its sense of humility, humor, and heart. The mission is not just to help students pass their exams, but to make the journey a little easier, a little smarter, and a lot more connected.

These are the lines that must never be crossed. As technology changes and new features are added, the DNA of LearnTerms will remain: student-led, privacy-first, community-driven, and always, always in service to those who are learning.

---

## Appendix

Will be filled out soon. It will include:

- LearnTerms Data Model Diagrams
- Sample Question Data
- Screenshots of the Platform
- LENS Algorithm Paper
- Key Blog Posts & Announcements
- User Roles & Permissions Matrix
- Sample AI Prompt and Output
- Performance Benchmarks
- List of Core Contributors and Acknowledgements
- Reference Links
- Future Feature Roadmap
- Terms and Privacy Policy

---

## Conclusion

LearnTerms began as a small, personal project built in the margins of a busy optometry school schedule. What started as a way to bring order and focus to a chaotic weekly study grind has grown into a platform that serves not only a single class but has the potential to reshape how cohorts, schools, and eventually entire disciplines approach collaborative learning. At every stage—through late-night debugging, impromptu group feedback, and moments of both frustration and breakthrough—the core mission has remained the same: to help students study smarter, together.

This manifesto is more than just a technical reference. It is a living record of every pain point, every lesson, and every hard-earned insight from real users and real contributors. It documents both the architecture of LearnTerms and the community spirit that animates it. For any developer, curator, or student who picks up the torch in the future, it is a source of truth for how and why the platform works—and where it should always be heading.

The road ahead is full of challenges and opportunities. New technologies will emerge, new students will bring fresh ideas and energy, and the platform will undoubtedly evolve in ways that are hard to imagine now. But the principles and practices documented here are built to last. As long as LearnTerms stays true to its roots—student-led, privacy-first, relentlessly helpful, and always open to improvement—it will continue to be more than just a website or an app. It will be a community, a catalyst for success, and a companion on the journey through professional school.

To everyone who uses, contributes to, or improves LearnTerms: thank you. May it always make your studying a little bit smarter, a little bit easier, and a lot more connected.
