<h1>LearnTerms Generation Models</h1>
<p class="text-base-content/70 mt-2">Understanding LearnTerms' intelligent question generation models and their specialized focus areas.</p>

<h2>What are LearnTerms Generation Models?</h2>
<p>
	The LearnTerms question generation models are part of the <strong>Swift family</strong>, our custom-built layer on top of
	cutting-edge AI infrastructure. When we first started generating questions, we quickly realized that
	raw model outputs weren’t enough - students needed reliability, focus, and alignment with their courses.
	From those learnings, we designed a system that guides the AI with domain expertise, exam structure,
	and educational context. This approach makes the Swift models more than just language models - they’re
	purpose-built engines for learning.
</p>
<p>
	This layer uses a sophisticated model system that abstracts away the complexity of AI language models
	while providing specialized question generation tailored to different academic disciplines. Instead of
	exposing raw model names, we present you with intuitive, purpose-built options.
</p>

<h2 class="mt-10">Available Models</h2>

<div class="overflow-x-auto mt-4">
	<div class="rounded-box border border-base-300 bg-base-100">
	<table class="table table-lg w-full">
		<thead>
			<tr>
				<th class="text-base">Model</th>
				<th class="text-base">Focus</th>
				<th class="text-base">Best For</th>
				<th class="text-base">Features</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code class="font-mono bg-base-200 px-2 py-1 rounded">swift-general</code></td>
				<td>General health sciences</td>
				<td>Mixed content, interdisciplinary topics</td>
				<td>
					<div class="flex flex-wrap gap-2">
						<span class="badge badge-outline">Balanced</span>
						<span class="badge badge-outline">Wide scope</span>
					</div>
				</td>
			</tr>
			<tr>
				<td><code class="font-mono bg-base-200 px-2 py-1 rounded">swift-optometry</code></td>
				<td>Ocular and vision science</td>
				<td>Ophthalmology, eye care, vision</td>
				<td>
					<div class="flex flex-wrap gap-2">
						<span class="badge badge-outline">Ocular focus</span>
						<span class="badge badge-outline">Vision science</span>
					</div>
				</td>
			</tr>
			<tr>
				<td><code class="font-mono bg-base-200 px-2 py-1 rounded">swift-pharmacy</code></td>
				<td>Pharmacology and therapeutics</td>
				<td>Drug mechanisms, patient care</td>
				<td>
					<div class="flex flex-wrap gap-2">
						<span class="badge badge-outline">Pharmacotherapy</span>
						<span class="badge badge-outline">Clinical focus</span>
					</div>
				</td>
			</tr>
		</tbody>
	</table>
	</div>
</div>

<h2 class="mt-10">How They Work</h2>
<p>
	Each LearnTerms model is a carefully crafted combination of:
</p>
<ul>
	<li><strong>Base AI Model:</strong> Powered by Google's Gemini Pro for reliable, high-quality output</li>
	<li><strong>Specialized Focus:</strong> Domain-specific prompting that emphasizes relevant concepts</li>
	<li><strong>Question Design:</strong> Tailored to your field's learning objectives and exam patterns</li>
</ul>

<h2 class="mt-10">Model Selection</h2>
<p>
	When generating questions, you can choose the model that best fits your current study needs:
</p>

<div class="alert alert-info my-6">
	<div>
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
		</svg>
		<span>
			<strong>Pro Tip:</strong> Use the model that matches your current course or study focus for the most relevant questions.
		</span>
	</div>
</div>

<h3 class="mt-10">When to Use Each Model</h3>

<h4 class="mt-6"><code class="font-mono bg-base-200 px-2 py-1 rounded">swift-general</code></h4>
<ul>
	<li>General health sciences courses</li>
	<li>Mixed content or interdisciplinary topics</li>
	<li>When you want balanced, comprehensive questions</li>
</ul>

<h4 class="mt-6"><code class="font-mono bg-base-200 px-2 py-1 rounded">swift-optometry</code></h4>
<ul>
	<li>Ophthalmology and vision science</li>
	<li>Eye anatomy and physiology</li>
	<li>Clinical optometry practice</li>
</ul>

<h4 class="mt-6"><code class="font-mono bg-base-200 px-2 py-1 rounded">swift-pharmacy</code></h4>
<ul>
	<li>Pharmacology and therapeutics</li>
	<li>Drug mechanisms and interactions</li>
	<li>Clinical pharmacy practice</li>
</ul>

<h2 class="mt-10">Advanced Customization</h2>
<p>
	Beyond model selection, you can further customize question generation with:
</p>

<div class="grid gap-3 my-4">
	<div class="flex items-center gap-3">
		<div class="w-2 h-2 bg-primary rounded-full"></div>
		<span><strong>Custom Prompts:</strong> Add specific guidance for the model (e.g., "emphasize ocular pharmacology")</span>
	</div>
	<div class="flex items-center gap-3">
		<div class="w-2 h-2 bg-primary rounded-full"></div>
		<span><strong>Question Count:</strong> Generate 5, 10, or 15 questions at once</span>
	</div>
	<div class="flex items-center gap-3">
		<div class="w-2 h-2 bg-primary rounded-full"></div>
		<span><strong>Content Focus:</strong> Questions automatically align with your selected model's specialization</span>
	</div>
</div>

<h2 class="mt-10">Behind the Scenes</h2>
<p>
	LearnTerms automatically handles the complexity of:
</p>
<ul>
	<li>Model selection and optimization</li>
	<li>Prompt engineering for your field</li>
	<li>Quality assurance and validation</li>
	<li>Consistent question formatting</li>
</ul>

<p>
	This means you can focus on studying while we ensure you get the most relevant, high-quality questions for your learning goals.
</p>

<div class="alert alert-success my-8">
	<div>
		<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<span>
			<strong>Ready to get started?</strong> Head to the Question Studio to try out different LearnTerms models with your own content.
		</span>
	</div>
</div>
