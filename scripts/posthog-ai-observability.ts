const POSTHOG_HOST = process.env.POSTHOG_HOST ?? 'https://us.posthog.com';
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? '92871';
const TOKEN = process.env.POSTHOG_PERSONAL_API_KEY;

const after = process.argv[2] ?? '-1h';

if (!TOKEN) {
	console.error('Missing POSTHOG_PERSONAL_API_KEY.');
	console.error('Usage: POSTHOG_PERSONAL_API_KEY=phx_... bun run posthog:ai [-1h|-7d]');
	process.exit(1);
}

type HogQLResponse = {
	results?: unknown[][];
	columns?: string[];
	error?: string;
	detail?: string;
};

async function hogql(query: string) {
	const response = await fetch(`${POSTHOG_HOST}/api/projects/${PROJECT_ID}/query/`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			query: {
				kind: 'HogQLQuery',
				query
			}
		})
	});

	const json = (await response.json()) as HogQLResponse;
	if (!response.ok || json.error || json.detail) {
		throw new Error(json.error ?? json.detail ?? `PostHog query failed with ${response.status}`);
	}

	return json;
}

function toInterval(value: string) {
	const match = value.match(/^-?(\d+)([mhdw])$/i);
	if (!match) {
		throw new Error('Date window must look like -30m, -1h, -7d, or -2w.');
	}

	const amount = Number(match[1]);
	const units: Record<string, string> = {
		m: 'MINUTE',
		h: 'HOUR',
		d: 'DAY',
		w: 'WEEK'
	};
	const unit = units[match[2].toLowerCase()];

	return `${amount} ${unit}`;
}

function printTable(title: string, response: HogQLResponse) {
	console.log(`\n${title}`);
	console.log('='.repeat(title.length));

	const columns = response.columns ?? [];
	const rows = response.results ?? [];
	if (rows.length === 0) {
		console.log('No rows.');
		return;
	}

	console.table(
		rows.map((row) =>
			Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null]))
		)
	);
}

const dateFilter = `timestamp >= now() - INTERVAL ${toInterval(after)}`;

const summaryQuery = `
SELECT
	countIf(event = '$ai_trace') AS traces,
	countIf(event = '$ai_generation') AS generations,
	countDistinctIf(distinct_id, event = '$ai_generation') AS generation_users,
	round(sum(toFloat(properties.$ai_total_cost_usd)), 6) AS total_cost_usd,
	countIf(properties.$ai_is_error = 'true') AS errors,
	round(avg(toFloat(properties.$ai_latency)), 3) AS avg_latency_s,
	round(quantile(0.5)(toFloat(properties.$ai_latency)), 3) AS p50_latency_s
FROM events
WHERE event IN ('$ai_trace', '$ai_generation', '$ai_span', '$ai_embedding')
	AND ${dateFilter}
`;

const generationsQuery = `
SELECT
	uuid,
	properties.$ai_trace_id AS trace_id,
	distinct_id AS person,
	properties.$ai_model AS model,
	properties.$ai_is_error AS is_error,
	round(toFloat(properties.$ai_latency), 3) AS latency_s,
	toInt(properties.$ai_input_tokens) AS input_tokens,
	toInt(properties.$ai_output_tokens) AS output_tokens,
	toInt(properties.$ai_input_tokens) + toInt(properties.$ai_output_tokens) AS total_tokens,
	round(toFloat(properties.$ai_total_cost_usd), 6) AS cost_usd,
	timestamp
FROM events
WHERE event = '$ai_generation'
	AND ${dateFilter}
ORDER BY timestamp DESC
LIMIT 50
`;

const usersQuery = `
SELECT
	distinct_id AS person,
	countDistinct(properties.$ai_trace_id) AS traces,
	count() AS generations,
	countIf(properties.$ai_is_error = 'true') AS errors,
	round(sum(toFloat(properties.$ai_total_cost_usd)), 6) AS cost_usd,
	min(timestamp) AS first_seen,
	max(timestamp) AS last_seen
FROM events
WHERE event = '$ai_generation'
	AND ${dateFilter}
GROUP BY person
ORDER BY last_seen DESC
LIMIT 50
`;

const errorsQuery = `
SELECT
	coalesce(properties.$ai_error, properties.$ai_error_message, 'Unknown error') AS error,
	countDistinct(properties.$ai_trace_id) AS traces,
	countIf(event = '$ai_generation') AS generations,
	countIf(event = '$ai_span') AS spans,
	countIf(event = '$ai_embedding') AS embeddings,
	countDistinct(distinct_id) AS users,
	min(timestamp) AS first_seen,
	max(timestamp) AS last_seen
FROM events
WHERE event IN ('$ai_generation', '$ai_span', '$ai_trace', '$ai_embedding')
	AND properties.$ai_is_error = 'true'
	AND ${dateFilter}
GROUP BY error
ORDER BY traces DESC
LIMIT 50
`;

const [summary, generations, users, errors] = await Promise.all([
	hogql(summaryQuery),
	hogql(generationsQuery),
	hogql(usersQuery),
	hogql(errorsQuery)
]);

console.log(`PostHog project ${PROJECT_ID}, window ${after}`);
printTable('Summary', summary);
printTable('Generations', generations);
printTable('Users', users);
printTable('Errors', errors);
