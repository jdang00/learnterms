export class Flag {
	flags = $state(new Set<string>());
	flagCount = $derived(this.flags.size);
	noFlags = $state(false);
	showFlagged = $state(false);

	toggleFlag = (questionId: string) => {
		if (this.flags.has(questionId)) {
			this.flags.delete(questionId);
		} else {
			this.flags.add(questionId);
		}
		this.flags = new Set(this.flags);
	};
}
