<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
</script>

<h1>LearnTerms Generation Models</h1>
<p class="text-foreground/70 mt-2">
	Understanding LearnTerms' intelligent question generation models and their specialized focus
	areas.
</p>

<h2>What are LearnTerms Generation Models?</h2>
<p>
	The LearnTerms question generation models are part of the <strong>Swift family</strong>, our
	custom-built layer on top of cutting-edge AI infrastructure. When we first started generating
	questions, we quickly realized that raw model outputs weren’t enough - students needed
	reliability, focus, and alignment with their courses. From those learnings, we designed a system
	that guides the AI with domain expertise, exam structure, and educational context. This approach
	makes the Swift models more than just language models - they’re purpose-built engines for
	learning.
</p>
<p>
	This layer uses a sophisticated model system that abstracts away the complexity of AI language
	models while providing specialized question generation tailored to different academic disciplines.
	Instead of exposing raw model names, we present you with intuitive, purpose-built options.
</p>

<h2 class="mt-10">Available Models</h2>

<div class="mt-4">
	<div class="overflow-hidden surface">
		<Table.Root class="text-base">
			<Table.Header>
				<Table.Row>
					<Table.Head class="text-base">Model</Table.Head>
					<Table.Head class="text-base">Focus</Table.Head>
					<Table.Head class="text-base">Best For</Table.Head>
					<Table.Head class="text-base">Features</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				<Table.Row>
					<Table.Cell
						><code class="font-mono bg-muted px-2 py-1 rounded-sm">swift-general</code></Table.Cell
					>
					<Table.Cell>General health sciences</Table.Cell>
					<Table.Cell>Mixed content, interdisciplinary topics</Table.Cell>
					<Table.Cell>
						<div class="flex flex-wrap gap-2">
							<Badge variant="outline">Balanced</Badge>
							<Badge variant="outline">Wide scope</Badge>
						</div>
					</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell
						><code class="font-mono bg-muted px-2 py-1 rounded-sm">swift-optometry</code
						></Table.Cell
					>
					<Table.Cell>Ocular and vision science</Table.Cell>
					<Table.Cell>Ophthalmology, eye care, vision</Table.Cell>
					<Table.Cell>
						<div class="flex flex-wrap gap-2">
							<Badge variant="outline">Ocular focus</Badge>
							<Badge variant="outline">Vision science</Badge>
						</div>
					</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell
						><code class="font-mono bg-muted px-2 py-1 rounded-sm">swift-pharmacy</code></Table.Cell
					>
					<Table.Cell>Pharmacology and therapeutics</Table.Cell>
					<Table.Cell>Drug mechanisms, patient care</Table.Cell>
					<Table.Cell>
						<div class="flex flex-wrap gap-2">
							<Badge variant="outline">Pharmacotherapy</Badge>
							<Badge variant="outline">Clinical focus</Badge>
						</div>
					</Table.Cell>
				</Table.Row>
			</Table.Body>
		</Table.Root>
	</div>
</div>

<h2 class="mt-10">How They Work</h2>
<p>Each LearnTerms model is a carefully crafted combination of:</p>
<ul>
	<li>
		<strong>Base AI Model:</strong> Powered by the current RAG-backed model stack for reliable, high-quality
		output
	</li>
	<li>
		<strong>Specialized Focus:</strong> Domain-specific prompting that emphasizes relevant concepts
	</li>
	<li>
		<strong>Question Design:</strong> Tailored to your field's learning objectives and exam patterns
	</li>
</ul>

<h2 class="mt-10">Model Selection</h2>
<p>When generating questions, you can choose the model that best fits your current study needs:</p>

<Alert.Root tone="info" class="my-6" role={undefined}>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		class="stroke-current shrink-0 w-6 h-6"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
		></path>
	</svg>
	<span>
		<strong>Pro Tip:</strong> Use the model that matches your current course or study focus for the most
		relevant questions.
	</span>
</Alert.Root>

<h3 class="mt-10">When to Use Each Model</h3>

<h4 class="mt-6"><code class="font-mono bg-muted px-2 py-1 rounded-sm">swift-general</code></h4>
<ul>
	<li>General health sciences courses</li>
	<li>Mixed content or interdisciplinary topics</li>
	<li>When you want balanced, comprehensive questions</li>
</ul>

<h4 class="mt-6">
	<code class="font-mono bg-muted px-2 py-1 rounded-sm">swift-optometry</code>
</h4>
<ul>
	<li>Ophthalmology and vision science</li>
	<li>Eye anatomy and physiology</li>
	<li>Clinical optometry practice</li>
</ul>

<h4 class="mt-6"><code class="font-mono bg-muted px-2 py-1 rounded-sm">swift-pharmacy</code></h4>
<ul>
	<li>Pharmacology and therapeutics</li>
	<li>Drug mechanisms and interactions</li>
	<li>Clinical pharmacy practice</li>
</ul>

<h2 class="mt-10">Advanced Customization</h2>
<p>Beyond model selection, you can further customize question generation with:</p>

<div class="grid gap-3 my-4">
	<div class="flex items-center gap-3">
		<div class="w-2 h-2 bg-primary rounded-full"></div>
		<span
			><strong>Custom Prompts:</strong> Add specific guidance for the model (e.g., "emphasize ocular pharmacology")</span
		>
	</div>
	<div class="flex items-center gap-3">
		<div class="w-2 h-2 bg-primary rounded-full"></div>
		<span><strong>Question Count:</strong> Generate 5, 10, or 15 questions at once</span>
	</div>
	<div class="flex items-center gap-3">
		<div class="w-2 h-2 bg-primary rounded-full"></div>
		<span
			><strong>Content Focus:</strong> Questions automatically align with your selected model's specialization</span
		>
	</div>
</div>

<h2 class="mt-10">Behind the Scenes</h2>
<p>LearnTerms automatically handles the complexity of:</p>
<ul>
	<li>Model selection and optimization</li>
	<li>Prompt engineering for your field</li>
	<li>Quality assurance and validation</li>
	<li>Consistent question formatting</li>
</ul>

<p>
	This means you can focus on studying while we ensure you get the most relevant, high-quality
	questions for your learning goals.
</p>

<Alert.Root tone="success" class="my-8" role={undefined}>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="stroke-current shrink-0 h-6 w-6"
		fill="none"
		viewBox="0 0 24 24"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
		/>
	</svg>
	<span>
		<strong>Ready to get started?</strong> Head to the Question Studio to try out different LearnTerms
		models with your own content.
	</span>
</Alert.Root>
