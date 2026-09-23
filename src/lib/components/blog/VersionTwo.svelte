<h2>Introduction</h2>
<p>
	Welcome to the launch of <strong>LearnTerms v2</strong> – a revolutionary upgrade designed to transform
	your exam preparation. With smarter study tools and an AI-powered backend, LearnTerms v2 is set to become
	the go-to platform for our class. In this post, we&#x27;ll walk you through the evolution of the platform,
	explain the technology behind the upgrade, and show you how these changes will make your study sessions
	more efficient and effective.
</p>

<h2>Background &amp; The Problem</h2>
<h3>Background</h3>
<p>
	LearnTerms began as a focused solution addressing a specific challenge in a single course. By
	concentrating our efforts on a niche area, we were able to create a lightweight and user-friendly
	service with minimal barriers to entry. However, as our user base grew and expectations increased,
	the limitations of the original version became apparent.
</p>
<h3>The Problem</h3>
<ul>
	<li>
		<strong>Limited Scope:</strong> The previous version was confined to a single class, which restricted
		its potential.
	</li>
	<li>
		<strong>Manual Verification:</strong> A significant amount of manual effort was required to verify
		terms and maintain accuracy, consuming countless hours.
	</li>
	<li>
		<strong>Scalability Challenges:</strong> The system needed to evolve to accommodate a broader range
		of content while still delivering a high-quality user experience.
	</li>
</ul>
<p>
	These challenges highlighted the need for a robust, scalable solution that would automate and
	streamline study material generation.
</p>

<h2>The Evolution: What&#x27;s New in LearnTerms v2</h2>
<h3>Vision for v2</h3>
<p>LearnTerms v2 is built with three clear objectives:</p>
<ul>
	<li>
		<strong>Robust Platform:</strong> Develop a study tool that is not only powerful but also incredibly
		easy to use.
	</li>
	<li>
		<strong>Rapid and Accurate Content Generation:</strong> Utilize AI to produce high-quality, accurate
		study questions quickly.
	</li>
	<li>
		<strong>Personalized Learning:</strong> Maintain domain-specific expertise to ensure the content is
		tailored to your course and study habits.
	</li>
</ul>
<p>
	Feedback from our beta phase was critical in shaping these upgrades, ensuring that each new
	feature addresses real-world study challenges.
</p>
<h3>User Benefits</h3>
<ul>
	<li>
		<strong>Enhanced Efficiency:</strong> Experience faster load times and smoother interactions.
	</li>
	<li>
		<strong>Reliable Exam Preparation:</strong> Access a consistent and dependable exam module that simulates
		real test conditions.
	</li>
	<li>
		<strong>Cross-Device Continuity:</strong> Enjoy persistent saving across devices so you can pick up
		exactly where you left off.
	</li>
</ul>

<h2>Under the Hood: Upgrading Our Core Technologies</h2>
<h3>Svelte 5: Speed and Efficiency</h3>
<p>
	Upgrading from Svelte 4 to <strong>Svelte 5</strong> has dramatically improved the platform. Key benefits
	include:
</p>
<ul>
	<li>
		<strong>Faster Initial Load:</strong> Reduced waiting time when you first access the platform.
	</li>
	<li>
		<strong>Smoother Interactions:</strong> Enhanced responsiveness for a more fluid user experience.
	</li>
	<li>
		<strong>Improved Developer Experience:</strong> New features streamline the coding process, translating
		into quicker updates and bug fixes.
	</li>
</ul>

<p>LearnTerms Exam Module First Load Performance</p>
<p>Lower is better</p>

<p>Svelte 5 ~ 0.9 s</p>

<p>Svelte 4 ~ 3.4 s</p>

<p>
	The new Exam Module&#x27;s first load time sees a 75% improvement on average when comparing Svelte
	5 to Svelte 4.
</p>

<h3>daisyUI v5: A Fresh and Modern Look</h3>
<p>
	The new <strong>daisyUI v5</strong> update brings a modern, refined design to LearnTerms. Highlights
	include:
</p>
<ul>
	<li>
		<strong>Lean and Lightweight:</strong> The library is now 61% smaller and dependency-free.
	</li>
	<li>
		<strong>Enhanced Aesthetics:</strong> A cleaner, more mature look that still retains the playful essence
		of the original design.
	</li>
	<li>
		<strong>Quick Deployment:</strong> Simplifies the process of building and deploying new features,
		ensuring a consistent visual experience.
	</li>
