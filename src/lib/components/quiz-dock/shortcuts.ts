import type { CoreCommandId } from './types';

export type ShortcutBinding = {
	key: string;
	label: string;
	command: CoreCommandId;
	shift?: boolean;
	allowRepeat?: boolean;
	allowInTextInputs?: boolean;
};

export const QUIZ_SHORTCUTS: ShortcutBinding[] = [
	{ key: 'Enter', label: 'Enter', command: 'check' },
	{ key: 'Escape', label: 'Esc', command: 'clear' },
	{ key: 'Tab', label: 'Tab', command: 'reveal', allowInTextInputs: true },
	{ key: 'ArrowRight', label: '→', command: 'next', allowRepeat: true, allowInTextInputs: true },
	{ key: 'ArrowLeft', label: '←', command: 'previous', allowRepeat: true, allowInTextInputs: true },
	{ key: 'h', label: 'H', command: 'highlight' },
	{ key: 'f', label: 'F', command: 'flag' },
	{ key: 's', label: '⇧S', command: 'shuffle', shift: true }
];

export function shortcutLabelFor(command: string): string | undefined {
	return QUIZ_SHORTCUTS.find((binding) => binding.command === command)?.label;
}

export function ariaShortcutFor(command: string): string | undefined {
	const binding = QUIZ_SHORTCUTS.find((candidate) => candidate.command === command);
	if (!binding) return undefined;
	const key = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;
	return binding.shift ? `Shift+${key}` : key;
}

type KeyLike = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'repeat'>;

export function matchShortcut(event: KeyLike): ShortcutBinding | null {
	const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
	const binding = QUIZ_SHORTCUTS.find(
		(candidate) => candidate.key === key && (candidate.shift ? event.shiftKey : true)
	);
	if (!binding) return null;
	if (event.repeat && !binding.allowRepeat) return null;
	return binding;
}

export function optionIndexForKey(key: string): number | null {
	if (!/^[0-9]$/.test(key)) return null;
	return key === '0' ? 9 : Number(key) - 1;
}

type TargetLike = { closest?: (selector: string) => unknown; tagName?: string } | null;

export type ShortcutGuardEvent = Pick<
	KeyboardEvent,
	'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'defaultPrevented'
> & { target: TargetLike | EventTarget | null };

function isTextInput(target: TargetLike): boolean {
	const tag = target?.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function shouldIgnoreShortcut(
	event: ShortcutGuardEvent,
	binding: ShortcutBinding | null
): boolean {
	const target = event.target as TargetLike;
	const within = (selector: string) => Boolean(target?.closest?.(selector));

	if (['Enter', ' ', 'Tab'].includes(event.key) && within('button, a, [role="switch"]'))
		return true;
	if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return true;
	if (event.shiftKey && event.key.startsWith('Arrow')) return true;
	if (within('dialog, [contenteditable="true"]')) return true;
	if (isTextInput(target) && !binding?.allowInTextInputs) return true;
	return false;
}
