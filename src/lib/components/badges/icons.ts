import { icons, Star } from 'lucide-svelte';

type IconComponent = typeof Star;

function toPascalCaseIconName(iconKey: string) {
	return iconKey
		.trim()
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

export function getBadgeIcon(iconKey: string | undefined | null): IconComponent {
	if (!iconKey) return Star;
	const iconName = toPascalCaseIconName(iconKey);
	return (icons as Record<string, IconComponent>)[iconName] ?? Star;
}
