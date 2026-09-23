<script lang="ts">
	import campus from '$lib/assets/blog/nsu-optometry-campus.png';
</script>

<p>
	LearnTerms v3 was a rebuild of most of the project. The release went out in March, but the work
	behind it covered much more than a new version number: how classes are organized, how questions
	get made, how students practice, and how the people maintaining the content keep up with it all.
</p>
<p>
	When I started LearnTerms, I was trying to get through the weekly terminology quizzes in
	Introduction to Optometry. That was a fairly specific problem. As classmates started using it and
	the project expanded into other courses, there was more to manage than a list of terms. V3 gave
	that larger version of LearnTerms a structure to work within.
</p>

<figure>
	<img src={campus} alt="The NSU Optometry campus clinic at dusk" width="1500" height="927" />
	<figcaption>NSU Oklahoma College of Optometry.</figcaption>
</figure>

<h2>A place for each class</h2>
<p>
	The new organization follows schools, cohorts, semesters, classes, and modules. Students have a
	classes dashboard, a way to join their cohort, and recent activity to help them return to the
	module they were working on. For the people managing those classes, there are tools to organize
	modules and keep the questions in the right place.
</p>
<p>
	It sounds like a basic change, and in some ways it is. But a tool built around one course can only
	go so far. Having that structure makes it more practical for different cohorts to work with their
	own material.
</p>

<h2>More ways to practice</h2>
<p>
	Custom tests were one of the bigger additions. You can choose modules, narrow the question types,
	use flagged or incomplete questions, and shuffle both the questions and their answer options. You
	can take your time or set a timer. When you finish, you get a score summary and a chance to review
	your answers, with the attempt kept in your history.
</p>
<p>
	The everyday study flow also got attention: matching and fill-in-the-blank questions, saved
	preferences, keyboard controls, mobile navigation, and question attachments. These are the things
	you touch repeatedly while studying. A confusing interaction or a preference that keeps resetting
	becomes much more noticeable after an hour of practice.
</p>
<p>
	V3 also brought more progress information for students and curators, along with badges and cohort
	activity. Curators can look at class progress and flagged questions to get a better sense of where
	people are spending their effort and what may need another look.
</p>

<h2>The work behind the questions</h2>
<p>
	A shared question bank takes work to maintain. Someone has to organize the source material, write
	or generate questions, review them, and come back when an answer needs fixing. A large part of v3
	was about giving those people better tools.
</p>
<p>
	The Content Library provides a place for a cohort’s source documents. Question Studio uses
	selected material to generate questions with AI assistance. The curation tools let people edit
	questions inline, move them between modules, handle duplicates, and work with several questions at
	once.
</p>
<p>
	That makes the process easier to manage, but the review still matters. A generated question can be
	wrong, unclear, or poorly suited to what the class is learning. I want LearnTerms to make it
	easier to find and correct those problems. Having more questions is useful when the questions are
	worth working through.
</p>

<h2>A lot changed underneath</h2>
<p>
	On the development side, v3 moved the project onto Bun, Convex, Clerk, Svelte 5, and Tailwind 4.
	It also included work on sign-in, access to cohort material, progress queries, and reliability.
	Some of that work involved simplifying things again, including rolling back an expensive progress
	cache in favor of direct queries.
</p>
<p>
	The release added curator subscription support and the surrounding pricing and account pages, too.
	Those parts are less visible during a study session, but they are part of maintaining a project
	that has grown beyond my own coursework.
</p>

<h2>Thank you</h2>
<p>
	The NSUOCO Class of 2028 has been part of this project from the beginning. Thank you for using
	LearnTerms, pointing out the rough spots, and giving me reasons to keep working on it. Brayden D.
	and Collin L. helped guide much of the development behind v3. Nate W. and Emily A. put the AI
	tools through their paces. Courtney, Kaity, Emma, and Cori contributed to content curation,
	quality control, and support. There are many more people whose feedback has made its way into the
	project, including students at other schools.
</p>
<p>
	I’m still an optometry student building something I also use. LearnTerms is meant to fit alongside
	lectures, textbooks, lab, and dedicated board-prep resources. My hope is that it gives us a useful
	place to test our understanding, work through mistakes, and practice under a time limit before
	exam day. The deeper learning still happens across all of those parts of school.
</p>
<p>
	The <a href="https://github.com/jdang00/learnterms/releases/tag/v3">full v3 release notes</a>
	cover the individual changes and contributions.
</p>
<p>Justin</p>
