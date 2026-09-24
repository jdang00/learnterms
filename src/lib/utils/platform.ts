type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } };

function currentPlatform(): string {
	if (typeof navigator === 'undefined') return '';
	const nav = navigator as NavigatorWithUAData;
	return nav.userAgentData?.platform || nav.platform || nav.userAgent;
}

export function isApplePlatform(platform = currentPlatform()): boolean {
	return /mac|iphone|ipad|ipod/i.test(platform);
}

// Apple keyboards use ⌘ where Windows and Linux use Ctrl.
export function modifierKeyLabel(platform = currentPlatform()): string {
	return isApplePlatform(platform) ? '⌘' : 'Ctrl';
}
