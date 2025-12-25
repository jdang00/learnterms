import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Refresh all cohort progress caches daily at 2 AM UTC
crons.daily(
	'refresh cohort progress caches',
	{ hourUTC: 2, minuteUTC: 0 },
	internal.progressCache.refreshAllCohorts
);

export default crons;
