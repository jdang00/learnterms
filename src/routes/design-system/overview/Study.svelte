<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { Id } from '../../../convex/_generated/dataModel';
	import type { ClassWithSemester } from '#lib/types.js';
	import type { ClassOverview, ModuleProgressSummary } from '#lib/utils/classProgress.js';
	import type { StudyEvidence } from '#lib/utils/studyMastery.js';
	import { summarizeModule } from '#lib/utils/moduleCompletion.js';
	import AcceptanceMeter from '#lib/components/AcceptanceMeter.svelte';
	import BadgeShield from '#lib/components/badges/BadgeShield.svelte';
	import { getBadgeIcon } from '#lib/components/badges/icons.js';
	import ClassCard from '#lib/components/ClassCard.svelte';
	import ModuleProgress from '#lib/components/ModuleProgress.svelte';
	import ModuleRow from '#lib/components/ModuleRow.svelte';
	import ProgressRing from '#lib/components/ProgressRing.svelte';
	import { showcases } from '../showcases';
	import Category from './Category.svelte';
	import Spec from './Spec.svelte';

	type Module = {
		_id: Id<'module'>;
		title: string;
		emoji: string;
		progress: ModuleProgressSummary;
	};
	const modules: Module[] = [
		{
			_id: 'm1',
			title: 'Lids & Adnexa',
			emoji: '👁️',
			progress: { total: 32, answered: 32, mastered: 32, flagged: 0 }
		},
		{
			_id: 'm2',
			title: 'Corneal Topography',
			emoji: '🗺️',
			progress: { total: 48, answered: 30, mastered: 12, flagged: 3 }
		},
		{
			_id: 'm3',
			title: 'Uveitis',
			emoji: '🔥',
			progress: { total: 21, answered: 0, mastered: 0, flagged: 0 }
		},
		{
			_id: 'm4',
			title: 'Binocular Vision',
			emoji: '👀',
			progress: { total: 0, answered: 0, mastered: 0, flagged: 0 }
		}
	].map((m) => ({ ...m, _id: m._id as Id<'module'> }));

	// Fixture classes: only the fields the card reads.
	const classes = [
		{
			item: {
				_id: 'c-optics',
				code: 'OPT 4234',
				name: 'Clinical Optics II',
				description: 'Refraction, aberrations and lens design. Modules follow the lecture order.',
				semester: { _id: 's1', name: 'Fall 2026' }
			},
			modules: [...modules, ...modules.slice(0, 3)]
		},
		{
			item: {
				_id: 'c-pharm',
				code: 'OPT 5110',
				name: 'Ocular Pharmacology',
				description: 'Drugs of the anterior segment.',
				semester: { _id: 's1', name: 'Fall 2026' }
			},
			modules: modules.slice(2, 3)
		}
	].map(({ item, modules }) => ({
		classItem: item as unknown as ClassWithSemester,
		progress: {
			classId: item._id,
			modules: modules.map((m, i) => ({ ...m.progress, moduleId: `${m._id}-${i}`, emoji: m.emoji }))
		} as unknown as ClassOverview
	}));

	// A 24-question module: 6 mastered, 8 correct, 4 to review, the rest untouched.
	const questions = Array.from({ length: 24 }, (_, i) => ({
		_id: `q${i}` as Id<'question'>,
		type: 'multiple_choice' as const,
		options: [],
		correctAnswers: []
	}));
	const evidence: Record<string, StudyEvidence> = Object.fromEntries(
		questions.slice(0, 18).map((q, i) => [
			q._id,
			{
				questionId: q._id,
				checkedAt: 1,
				latestCorrect: i < 14,
				cleanRecallCount: i < 6 ? 2 : 1,
				...(i < 6 ? { masteredAt: 1 } : {})
			}
		])
	);
	const summary = summarizeModule(questions, evidence, ['q15', 'q20']);

	const badges = [
		['Study Streak', 'flame', '#f97316', { from: '#fb923c', mid: '#f97316', to: '#ea580c' }],
		['Early Bird', 'sunrise', '#eab308', { from: '#fde047', mid: '#eab308', to: '#ca8a04' }],
		['Night Owl', 'moon', '#a78bfa', { from: '#c4b5fd', mid: '#8b5cf6', to: '#6d28d9' }],
		['Question Creator', 'lightbulb', '#0ea5e9', { from: '#38bdf8', mid: '#0ea5e9', to: '#0284c7' }]
	] as const;
</script>

<Category
	id="study"
	summary="The pieces students see every day. Green is correct, deep green is mastered, soft red is to review."
>
	<Spec
		title="Class cards"
		src={['ClassCard', 'ColorMark']}
		note="The classes page. The grid is one cell per module."
		wide
	>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each classes as { classItem, progress } (classItem._id)}
				<ClassCard {classItem} {progress} onSelect={() => {}} />
			{/each}
		</div>
	</Spec>

	<Spec title="Module rows" src="ModuleRow" note="Mastered, started, new and empty." wide>
		<ol class="space-y-2">
			{#each modules as module, i (module._id)}
				<li>
					<ModuleRow
						module={{ ...module, questionCount: module.progress.total }}
						classId={'c-optics' as Id<'class'>}
						position={i + 1}
						progress={module.progress}
					/>
				</li>
			{/each}
		</ol>
	</Spec>

	<Spec
		title="Module progress"
		src={['ModuleProgress', 'ProgressRing']}
		note="The quiz sidebar summary, and the ring in the phone header."
	>
		<ModuleProgress {summary} currentId="q18" onclick={() => {}} onreset={() => {}} />
		<div class="mt-5 flex items-center gap-4">
			<ProgressRing correct={58} review={17} label={75} />
			<ProgressRing correct={100} review={0} label={100} />
			<ProgressRing correct={0} review={0} label={0} />
		</div>
	</Spec>

	<Spec
		title="Badges"
		src={['BadgeShield', 'getBadgeIcon()']}
		note="The badge catalog and award modal."
	>
		<div class="flex flex-wrap justify-center gap-4">
			{#each badges as [name, icon, iconColor, gradient] (name)}
				<figure class="flex flex-col items-center gap-2">
					<BadgeShield
						idBase="ds-{icon}"
						size={88}
						{gradient}
						{iconColor}
						icon={getBadgeIcon(icon)}
					/>
					<figcaption class="text-xs font-medium text-muted-foreground">{name}</figcaption>
				</figure>
			{/each}
		</div>
	</Spec>

	<Spec
		title="Free-response acceptance"
		src="AcceptanceMeter"
		note="How strictly a typed answer is graded."
	>
		<div class="flex gap-6 text-sm">
			{#each ['lenient', 'balanced', 'strict'] as const as level (level)}
				<span class="flex items-center gap-2 capitalize text-primary-ink">
					<AcceptanceMeter {level} />{level}
				</span>
			{/each}
		</div>
	</Spec>

	<Spec
		title="Question types"
		src="design-system/showcases"
		note="Interactive question types get a full showcase with every state."
	>
		<ul class="space-y-2">
			{#each showcases as showcase (showcase.slug)}
				<li>
					<a
						href={resolve('/design-system/[showcase]', { showcase: showcase.slug })}
						class="group flex items-center gap-3 surface-sm px-4 py-3 transition-colors hover:border-primary/40"
					>
						<span class="min-w-0 flex-1">
							<span class="block text-sm font-semibold">{showcase.title}</span>
							<span class="block text-sm text-muted-foreground">{showcase.summary}</span>
						</span>
						<ArrowRight
							size={16}
							class="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
						/>
					</a>
				</li>
			{/each}
		</ul>
	</Spec>
</Category>