</ul>

<img
	src="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOrIueSvlRSqTOnyANtE2Y4Fa91scRBu8mK7egZ"
	alt="old Daisy"
	loading="lazy"
	decoding="async"
/>

<img
	src="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOrIEi1vrRSqTOnyANtE2Y4Fa91scRBu8mK7egZ"
	alt="new D"
	loading="lazy"
	decoding="async"
/>

<h3>TailwindCSS 4.0: Performance and Modern Standards</h3>
<p>
	With the upgrade to <strong>TailwindCSS 4.0</strong>, we see:
</p>
<ul>
	<li>
		<strong>Faster Builds:</strong> Both full and incremental build times have significantly decreased.
	</li>
	<li>
		<strong>Optimized Styling:</strong> The high-performance engine ensures our custom styles load quickly
		and render beautifully.
	</li>
	<li>
		<strong>Modern Standards:</strong> Continued support for modern web standards enhances overall performance
		and compatibility.
	</li>
</ul>
<h4>Benchmark Comparison</h4>
<table>
	<thead>
		<tr>
			<th></th>
			<th>v3.4</th>
			<th>v4.0</th>
			<th>Improvement</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Full build</td>
			<td>378ms</td>
			<td>100ms</td>
			<td>3.78x</td>
		</tr>
		<tr>
			<td>Incremental rebuild with new CSS</td>
			<td>44ms</td>
			<td>5ms</td>
			<td>8.8x</td>
		</tr>
		<tr>
			<td>Incremental rebuild with no new CSS</td>
			<td>35ms</td>
			<td>192µs</td>
			<td>182x</td>
		</tr>
	</tbody>
</table>
<p>Lower numbers indicate better performance.</p>

<h2>Harnessing the Power of AI for Personalized Learning</h2>
<h3>Introduction to AI Integration</h3>
<p>
	LearnTerms v2 leverages advanced <strong>Large Language Models (LLMs)</strong> to generate personalized
	study questions quickly and accurately. By fine-tuning these models and utilizing effective prompt engineering,
	we ensure that every generated question is both relevant and accurate.
</p>
<h3>The AI Workflow</h3>
<ol>
	<li>
		<strong>Define the Task:</strong>
		<p>
			Clear instructions guide the model on what is expected. For example, a prompt might direct the
			model to generate diverse question types that challenge understanding and critical thinking.
		</p>
	</li>
	<li>
		<strong>Specify the Format:</strong>
		<p>We provide an exact format for the questions, including:</p>
		<ul>
			<li>A numbered question format</li>
			<li>Multiple-choice options</li>
			<li>A rationale section that details why certain options are correct or incorrect</li>
		</ul>
		<p>Example Prompt Block:</p>
		<pre>
&quot;You are a pharmacology expert tasked with creating diverse question types
to help students master clinically relevant material. Generate 10 questions
based on the provided material. The questions should challenge understanding,
application, and critical thinking. Make sure that some questions have
multiple answers.&quot;
            </pre>
	</li>
	<li>
		<strong>Provide the Content:</strong>
		<p>
			The model receives a comprehensive &quot;context dump&quot; of relevant material—from textbook
			excerpts to lecture notes—ensuring it has the necessary information to generate high-quality
			questions.
		</p>
	</li>
</ol>
<h3>Validation Process</h3>
<p>
	After the questions are generated, a secondary AI validation step checks the accuracy and logic of
	each question. With an accuracy rate of approximately <strong>95%</strong>, only about 5 out of
	every 100 questions may need revision. This dual-layered approach guarantees reliable study
	materials.
</p>

<h2>Building the Exam Module: Features &amp; Benefits</h2>
<h3>Overview of the Exam Module</h3>
<p>
	The <strong>Exam Module</strong> is designed to replicate the experience of ExamSoft while integrating
	modern features inspired by user feedback. This module is at the heart of LearnTerms v2 and is built
	to provide a comprehensive exam preparation experience.
