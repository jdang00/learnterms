#!/bin/bash
# Paginated backfill script for flag counts
# Runs until all questions are processed

BATCH_SIZE=200
CURSOR=""
TOTAL_PROCESSED=0
TOTAL_UPDATED=0
ITERATION=0

echo "Starting flag count backfill..."
echo "Batch size: $BATCH_SIZE"
echo ""

while true; do
    ITERATION=$((ITERATION + 1))

    if [ -z "$CURSOR" ]; then
        RESULT=$(bunx convex run migrations:backfillFlagCounts "{\"batchSize\": $BATCH_SIZE}" --prod 2>&1)
    else
        RESULT=$(bunx convex run migrations:backfillFlagCounts "{\"batchSize\": $BATCH_SIZE, \"cursor\": \"$CURSOR\"}" --prod 2>&1)
    fi

    # Parse JSON response
    DONE=$(echo "$RESULT" | grep -o '"done": *[^,}]*' | head -1 | sed 's/"done": *//')
    PROCESSED=$(echo "$RESULT" | grep -o '"processed": *[0-9]*' | sed 's/"processed": *//')
    UPDATED=$(echo "$RESULT" | grep -o '"updated": *[0-9]*' | sed 's/"updated": *//')
    CURSOR=$(echo "$RESULT" | grep -o '"cursor": *"[^"]*"' | sed 's/"cursor": *"//' | sed 's/"$//')

    TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
    TOTAL_UPDATED=$((TOTAL_UPDATED + UPDATED))

    echo "Batch $ITERATION: processed=$PROCESSED, updated=$UPDATED (total: $TOTAL_PROCESSED processed, $TOTAL_UPDATED updated)"

    if [ "$DONE" = "true" ]; then
        echo ""
        echo "✓ Backfill complete!"
        echo "Total processed: $TOTAL_PROCESSED"
        echo "Total updated: $TOTAL_UPDATED"
        break
    fi

    # Small delay to avoid rate limiting
    sleep 0.5
done
