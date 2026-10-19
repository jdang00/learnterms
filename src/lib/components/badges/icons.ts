import type { LucideIcon } from '@lucide/svelte';
import Award from '@lucide/svelte/icons/award';
import BookOpen from '@lucide/svelte/icons/book-open';
import Brain from '@lucide/svelte/icons/brain';
import CalendarCheck from '@lucide/svelte/icons/calendar-check';
import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
import Crosshair from '@lucide/svelte/icons/crosshair';
import Crown from '@lucide/svelte/icons/crown';
import Eye from '@lucide/svelte/icons/eye';
import Flame from '@lucide/svelte/icons/flame';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import Heart from '@lucide/svelte/icons/heart';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Medal from '@lucide/svelte/icons/medal';
import Moon from '@lucide/svelte/icons/moon';
import Pill from '@lucide/svelte/icons/pill';
import Rocket from '@lucide/svelte/icons/rocket';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Star from '@lucide/svelte/icons/star';
import Stethoscope from '@lucide/svelte/icons/stethoscope';
import Sun from '@lucide/svelte/icons/sun';
import Sunrise from '@lucide/svelte/icons/sunrise';
import Target from '@lucide/svelte/icons/target';
import Timer from '@lucide/svelte/icons/timer';
import Trophy from '@lucide/svelte/icons/trophy';
import Zap from '@lucide/svelte/icons/zap';

type IconComponent = LucideIcon;

// An explicit registry keeps the bundle to these icons; importing Lucide's full
// `icons` map pulls every icon into the build. Add new badge iconKeys here.
const BADGE_ICONS: Record<string, IconComponent> = {
	award: Award,
	'book-open': BookOpen,
	brain: Brain,
	'calendar-check': CalendarCheck,
	'clipboard-check': ClipboardCheck,
	crosshair: Crosshair,
	crown: Crown,
	eye: Eye,
	flame: Flame,
	'graduation-cap': GraduationCap,
	heart: Heart,
	lightbulb: Lightbulb,
	medal: Medal,
	moon: Moon,
	pill: Pill,
	rocket: Rocket,
	sparkles: Sparkles,
	star: Star,
	stethoscope: Stethoscope,
	sun: Sun,
	sunrise: Sunrise,
	target: Target,
	timer: Timer,
	trophy: Trophy,
	zap: Zap
};

function toIconKey(iconKey: string) {
	return iconKey
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.split(/[-_\s]+/)
		.filter(Boolean)
		.join('-')
		.toLowerCase();
}

export function getBadgeIcon(iconKey: string | undefined | null): IconComponent {
	if (!iconKey) return Star;
	return BADGE_ICONS[toIconKey(iconKey)] ?? Star;
}