</p>
<h3>Core Features</h3>
<ul>
	<li>
		<strong>Shuffle Questions:</strong> Randomizes the order of questions to prevent memorization and
		promote genuine understanding.
	</li>
	<li>
		<strong>Flag &amp; Focus:</strong> Allows you to mark challenging questions and quickly filter to
		review only flagged or incomplete questions.
	</li>
	<li>
		<strong>Eliminate Choices:</strong> Helps mimic the process of elimination used in actual exams by
		allowing you to cross out clearly incorrect answers.
	</li>
	<li>
		<strong>Progress Tracking:</strong> Automatically saves your progress in real time, enabling seamless
		cross-device study sessions.
	</li>
	<li>
		<strong>Keyboard Shortcuts:</strong> Use intuitive shortcuts (like Tab for solutions and arrow keys
		for navigation) to speed up your study sessions.
	</li>
</ul>
<h3>User Experience</h3>
<p>
	Together, these features create a reliable, engaging, and personalized exam prep space. Whether
	you&#x27;re reviewing for a final exam or conducting group study sessions, the Exam Module ensures
	you can practice efficiently and effectively.
</p>

<h2>Study Smarter, Not Harder: Impact on Your Learning</h2>
<h3>Personalization &amp; Efficiency</h3>
<p>
	LearnTerms v2 is designed to adapt to your unique study habits. With AI-powered question
	generation, persistent progress saving, and a user-centric interface, you can focus on what
	matters most—mastering the material.
</p>
<h3>Real-World Outcomes</h3>
<ul>
	<li>
		<strong>Enhanced Confidence:</strong> Familiarity with a consistent and reliable exam simulation can
		boost your confidence on test day.
	</li>
	<li>
		<strong>Improved Performance:</strong> Regular practice with tailored questions leads to deeper understanding
		and better exam results.
	</li>
	<li>
		<strong>Reduced Anxiety:</strong> With tools like progress tracking and the ability to reset your
		practice sessions, you can manage your study load and reduce pre-exam stress.
	</li>
</ul>

<h2>Conclusion &amp; Future Directions</h2>
<p>
	LearnTerms v2 is a significant leap forward in exam preparation technology. By addressing the
	limitations of the original version, upgrading our core technologies, and integrating advanced AI,
	we have created a platform that is faster, smarter, and more reliable.
</p>
<h3>Looking Ahead</h3>
<p>
	As we continue to refine the platform, expect even more features designed to personalize and
	improve your study experience. Together, we&#x27;ll redefine what it means to study smarter, not
	harder.
</p>
<p>
	In conclusion, LearnTerms v2 represents a significant leap forward in exam preparation for our
	class. By building on the success and addressing the limitations of its predecessor, LearnTerms v2
	offers a robust, reliable, and user-friendly platform powered by cutting-edge technologies like
	Svelte 5, daisyUI v5, and TailwindCSS 4.0. The integration of AI for content creation streamlines
	the generation of accurate and efficient study materials, personalized to the specific needs of
	the curriculum. With the Exam Module, students can now study smarter, not harder, utilizing tools
	designed to replicate the exam environment, track progress, and reinforce learning. LearnTerms v2
	aims to become an indispensable tool, helping you study well and feel good about it!
</p>

<h2>Appendices</h2>
<p>
	For those interested in the deeper technical aspects, we offer additional documentation on our
	performance benchmarks, code snippets, and configuration details. Head over to the project <a
		href="https://github.com/jdang00/learnterms/tree/main"
		rel="noopener noreferrer">GitHub</a
	> to view the project&#x27;s codebase and contribute to its development.
</p>

<h3>Special Thanks</h3>
<p>
	Thank you for reading about everything we&#x27;ve been working on since mid December. It&#x27;s
	been a labor of love and just as much as I want it to help me, I really want it to enable you to
	be the best future doctors possible. Finally, I want to give my thanks to the following people for
	special contributions they&#x27;ve made to the project. Without them, my work would have been that
	much harder.
</p>
<ul>
	<li>
		✨ Thank you Brayden and Collin for their direct contribution to the content and codebase.
		Working with you gentlemen has made the site a pleasure to use for everyone.
	</li>
	<li>
		✨ Thanks to Kaity and Sophie for accurately reporting on errors and bugs from week to week, as
		well as providing study material to train the AI pipeline.
	</li>
	<li>
		✨ Thanks to Colby and Austin for case testing the platform in real time during the beta period.
		This natural interaction helped me dial in the typical user interaction.
	</li>
	<li>
		✨ Thanks to Cooper, Nate, Ethan, and Eric for helping bridge the gap between practice and
		quizzes.
	</li>
</ul>
<p>Much thanks,</p>
<p>JD</p>
