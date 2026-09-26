import { Activity, Eye, Glasses, Microscope, ScanEye } from 'lucide-svelte';
import type { ExamTestGroup } from '$lib/examFindings/catalog';

// Same tinted badges as the quiz dock, one hue per group.
export const EXAM_GROUP_STYLE: Record<ExamTestGroup, { icon: typeof Eye; badge: string }> = {
	entrance: { icon: Eye, badge: 'bg-primary/12 text-primary' },
	binocular: { icon: ScanEye, badge: 'bg-info/12 text-info' },
	refraction: { icon: Glasses, badge: 'bg-secondary/12 text-secondary' },
	health: { icon: Microscope, badge: 'bg-accent/12 text-accent' },
	general: { icon: Activity, badge: 'bg-error/12 text-error' }
};
