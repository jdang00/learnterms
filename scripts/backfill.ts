import { spawnSync } from 'child_process';

const BATCH_SIZE = 500;
const PROD = process.argv.includes('--prod');
const DEPLOYMENT_FLAG = PROD ? '--prod' : '';

async function runBatch(cursor: string | null) {
  const argsObj = {
    batchSize: BATCH_SIZE,
    ...(cursor ? { cursor } : {})
  };
  const args = JSON.stringify(argsObj);
  console.log(`Running batch with cursor: ${cursor ?? 'null'}...`);
  
  const result = spawnSync('bun', [
    'convex',
    'run',
    'migrations:backfillFlagCounts',
    args,
    DEPLOYMENT_FLAG
  ].filter(Boolean), { encoding: 'utf-8' });

  if (result.status !== 0) {
    console.error('Error running batch:', result.stderr);
    process.exit(1);
  }

  try {
    // Convex CLI might output some extra text before the JSON result
    const output = result.stdout;
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in output: ' + output);
    }
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse output:', result.stdout);
    process.exit(1);
  }
}

async function main() {
  let cursor = null;
  let done = false;
  let totalProcessed = 0;
  let totalUpdated = 0;

  console.log(`Starting backfill on ${PROD ? 'PRODUCTION' : 'DEVELOPMENT'}...`);

  while (!done) {
    const res = await runBatch(cursor);
    done = res.done;
    cursor = res.cursor;
    totalProcessed += res.processed;
    totalUpdated += res.updated;

    console.log(`Progress: Processed ${totalProcessed} questions, Updated ${totalUpdated} flagCounts.`);
    
    if (done) {
      console.log('Backfill complete!');
    }
  }
}

main().catch(console.error);
