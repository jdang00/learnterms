<script lang="ts">
	import { resolve } from '$app/paths';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import {
		Sparkles,
		ChevronRight,
		ChevronLeft,
		Plus,
		MoreHorizontal,
		Zap,
		Mic,
		Send,
		CheckCircle2,
		ArrowLeft,
		X,
		Settings,
		PanelLeftClose,
		PanelRightClose,
		NotebookPen,
		Flag,
		Eye,
		EyeOff,
		RotateCcw,
		Check,
		Shuffle,
		ArrowRight,
		CircleDot
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';

	type ChatMessage = {
		role: 'assistant' | 'user';
		content: string;
		timestamp: string;
		sources?: string[];
	};

	type ParsedMessagePart = {
		text: string;
		bold: boolean;
	};

	let selectedSource: number | null = $state(null);
	let chatInput = $state('');
	let leftPanelOpen = $state(true);
	let rightPanelOpen = $state(true);
	let activeTab: 'sources' | 'notes' = $state('sources');
	const QUICK_NOTES_STORAGE_KEY = 'lt:study-space:quick-notes';
	const DEFAULT_QUICK_NOTES = `Frank-Starling = more stretch → stronger contraction

Remember: preload ↑ = SV ↑ (up to a point)

TODO: Review pressure-volume loops before exam...`;
	let quickNotes = $state(DEFAULT_QUICK_NOTES);
	let quickNotesHydrated = $state(false);

	// Question panel state
	let currentQuestionIndex = $state(0);
	let selectedOptions: string[] = $state([]);
	let eliminatedOptions: string[] = $state([]);
	let isFlagged = $state(false);
	let checkResult: '' | 'correct' | 'incorrect' = $state('');
	let showRationale = $state(false);

	$effect(() => {
		if (typeof window === 'undefined' || quickNotesHydrated) return;
		try {
			const stored = window.localStorage.getItem(QUICK_NOTES_STORAGE_KEY);
			if (stored !== null) {
				quickNotes = stored;
			}
		} catch {
			// Ignore storage errors in the demo view.
		} finally {
			quickNotesHydrated = true;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined' || !quickNotesHydrated) return;
		try {
			window.localStorage.setItem(QUICK_NOTES_STORAGE_KEY, quickNotes);
		} catch {
			// Ignore storage errors in the demo view.
		}
	});

	const mockSources = [
		{
			id: 0,
			name: 'Ch. 12 — Cardiac Physiology',
			type: 'pdf',
			pages: 28,
			icon: '❤️',
			added: '2 days ago'
		},
		{ id: 1, name: 'Lecture 14 Notes', type: 'notes', pages: 6, icon: '📝', added: '1 day ago' },
		{
			id: 2,
			name: 'Pharmacology Review Sheet',
			type: 'pdf',
			pages: 12,
			icon: '💊',
			added: '3 days ago'
		},
		{
			id: 3,
			name: 'Renal System Overview',
			type: 'slides',
			pages: 45,
			icon: '🫘',
			added: '5 days ago'
		},
		{
			id: 4,
			name: 'Pathology Case Studies',
			type: 'pdf',
			pages: 18,
			icon: '🔬',
			added: '1 week ago'
		}
	];

	const mockChat: ChatMessage[] = [
		{
			role: 'assistant',
			content:
				"Welcome to your Study Space! I've loaded 5 sources about cardiology and pharmacology. What would you like to explore first?",
			timestamp: '2:34 PM'
		},
		{
			role: 'user',
			content: 'Can you explain the Frank-Starling mechanism in simple terms?',
			timestamp: '2:35 PM'
		},
		{
			role: 'assistant',
			content:
				"The Frank-Starling mechanism is essentially your heart's built-in self-regulation system. Think of it like a rubber band — the more you stretch it (preload), the harder it snaps back (contraction force).\n\n**Key idea:** When more blood fills the ventricle during diastole, the cardiac muscle fibers stretch more, which causes a stronger contraction and greater stroke volume.\n\nThis is referenced in your Cardiac Physiology notes (Ch. 12, p. 8) and ties into the pressure-volume loops from Lecture 14.",
			timestamp: '2:35 PM',
			sources: ['Ch. 12 — Cardiac Physiology', 'Lecture 14 Notes']
		}
	];

	type MockQuestion = {
		id: number;
		stem: string;
		options: { id: string; text: string }[];
		correctAnswers: string[];
		rationale: string;
		source: string;
		flagged: boolean;
		interacted: boolean;
		selectedOptions: string[];
		eliminatedOptions: string[];
	};

	const mockQuestionsSeed: Omit<MockQuestion, 'selectedOptions' | 'eliminatedOptions'>[] = [
		{
			id: 0,
			stem: 'The Frank-Starling mechanism describes the relationship between which of the following?',
			options: [
				{ id: 'a', text: 'Heart rate and blood pressure' },
				{ id: 'b', text: 'Ventricular end-diastolic volume and stroke volume' },
				{ id: 'c', text: 'Cardiac output and systemic vascular resistance' },
				{ id: 'd', text: 'Preload and afterload resistance' }
			],
			correctAnswers: ['b'],
			rationale:
				'The Frank-Starling law states that the stroke volume of the heart increases in response to an increase in the volume of blood filling the heart (end-diastolic volume). The increased stretch of the cardiac muscle fibers leads to a more forceful contraction.',
			source: 'Ch. 12 — Cardiac Physiology, p. 8',
			flagged: false,
			interacted: true
		},
		{
			id: 1,
			stem: 'Which phase of the cardiac action potential is characterized by the rapid influx of sodium ions?',
			options: [
				{ id: 'a', text: 'Phase 0 — Rapid depolarization' },
				{ id: 'b', text: 'Phase 1 — Early repolarization' },
				{ id: 'c', text: 'Phase 2 — Plateau' },
				{ id: 'd', text: 'Phase 3 — Rapid repolarization' },
				{ id: 'e', text: 'Phase 4 — Resting potential' }
			],
			correctAnswers: ['a'],
			rationale:
				'Phase 0 of the cardiac action potential involves the rapid opening of voltage-gated Na⁺ channels, causing a swift depolarization from approximately -90mV to +20mV. This is the fastest phase and is responsible for the upstroke of the action potential.',
			source: 'Ch. 12 — Cardiac Physiology, p. 14',
			flagged: true,
			interacted: true
		},
		{
			id: 2,
			stem: 'A patient presents with decreased cardiac output. Echocardiography reveals an ejection fraction of 35%. Which compensatory mechanism would be activated first?',
			options: [
				{ id: 'a', text: 'Myocardial hypertrophy' },
				{ id: 'b', text: 'Activation of the renin-angiotensin-aldosterone system' },
				{ id: 'c', text: 'Baroreceptor-mediated sympathetic activation' },
				{ id: 'd', text: 'Increased erythropoietin production' }
			],
			correctAnswers: ['c'],
			rationale:
				'Baroreceptor-mediated sympathetic activation is the most immediate compensatory response to decreased cardiac output. Baroreceptors in the carotid sinus and aortic arch detect the drop in pressure and trigger increased sympathetic tone within seconds, increasing heart rate and contractility.',
			source: 'Lecture 14 Notes, p. 3',
			flagged: false,
			interacted: false
		},
		{
			id: 3,
			stem: 'During the cardiac cycle, the isovolumetric contraction phase occurs when:',
			options: [
				{ id: 'a', text: 'All valves are open' },
				{ id: 'b', text: 'The mitral valve is open and aortic valve is closed' },
				{ id: 'c', text: 'All valves are closed' },
				{ id: 'd', text: 'The aortic valve is open and mitral valve is closed' }
			],
			correctAnswers: ['c'],
			rationale:
				'During isovolumetric contraction, both the AV valves (mitral and tricuspid) and semilunar valves (aortic and pulmonic) are closed. Ventricular pressure is rising but has not yet exceeded aortic pressure, so no blood is ejected and volume remains constant.',
			source: 'Ch. 12 — Cardiac Physiology, p. 11',
			flagged: false,
			interacted: false
		}
	];

	let questions: MockQuestion[] = $state(
		mockQuestionsSeed.map(
			(question): MockQuestion => ({
				...question,
				selectedOptions: [],
				eliminatedOptions: []
			})
		)
	);

	const currentQuestion = $derived(questions[currentQuestionIndex]);
	const interactedCount = $derived(questions.filter((q) => q.interacted).length);
	const progressPercent = $derived(
		questions.length > 0 ? Math.round((interactedCount / questions.length) * 100) : 0
	);

	function updateQuestionState(index: number, updater: (question: MockQuestion) => MockQuestion) {
		questions = questions.map((question, questionIndex) =>
			questionIndex === index ? updater(question) : question
		);
	}

	function clearCheckState() {
		checkResult = '';
		showRationale = false;
	}

	function syncQuestionInteractionState(selected: string[], eliminated: string[]) {
		updateQuestionState(currentQuestionIndex, (question) => ({
			...question,
			selectedOptions: selected,
			eliminatedOptions: eliminated,
			interacted: selected.length > 0 || eliminated.length > 0 || question.interacted
		}));
	}

	function parseMessageContent(content: string): ParsedMessagePart[][] {
		return String(content ?? '')
			.split('\n')
			.map((line) => {
				const parts: ParsedMessagePart[] = [];
				const pattern = /\*\*(.*?)\*\*/g;
				let lastIndex = 0;

				for (const match of line.matchAll(pattern)) {
					const index = match.index ?? 0;
					if (index > lastIndex) {
						parts.push({ text: line.slice(lastIndex, index), bold: false });
					}
					parts.push({ text: match[1] ?? '', bold: true });
					lastIndex = index + match[0].length;
				}

				if (lastIndex < line.length) {
					parts.push({ text: line.slice(lastIndex), bold: false });
				}

				return parts.length > 0 ? parts : [{ text: '', bold: false }];
			});
	}

	function toggleOption(optionId: string) {
		if (checkResult === 'correct') return;
		if (eliminatedOptions.includes(optionId)) return;

		if (selectedOptions.includes(optionId)) {
			selectedOptions = selectedOptions.filter((id) => id !== optionId);
		} else {
			selectedOptions = [...selectedOptions, optionId];
		}
		clearCheckState();
		syncQuestionInteractionState(selectedOptions, eliminatedOptions);
	}

	function toggleElimination(optionId: string) {
		if (checkResult === 'correct') return;

		if (eliminatedOptions.includes(optionId)) {
			eliminatedOptions = eliminatedOptions.filter((id) => id !== optionId);
		} else {
			selectedOptions = selectedOptions.filter((id) => id !== optionId);
			eliminatedOptions = [...eliminatedOptions, optionId];
		}
		clearCheckState();
		syncQuestionInteractionState(selectedOptions, eliminatedOptions);
	}

	function checkAnswer() {
		if (selectedOptions.length === 0) return;
		const correct =
			currentQuestion.correctAnswers.every((a) => selectedOptions.includes(a)) &&
			selectedOptions.every((a) => currentQuestion.correctAnswers.includes(a));
		checkResult = correct ? 'correct' : 'incorrect';
		if (correct) showRationale = true;
	}

	function goToQuestion(index: number) {
		const nextQuestion = questions[index];
		currentQuestionIndex = index;
		selectedOptions = [...nextQuestion.selectedOptions];
		eliminatedOptions = [...nextQuestion.eliminatedOptions];
		checkResult = '';
		showRationale = false;
		isFlagged = nextQuestion.flagged;
	}

	function nextQuestion() {
		if (currentQuestionIndex < questions.length - 1) {
			goToQuestion(currentQuestionIndex + 1);
		}
	}

	function prevQuestion() {
		if (currentQuestionIndex > 0) {
			goToQuestion(currentQuestionIndex - 1);
		}
	}

	function getOptionState(
		optionId: string
	): 'default' | 'selected' | 'eliminated' | 'correct' | 'incorrect' {
		if (checkResult) {
			const isCorrect = currentQuestion.correctAnswers.includes(optionId);
			const isSelected = selectedOptions.includes(optionId);
			if (isCorrect) return 'correct';
			if (isSelected && !isCorrect) return 'incorrect';
			if (eliminatedOptions.includes(optionId)) return 'eliminated';
			return 'default';
		}
		if (eliminatedOptions.includes(optionId)) return 'eliminated';
		if (selectedOptions.includes(optionId)) return 'selected';
		return 'default';
	}

	function toggleFlagged() {
		const nextFlagged = !isFlagged;
		isFlagged = nextFlagged;
		updateQuestionState(currentQuestionIndex, (question) => ({
			...question,
			flagged: nextFlagged
		}));
	}
</script>

<div class="study-space-wrapper">
	<!-- Ambient background -->
	<div class="ambient-bg"></div>

	<div class="relative z-10 flex flex-col h-[calc(100dvh-4rem)] overflow-hidden">
		<!-- Top Bar -->
		<div
			class="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-background/80 backdrop-blur-xl"
			in:fade={{ duration: 400 }}
		>
			<div class="flex items-center gap-3">
				<Button
					href={resolve('/classes')}
					variant="ghost"
					tone="neutral"
					size="sm"
					class="hover:bg-muted/80"
					aria-label="Back to classes"
				>
					<ArrowLeft size={16} />
				</Button>
				<div class="h-5 w-px bg-muted-strong"></div>
				<div class="flex items-center gap-2.5">
					<div
						class="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center"
					>
						<span class="text-sm">❤️</span>
					</div>
					<div>
						<h1 class="font-display text-sm font-semibold text-foreground leading-tight">
							Cardiovascular System
						</h1>
						<p class="text-[11px] text-foreground/45">BIO 301 · 5 sources · Last studied 2h ago</p>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					class="text-foreground/60 hover:text-foreground"
					onclick={() => (leftPanelOpen = !leftPanelOpen)}
					aria-label="Toggle left panel"
				>
					<PanelLeftClose size={15} />
				</Button>
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					class="text-foreground/60 hover:text-foreground"
					onclick={() => (rightPanelOpen = !rightPanelOpen)}
					aria-label="Toggle right panel"
				>
					<PanelRightClose size={15} />
				</Button>
				<div class="h-5 w-px bg-muted-strong mx-1"></div>
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					shape="circle"
					class="text-foreground/50"
					aria-label="Open settings"
				>
					<Settings size={15} />
				</Button>
			</div>
		</div>

		<!-- Main 3-panel layout -->
		<div class="flex flex-1 overflow-hidden">
			<!-- LEFT PANEL: Sources & Notes -->
			{#if leftPanelOpen}
				<div
					class="w-72 xl:w-80 border-r border-border/50 bg-background/60 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden"
					in:fly={{ x: -20, duration: 300, easing: cubicOut }}
				>
					<!-- Panel tabs -->
					<div class="flex border-b border-border/50">
						<button
							class="flex-1 px-4 py-2.5 text-xs font-medium transition-colors duration-150 relative
								{activeTab === 'sources' ? 'text-primary-ink' : 'text-foreground/50 hover:text-foreground/80'}"
							onclick={() => (activeTab = 'sources')}
						>
							Sources
							{#if activeTab === 'sources'}
								<div class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></div>
							{/if}
						</button>
						<button
							class="flex-1 px-4 py-2.5 text-xs font-medium transition-colors duration-150 relative
								{activeTab === 'notes' ? 'text-primary-ink' : 'text-foreground/50 hover:text-foreground/80'}"
							onclick={() => (activeTab = 'notes')}
						>
							My Notes
							{#if activeTab === 'notes'}
								<div class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></div>
							{/if}
						</button>
					</div>

					{#if activeTab === 'sources'}
						<!-- Add sources area -->
						<div class="p-3">
							<button
								class="group w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 p-3 transition-all duration-200 hover:bg-primary/5"
								aria-label="Add source"
							>
								<div
									class="w-9 h-9 rounded-lg bg-muted group-hover:bg-primary/15 flex items-center justify-center transition-all duration-200"
								>
									<Plus
										size={16}
										class="text-foreground/40 group-hover:text-primary transition-colors"
									/>
								</div>
								<div class="text-left">
									<div class="text-xs font-medium text-foreground/70 group-hover:text-foreground">
										Add source
									</div>
									<div class="text-[10px] text-foreground/40">
										PDF, notes, slides, or paste text
									</div>
								</div>
							</button>
						</div>

						<!-- Source list -->
						<div class="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
							{#each mockSources as source, i (source.id)}
								<button
									class="group w-full text-left rounded-xl p-2.5 transition-all duration-150
										{selectedSource === source.id
										? 'bg-primary/10 border border-primary/25'
										: 'hover:bg-muted/80 border border-transparent'}"
									onclick={() => (selectedSource = selectedSource === source.id ? null : source.id)}
									style="animation: sourceReveal 0.35s cubic-bezier(.16,1,.3,1) {i * 60 +
										100}ms both;"
								>
									<div class="flex items-start gap-2.5">
										<span class="text-lg leading-none mt-0.5 shrink-0">{source.icon}</span>
										<div class="flex-1 min-w-0">
											<div class="text-xs font-medium text-foreground truncate leading-tight">
												{source.name}
											</div>
											<div class="flex items-center gap-1.5 mt-1">
												<Badge size="xs" class="text-[10px] uppercase tracking-wider"
													>{source.type}</Badge
												>
												<span class="text-[10px] text-foreground/35">{source.pages} pages</span>
											</div>
										</div>
										<div class="opacity-0 group-hover:opacity-100 transition-opacity">
											<MoreHorizontal size={14} class="text-foreground/30" />
										</div>
									</div>
								</button>
							{/each}
						</div>

						<!-- Source count -->
						<div class="p-3 border-t border-border/50">
							<div class="flex items-center justify-between">
								<span class="text-[11px] text-foreground/40"
									>{mockSources.length} sources loaded</span
								>
								<button
									class="text-[11px] text-primary-ink hover:text-primary-ink/80 font-medium transition-colors"
								>
									Manage
								</button>
							</div>
						</div>
					{:else}
						<!-- Notes tab -->
						<div class="flex-1 p-3">
							<div class="rounded-xl bg-muted/50 border border-border/50 p-4 h-full">
								<div class="flex items-center gap-2 mb-3">
									<NotebookPen size={14} class="text-foreground/50" />
									<span class="text-xs font-medium text-foreground/60">Quick Notes</span>
								</div>
								<Textarea
									bind:value={quickNotes}
									class="min-h-[12rem] resize-none border-0 bg-transparent px-0 py-2 text-xs leading-relaxed text-foreground/60 field-sizing-fixed shadow-none focus-visible:ring-0"
									placeholder="Capture quick study notes here..."
									aria-label="Quick notes"
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- CENTER: Chat / AI Assistant -->
			<div
				class="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-background/40 to-muted/30 backdrop-blur-xs"
			>
				<!-- Chat messages -->
				<div class="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-16 py-6">
					<div class="max-w-2xl mx-auto space-y-6">
						{#each mockChat as message, i (i)}
							{@const parsedContent = parseMessageContent(message.content)}
							<div
								class="flex gap-3 {message.role === 'user' ? 'flex-row-reverse' : ''}"
								style="animation: chatReveal 0.4s cubic-bezier(.16,1,.3,1) {i * 120 + 200}ms both;"
							>
								{#if message.role === 'assistant'}
									<div
										class="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 mt-1"
									>
										<Sparkles size={14} class="text-primary" />
									</div>
								{/if}

								<div class="flex-1 max-w-[85%] {message.role === 'user' ? 'ml-auto' : ''}">
									<div
										class="rounded-2xl px-4 py-3 {message.role === 'user'
											? 'bg-primary text-primary-foreground rounded-br-md'
											: 'bg-background border border-border/60 shadow-xs rounded-bl-md'}"
									>
										<div
											class="text-sm leading-relaxed whitespace-pre-line {message.role ===
											'assistant'
												? 'chat-content'
												: ''}"
										>
											{#each parsedContent as line, lineIndex (lineIndex)}
												{#each line as part, partIndex (`${lineIndex}-${partIndex}-${part.text}`)}
													{#if part.bold}
														<strong>{part.text}</strong>
													{:else}
														{part.text}
													{/if}
												{/each}
												{#if lineIndex < parsedContent.length - 1}
													<br />
												{/if}
											{/each}
										</div>

										{#if message.role === 'assistant' && message.sources}
											<div class="mt-3 pt-2.5 border-t border-border/40">
												<div class="flex items-center gap-1.5 flex-wrap">
													<span
														class="text-[10px] text-foreground/35 uppercase tracking-wider font-medium"
														>Sources:</span
													>
													{#each message.sources as src, i (`${src}-${i}`)}
														<Badge size="xs" class="text-[10px]">{src}</Badge>
													{/each}
												</div>
											</div>
										{/if}
									</div>
									<div class="mt-1 px-1 {message.role === 'user' ? 'text-right' : ''}">
										<span class="text-[10px] text-foreground/30">{message.timestamp}</span>
									</div>
								</div>
							</div>
						{/each}

						<!-- Suggested questions -->
						<div
							class="flex flex-col gap-2 mt-4"
							style="animation: chatReveal 0.4s cubic-bezier(.16,1,.3,1) 600ms both;"
						>
							<span class="text-[10px] text-foreground/35 uppercase tracking-wider font-medium px-1"
								>Suggested</span
							>
							<div class="flex flex-wrap gap-2">
								{#each ['Explain pressure-volume loops', 'Quiz me on cardiac drugs', 'Compare systolic vs diastolic failure', 'Summarize Ch. 12 key points'] as suggestion (suggestion)}
									<button
										class="group flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 text-xs text-foreground/60 hover:border-primary/40 hover:text-primary-ink hover:bg-primary/5 transition-all duration-200"
									>
										<Zap
											size={11}
											class="text-foreground/30 group-hover:text-primary transition-colors"
										/>
										{suggestion}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Input area -->
				<div
					class="border-t border-border/40 bg-background/70 backdrop-blur-xl px-4 sm:px-8 lg:px-16 py-4"
				>
					<div class="max-w-2xl mx-auto">
						<div
							class="flex items-end gap-2 rounded-2xl bg-background border border-border/60 shadow-xs p-2 focus-within:border-primary/40 focus-within:shadow-md transition-all duration-200"
						>
							<Button
								variant="ghost"
								tone="neutral"
								size="sm"
								shape="circle"
								class="shrink-0 self-end text-foreground/40"
								aria-label="Add attachment"><Plus size={16} /></Button
							>
							<div class="flex-1 min-h-[36px] max-h-32 overflow-y-auto">
								<input
									type="text"
									bind:value={chatInput}
									placeholder="Ask anything about your sources..."
									class="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/35 outline-hidden py-1.5 px-1"
								/>
							</div>
							<div class="flex items-center gap-1 shrink-0 self-end">
								<Button
									variant="ghost"
									tone="neutral"
									size="sm"
									shape="circle"
									class="text-foreground/40"
									aria-label="Start voice input"><Mic size={15} /></Button
								>
								<Button
									size="sm"
									class="gap-1 px-3"
									disabled={!chatInput.trim()}
									aria-label="Send message"><Send size={13} /></Button
								>
							</div>
						</div>
						<p class="text-[10px] text-foreground/30 text-center mt-2">
							AI responses are generated from your uploaded sources. Always verify important
							information.
						</p>
					</div>
				</div>
			</div>

			<!-- RIGHT PANEL: Question Practice -->
			{#if rightPanelOpen}
				<div
					class="w-80 xl:w-[22rem] border-l border-border/50 bg-background/60 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden"
					in:fly={{ x: 20, duration: 300, easing: cubicOut }}
				>
					<!-- Panel header -->
					<div class="flex items-center justify-between px-3.5 py-2.5 border-b border-border/50">
						<div class="flex items-center gap-2">
							<div class="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
								<CircleDot size={12} class="text-primary" />
							</div>
							<span class="text-xs font-semibold text-foreground">Practice</span>
							<Badge tone="primary" size="xs">{questions.length} Qs</Badge>
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								shape="circle"
								class="text-foreground/40"
								title="Shuffle"
								aria-label="Shuffle questions"><Shuffle size={12} /></Button
							>
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								shape="circle"
								class="text-foreground/40"
								title="Reset"
								aria-label="Reset progress"><RotateCcw size={12} /></Button
							>
						</div>
					</div>

					<!-- Question dots navigation -->
					<div class="px-3.5 py-2 border-b border-border/30">
						<div class="flex items-center gap-1">
							{#each questions as q, i (q.id)}
								<button
									class="question-dot group relative flex-1 h-7 flex items-center justify-center rounded-lg text-[10px] font-semibold transition-all duration-200
										{i === currentQuestionIndex
										? 'bg-primary text-primary-foreground shadow-xs shadow-primary/25'
										: q.interacted
											? 'bg-success/15 text-success-ink hover:bg-success/25'
											: 'bg-muted/80 text-foreground/40 hover:bg-muted-strong/80 hover:text-foreground/60'}"
									onclick={() => goToQuestion(i)}
									style="animation: dotReveal 0.25s cubic-bezier(.16,1,.3,1) {i * 40 + 100}ms both;"
								>
									{i + 1}
									{#if q.flagged}
										<div
											class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-warning border border-background"
										></div>
									{/if}
								</button>
							{/each}
						</div>
						<div class="flex items-center justify-between mt-1.5">
							<span class="text-[10px] text-foreground/35"
								>{interactedCount}/{questions.length} touched</span
							>
							<div class="flex items-center gap-1.5">
								<div class="h-1 w-12 rounded-full bg-muted-strong/60 overflow-hidden">
									<div
										class="h-full rounded-full bg-success transition-all duration-500"
										style="width: {progressPercent}%;"
									></div>
								</div>
								<span class="text-[10px] font-medium text-success-ink">{progressPercent}%</span>
							</div>
						</div>
					</div>

					<!-- Question content -->
					<div class="flex-1 overflow-y-auto px-3.5 py-3">
						{#key currentQuestionIndex}
							<div style="animation: questionSlideIn 0.3s cubic-bezier(.16,1,.3,1) both;">
								<!-- Context pill -->
								<div class="flex items-center gap-1.5 mb-3">
									<Badge size="xs" class="text-[9px] uppercase tracking-widest"
										>From: {currentQuestion.source}</Badge
									>
								</div>

								<!-- Stem -->
								<p class="text-[13px] font-medium text-foreground leading-snug mb-4">
									{currentQuestion.stem}
								</p>

								<!-- Options -->
								<div class="space-y-1.5">
									{#each currentQuestion.options as option, i (option.id)}
										{@const state = getOptionState(option.id)}
										<div
											class="group relative"
											style="animation: optionReveal 0.25s cubic-bezier(.16,1,.3,1) {i * 50 +
												80}ms both;"
										>
											<button
												type="button"
												class="option-btn w-full text-left rounded-xl px-3 py-2.5 text-xs leading-snug transition-all duration-150 border
														{state === 'selected'
													? 'bg-primary/10 border-primary/40 text-foreground font-medium'
													: state === 'eliminated'
														? 'bg-muted/50 border-border/30 text-foreground/25 line-through'
														: state === 'correct'
															? 'bg-success/10 border-success/40 text-success-ink font-medium'
															: state === 'incorrect'
																? 'bg-error/10 border-error/40 text-error-ink font-medium'
																: 'bg-background border-border/50 text-foreground/80 hover:border-primary/30 hover:bg-primary/5'}"
												onclick={() => toggleOption(option.id)}
												oncontextmenu={(e) => {
													e.preventDefault();
													toggleElimination(option.id);
												}}
											>
												<div class="flex items-start gap-2.5">
													<span
														class="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-px
														{state === 'selected'
															? 'bg-primary text-primary-foreground'
															: state === 'correct'
																? 'bg-success text-success-foreground'
																: state === 'incorrect'
																	? 'bg-error text-error-foreground'
																	: state === 'eliminated'
																		? 'bg-muted-strong/50 text-foreground/20'
																		: 'bg-muted/80 text-foreground/50 group-hover:bg-primary/15 group-hover:text-primary'}
														transition-all duration-150"
													>
														{#if state === 'correct'}
															<Check size={10} strokeWidth={3} />
														{:else if state === 'incorrect'}
															<X size={10} strokeWidth={3} />
														{:else}
															{String.fromCharCode(65 + i)}
														{/if}
													</span>
													<span class="flex-1">{option.text}</span>
												</div>
											</button>

											<!-- Eliminate button on hover -->
											{#if !checkResult && state !== 'eliminated'}
												<button
													type="button"
													class="absolute top-1/2 right-1.5 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md border border-border/60
															bg-background/90 text-foreground/45 shadow-xs transition-all duration-150 hover:border-warning/40 hover:bg-warning/10 hover:text-warning
															focus-visible:border-warning/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/30"
													onclick={() => toggleElimination(option.id)}
													aria-label={`Eliminate option ${String.fromCharCode(65 + i)}`}
												>
													<X size={9} strokeWidth={3} />
												</button>
											{/if}
										</div>
									{/each}
								</div>

								<!-- Result banner -->
								{#if checkResult}
									<div
										class="mt-3 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2
											{checkResult === 'correct'
											? 'bg-success/10 text-success-ink border border-success/20'
											: 'bg-error/10 text-error-ink border border-error/20'}"
										style="animation: resultPop 0.3s cubic-bezier(.34,1.56,.64,1) both;"
									>
										{#if checkResult === 'correct'}
											<CheckCircle2 size={14} />
											Correct!
										{:else}
											<X size={14} />
											Incorrect. Try again.
										{/if}
									</div>
								{/if}

								<!-- Rationale -->
								{#if showRationale || checkResult === 'correct'}
									<div
										class="mt-3 rounded-xl bg-muted/50 border border-border/40 p-3"
										style="animation: rationaleReveal 0.4s cubic-bezier(.16,1,.3,1) 0.15s both;"
									>
										<div class="flex items-center gap-1.5 mb-1.5">
											<Eye size={11} class="text-foreground/40" />
											<span
												class="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider"
												>Rationale</span
											>
										</div>
										<p class="text-[11px] text-foreground/65 leading-relaxed">
											{currentQuestion.rationale}
										</p>
									</div>
								{/if}
							</div>
						{/key}
					</div>

					<!-- Bottom action bar -->
					<div class="px-3.5 py-2.5 border-t border-border/40 bg-background/80 backdrop-blur-xs">
						<div class="flex items-center gap-1.5">
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								shape="rect"
								class="gap-1 text-foreground/50 hover:text-warning {isFlagged
									? 'text-warning bg-warning/10'
									: ''}"
								onclick={toggleFlagged}
								title="Flag question"
								aria-label="Toggle flag"
							>
								<Flag size={12} class={isFlagged ? 'fill-warning' : ''} />
							</Button>

							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								shape="rect"
								class="gap-1 text-foreground/50"
								onclick={() => (showRationale = !showRationale)}
								title="Toggle rationale"
								aria-label="Toggle rationale"
							>
								{#if showRationale}
									<EyeOff size={12} />
								{:else}
									<Eye size={12} />
								{/if}
							</Button>

							<div class="flex-1"></div>

							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									tone="neutral"
									size="xs"
									shape="circle"
									class="text-foreground/40"
									disabled={currentQuestionIndex === 0}
									onclick={prevQuestion}
									aria-label="Previous question"
								>
									<ChevronLeft size={14} />
								</Button>

								{#if checkResult === 'correct' && currentQuestionIndex < questions.length - 1}
									<Button
										size="xs"
										shape="rect"
										class="gap-1 px-3 font-semibold"
										onclick={nextQuestion}
									>
										Next
										<ArrowRight size={11} />
									</Button>
								{:else}
									<Button
										variant="soft"
										size="xs"
										shape="rect"
										class="px-3 font-semibold"
										disabled={selectedOptions.length === 0}
										onclick={checkAnswer}
									>
										Check
									</Button>
								{/if}

								<Button
									variant="ghost"
									tone="neutral"
									size="xs"
									shape="circle"
									class="text-foreground/40"
									disabled={currentQuestionIndex === questions.length - 1}
									onclick={nextQuestion}
									aria-label="Next question"
								>
									<ChevronRight size={14} />
								</Button>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.study-space-wrapper {
		position: relative;
		overflow: hidden;
	}

	.ambient-bg {
		position: fixed;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(ellipse at 10% 20%, oklch(0.85 0.05 280 / 0.15) 0%, transparent 50%),
			radial-gradient(ellipse at 85% 80%, oklch(0.85 0.05 200 / 0.1) 0%, transparent 45%),
			radial-gradient(ellipse at 50% 50%, oklch(0.85 0.03 330 / 0.06) 0%, transparent 60%);
		pointer-events: none;
	}

	:global([data-theme='dark']) .ambient-bg {
		background:
			radial-gradient(ellipse at 10% 20%, oklch(0.3 0.06 280 / 0.2) 0%, transparent 50%),
			radial-gradient(ellipse at 85% 80%, oklch(0.3 0.05 200 / 0.15) 0%, transparent 45%),
			radial-gradient(ellipse at 50% 50%, oklch(0.25 0.03 330 / 0.08) 0%, transparent 60%);
	}

	.chat-content :global(strong) {
		font-weight: 600;
		color: oklch(from currentColor l c h / 0.95);
	}

	@keyframes sourceReveal {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes chatReveal {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes dotReveal {
		from {
			opacity: 0;
			transform: scale(0.7);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes questionSlideIn {
		from {
			opacity: 0;
			transform: translateX(10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes optionReveal {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes resultPop {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes rationaleReveal {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
