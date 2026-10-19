import Activity from '@lucide/svelte/icons/activity';
import Eye from '@lucide/svelte/icons/eye';
import Glasses from '@lucide/svelte/icons/glasses';
import Microscope from '@lucide/svelte/icons/microscope';
import MoveHorizontal from '@lucide/svelte/icons/move-horizontal';
import ScanEye from '@lucide/svelte/icons/scan-eye';
import type { ExamTestGroup } from '$lib/examFindings/catalog';

// Same tinted badges as the quiz dock, one hue per group.
export const EXAM_GROUP_STYLE: Record<ExamTestGroup, { icon: typeof Eye; badge: string }> = {
	entrance: { icon: Eye, badge: 'bg-primary/12 text-primary-ink' },
	binocular: { icon: ScanEye, badge: 'bg-info/12 text-info-ink' },
	oculomotor: { icon: MoveHorizontal, badge: 'bg-success/12 text-success-ink' },
	refraction: { icon: Glasses, badge: 'bg-secondary/12 text-secondary-ink' },
	health: { icon: Microscope, badge: 'bg-accent/12 text-accent-ink' },
	general: { icon: Activity, badge: 'bg-error/12 text-error-ink' }
};
