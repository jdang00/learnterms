export function formatBytes(bytes: number | undefined | null, empty = '-') {
	if (!bytes) return empty;
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Elapsed time as m:ss, or h:mm:ss past an hour.
export function formatClock(ms: number) {
	const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
	const hours = Math.floor(totalSec / 3600);
	const minutes = Math.floor((totalSec % 3600) / 60);
	const seconds = String(totalSec % 60).padStart(2, '0');
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
		: `${minutes}:${seconds}`;
}
