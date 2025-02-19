<div class="mt-10 flex min-h-screen w-full flex-col items-center justify-between p-8">
	<div class="w-full max-w-3xl">
		<div class="flex flex-col flex-wrap justify-between">
			<h1 class="text-4xl font-bold">LearnTerms v2</h1>
			<span>18 February 2024</span>

			<div class="mt-8 flex flex-row flex-wrap gap-6">
				<a href="https://www.justindang.dev/" target="_blank">
					<div class="avatar">
						<div class="ring-primary ring-offset-base-100 w-14 rounded-full ring ring-offset-2">
							<img
								src="https://utfs.io/f/DYlXFqnaImOrNYQ0L9zP0UTz89wOGJKi17DasVtufbylgkQF"
								alt="Justin Dang"
							/>
						</div>
					</div>
				</a>
				<div class="flex flex-col text-sm">
					<div class="font-semibold">Justin A. Dang</div>
					<div class="text-base-content">NSU Oklahoma College of Optometry</div>
					<div class="text-base-content">Class of 2028</div>
				</div>
			</div>
		</div>
		<div class="divider"></div>

		<div class="space-y-4">
			<p>The future of our exam prep is here: LearnTerms v2 has officially arrived!</p>
			<p>
				Our vision for LearnTerms is clear: to become the go-to study platform for optometry
				students at NSUOCO. Back in January, we launched a beta phase, introducing three core
				features designed to make studying hyper-efficient. Since then, we've been hard at work
				refining and perfecting these tools based on your invaluable feedback.
			</p>
			<p>Now, they're ready for prime time.</p>
			<p>
				In this post, we'll dive deep into these powerful features, exploring their development,
				their unique capabilities, and, most importantly, how you can leverage them to maximize your
				study time and achieve that A. Get ready to unlock a new level of exam success with
				LearnTerms v2.
			</p>

			<h3 class="font-bold text-2xl mt-12">The Problem</h3>
			<p>
				LearnTerms began as a focused solution, addressing a specific challenge within a single
				course. This laser focus proved advantageous: it allowed us to concentrate our engineering
				efforts, fill a niche unmet by existing methods, and create a lightweight, user-friendly
				service with minimal barriers to entry. We wanted to build upon these core principles and
				elevate the platform even further.
			</p>
			<p>
				The previous version, while effective, had limitations: its scope was confined to a single
				class, and maintaining accuracy required significant manual effort. I personally spent
				countless hours manually verifying terms for both accuracy and for the LENs ranked list.
				LearnTerms v2 directly addresses these challenges while staying true to the essence of what
				made the original so successful.
			</p>

			<p>Our objectives for v2 were clear:</p>
			<ul class="m-8 mt-4">
				<li>Build a robust and reliable study platform that remains incredibly easy to use.</li>
				<li>Create study content that is accurate, efficient, and rapidly generated.</li>
				<li>
					Maintain domain-specific expertise and a personalized understanding of course content.
				</li>
			</ul>
			<p>
				Achieving our vision for LearnTerms v2 was no small feat. On the engineering side, it
				required a significant investment of time and resources. To ensure a smooth rollout, we're
				initially testing these new technologies within a single class this semester. This allows us
				to build a solid foundation, learn valuable lessons, and adapt the platform for any content
				within the curriculum.
			</p>
			<p>
				Our first objective – building a robust and reliable study platform – starts with a
				beautiful and responsive interface. Think of it as the foundation of a well-designed house.
				To achieve this, we needed to ensure that the interface was seamlessly connected to stable
				and lightning-fast data streams. This involved significant optimizations to how we store our
				questions (the database) and how we access them to display them on your device (the API).
				These improvements mean faster loading times and a smoother overall experience for you.
			</p>
			<p>
				Finally, we've implemented persistent saving across the entire site. This means your
				progress on all features is automatically saved, allowing you to log in and access your
				content from any device with an internet connection. This was a highly appreciated feature
				in the previous version, and we've made sure it's even more reliable and seamless this time
				around.
			</p>

			<h3 class="font-bold text-2xl mt-12">Under the Hood: Upgrading Our Core Technologies</h3>
			<p>
				To create this responsive and user-friendly experience, we've upgraded the core technologies
				that power LearnTerms. This includes major new versions of our site coding framework (Svelte
				5), our web component library (daisyUI v5), and our styling framework (TailwindCSS 3). Each
				of these components contributes to a faster, lighter, and more responsive site on your
				device.
			</p>

			<h4 class="font-bold text-xl mt-6">Svelte 5: Speed and Efficiency</h4>
			<p>
				Last semester, LearnTerms was built using Svelte 4, which allowed us to develop features and
				components incredibly quickly. One of the advantages of using a framework like Svelte,
				compared to more traditional tools like React or Angular, is its focus on optimizing for
				speed while building interactive websites. With the upgrade to Svelte 5, the initial loading
				time and the responsiveness of interactions have been significantly improved. Behind the
				scenes, the developer experience has also been drastically enhanced, thanks to new features
				that streamline the coding process.
			</p>

			<div class="border-2 p-8 border-base-content/50 rounded-xl mt-12">
				<p class="text-base-content/70 mt-8 text-xl font-medium">
					LearnTerms Exam Module First Load Performance
				</p>
				<p class="text-base-content/40 text-sm">Lower is better</p>
				<div class="flex flex-col space-y-4 my-12">
					<progress class="progress progress-success" value="0.9" max="5"></progress>
					<p class="italic text-base-content/50">Svelte 5 ~ 0.9 s</p>
					<progress class="progress progress-success" value="3.4" max="5"></progress>
					<p class="italic text-base-content/50">Svelte 4 ~ 3.4 s</p>
				</div>
			</div>
			<p class="italic text-base-content/60 mb-12 justify-self-center text-sm">
				The new Exam Module's first load time sees a 75% improvement on average when comparing
				Svelte 5 to Svelte 4.
			</p>

			<h4 class="font-bold text-xl mt-6">daisyUI v5: A Fresh and Modern Look</h4>
			<p>
				The original goal of LearnTerms wasn't necessarily to be the prettiest platform, but to
				deliver a great study experience for your exams. However, we knew it had to look good by
				default. That's why we chose daisyUI, an off-the-shelf component library that works
				seamlessly with our styling framework, Tailwind. When building a product, you ideally want
				to customize every detail, from button colors to styles and placement. But the default look
				of daisyUI made it incredibly easy to quickly build and deploy new features. As a result,
				we've greatly benefited from the improvements made in daisyUI v5. The library now has zero
				dependencies and is 61% smaller in size, resulting in faster loading times. The new color
				variables and design system improvements made it a breeze to give LearnTerms a fresh
				makeover. Where the interface previously looked playful and helpful, with a unique flair of
				color, it now has a more mature and refined look while retaining the original DNA that made
				it so special. The new interface is designed for speed and quick interactions while
				providing helpful hints about all the powerful tools under the hood.
			</p>

			<figure class="diff aspect-16/9 my-16" tabindex="-1">
				<div class="diff-item-1" role="img">
					<img
						alt="old Daisy"
						src="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOrIueSvlRSqTOnyANtE2Y4Fa91scRBu8mK7egZ"
					/>
				</div>
				<div class="diff-item-2" role="img" tabindex="-1">
					<img
						alt="new D"
						src="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOrIEi1vrRSqTOnyANtE2Y4Fa91scRBu8mK7egZ"
					/>
				</div>
				<div class="diff-resizer"></div>
			</figure>

			<h4 class="font-bold text-xl mt-6">TailwindCSS 4.0: Performance and Modern Standards</h4>
			<p>
				When it comes to styling beyond the defaults provided by daisyUI, we turn to TailwindCSS
				4.0. Like Svelte 5, this was a ground-up rewrite that features a new high-performance
				engine. We appreciate the performance gains and the fact that daisyUI works natively with
				it. While the full scope of enhancements is difficult to quantify for our specific use case,
				the faster full and incremental builds, combined with our component library, and our
				commitment to keeping up with modern web standards are all supported by TailwindCSS 4.0.
			</p>

			<div class="overflow-x-auto">
				<table class="table">
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
			</div>

			<p class="italic text-base-content/60 mb-12 justify-self-center text-sm">
				Tailwind benchmarks using Catalyst, the TailwindCSS UI kit.
			</p>

			<div class="divider"></div>
			<p class="mt-8">
				Now, let's talk about how we're revolutionizing content creation for your studying. In the
				past, creating the terms for Intro to Optometry involved a lot of manual labor. We'd use OCR
				and clever scripting to extract terms from workbooks, but the validation and accuracy checks
				took a significant amount of time. And, without fail, every week someone would report a
				mistake, requiring me to dive back in and fix it. To create study material that is
				efficient, accurate, and generated in a reasonable amount of time, we turned to artificial
				intelligence as the solution.
			</p>

			<h3 class="font-bold text-2xl mt-12">Harnessing the Power of AI for Personalized Learning</h3>
			<p>
				Large language models (LLMs) are the foundation of services you use every day, like ChatGPT.
				Their strength lies in their ability to generate content quickly while maintaining a high
				degree of accuracy. By fine-tuning these models and using a technique called prompt
				engineering, we can get them to behave exactly as we want.
			</p>
			<p>The idea is simple, yet powerful:</p>
			<p>
				1. Define the task: We start by clearly instructing the model on what we want it to do. For
				example:
			</p>

			<div class="bg-base-300 w-full font-mono text-base-content p-8 rounded-xl">
				“You are a pharmacology expert tasked with creating diverse question types to help students
				master clinically relevant material. Generate 10 questions based on the provided material.
				The questions should challenge understanding, application, and critical thinking. Make sure
				that some questions have multiple answers to maximize yield of information.“
			</div>
			<p>
				2. Specify the format: Next, we provide the model with the exact format we want the question
				to be in, including an example. For example:
			</p>
			<div class="bg-base-300 w-full font-mono text-base-content p-8 rounded-xl">
				<p>### Instructions:</p>
				<p>Use the following structure for formatting:</p>
				<p>Question [#]: [Insert the question text here.]</p>
				<br />
				<p>Options:</p>
				<p>A. [Insert Option A]</p>
				<p>B. [Insert Option B]</p>
				<p>C. [Insert Option C]</p>
				<p>D. [Insert Option D]</p>
				<p>E. [Insert Option E]</p>
				<br />
				<p>Correct Answers: [List correct options, e.g., A, C, D]</p>
				<p>
					Explanation: [Explain why each correct option is correct and each incorrect option is
					incorrect.]
				</p>
				<br />

				<p>### Example:</p>
				<p>
					Material: ACE inhibitors are commonly used to treat hypertension. They also have
					protective effects on the kidneys in diabetic patients but may cause a dry cough as a side
					effect. Common drugs include lisinopril and enalapril.
				</p>
				<p>Output:</p>
				<p>
					Question: A patient with diabetes and hypertension is being considered for ACE inhibitor
					therapy. Which of the following statements are true regarding ACE inhibitors in this
					context?
				</p>
				<p>Options:</p>
				<p>A. They can help protect kidney function in diabetic patients.</p>
				<p>B. They are contraindicated in patients with diabetes.</p>
				<p>C. A potential side effect is a dry cough.</p>
				<p>D. They are ineffective in treating hypertension in diabetic patients.</p>
				<p>E. Lisinopril and enalapril are examples of ACE inhibitors.</p>
				<p>Correct Answers: A,C,E</p>
				<p>
					Explanation: ACE inhibitors treat hypertension, can cause a dry cough, and include drugs
					like lisinopril and enalapril. However, they do not cause hyperkalemia in all patients and
					are not contraindicated in all diabetics.
				</p>
			</div>
			<p>
				3. Provide the content: Finally, we give the model a "context dump," meaning all the
				material we want it to use to generate questions. This might be a paragraph from a textbook,
				a slide from a lecture, or a set of notes. For example:
			</p>

			<div class="bg-base-300 w-full font-mono text-base-content p-8 rounded-xl">
				Amantadine was developed as an anti-influenza drug (prevents viral shedding) but is now used
				as a Parkinson’s drug to help prevent dyskinesia (involuntary movements). ## HIV/AIDS drugs
				These drugs are usually reverse transcriptase inhibitors (can be nucleotide analogs or non-
				nucleotide drugs that bind the enzyme) that prevent viral RNA from copying into DNA or
				integrase inhibitors that inhibit viral DNA from inserting into the host genome. Tenofovir,
				emtricitabine, and efavirenz are all examples of RTIs – reverse transcriptase inhibitors.
				Tenofovir is the backbone to many HIV drugs and is also used for Hepatitis B. Dolutegravir,
				elvitegravir, and raltegravir are integrase inhibitors. Descovy – emtricitabine and
				tenofovir – is approved for PrEP therapy (pre-exposure prophylaxis) Remdesivir is an IV drug
				that is a ribonucleotide analogue inhibitor of viral RNA polymerase.
			</div>
			<p>
				The model then takes this prompt and analyzes the material to generate relevant questions.
				From there, it's a matter of tuning the model based on its outputs and formatting the
				questions for our question bank.
			</p>

			<h3 class="font-bold text-2xl mt-12">From Prompt to Publish: A Streamlined Workflow</h3>
			<p>
				With a sophisticated automated workflow, we can generate 100+ questions in about 10 minutes
				from prompt to publish. But we don't stop there. To ensure accuracy, these questions also
				undergo a validation step by another, smaller AI model. This model simply checks to see if
				the information is accurate and makes sense.
			</p>
			<p></p>
			<p>
				Through rigorous testing, we've achieved an accuracy rate of approximately 95%, meaning only
				about 5 out of 100 questions are potentially flawed. This is a remarkable margin,
				considering the inherent unpredictability of some AI models. We chose GPT-4o for its
				superior comprehension abilities and cost-effectiveness.
			</p>

			<h4 class="font-bold text-xl mt-6">Domain-Specific Expertise: Understanding Your Content</h4>

			<p>
				To fulfill our final objective, we wanted to ensure that the AI truly understands the
				specific domain it's operating in – in other words, your course content. This principle
				stems from the idea of not wanting to reinvent the wheel. There are countless sites that can
				generate study material and questions on various topics. What makes our system special is
				that it actually understands and evolves to the way you study and how your exams are
				structured.
			</p>
			<p>
				This starts with a vector database, a specialized way of storing our notes, slides, and
				other content so that the AI can easily access and retrieve relevant information. We then
				use a process called embedding to return the most relevant information for question
				generation.
			</p>
			<p>
				The model is aware of question styles, key concepts, and specific topics to be quizzed on.
				This is how we can generate questions that are specifically "pick 3" or that focus on topics
				directly relevant to your course. This level of personalization and domain-specific
				understanding is what sets LearnTerms apart from anything else currently available."
			</p>
			<p></p>
			<p></p>
			<p></p>
			<p></p>
			<p></p>
			<p></p>
			<p></p>
		</div>
	</div>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>
