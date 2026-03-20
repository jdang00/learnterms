#!/bin/bash
# Paginated backfill script for user progress stats
# Usage: ./run-user-progress-backfill.sh <cohortId>

COHORT_ID="${1:-jd7azhmsdxcqcxknf546eeqes17m9gt4}"
BATCH_SIZE=20
CURSOR=""
TOTAL_PROCESSED=0
TOTAL_UPDATED=0
ITERATION=0

echo "Starting user progress stats backfill..."
echo "Cohort ID: $COHORT_ID"
echo "Batch size: $BATCH_SIZE"
echo ""

while true; do
    ITERATION=$((ITERATION + 1))

    if [ -z "$CURSOR" ]; then
        RESULT=$(bunx convex run migrations:backfillUserProgressStats "{\"cohortId\": \"$COHORT_ID\", \"batchSize\": $BATCH_SIZE}" --prod 2>&1)
    else
        RESULT=$(bunx convex run migrations:backfillUserProgressStats "{\"cohortId\": \"$COHORT_ID\", \"batchSize\": $BATCH_SIZE, \"cursor\": \"$CURSOR\"}" --prod 2>&1)
    fi

    # Check for errors
    if echo "$RESULT" | grep -q '"error"'; then
        echo "Error: $RESULT"
        break
    fi

    # Parse JSON response
    DONE=$(echo "$RESULT" | grep -o '"done": *[^,}]*' | head -1 | sed 's/"done": *//')
    PROCESSED=$(echo "$RESULT" | grep -o '"processed": *[0-9]*' | sed 's/"processed": *//')
    UPDATED=$(echo "$RESULT" | grep -o '"updated": *[0-9]*' | sed 's/"updated": *//')
    CURSOR=$(echo "$RESULT" | grep -o '"cursor": *"[^"]*"' | sed 's/"cursor": *"//' | sed 's/"$//')

    if [ -n "$PROCESSED" ]; then
        TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
    fi
    if [ -n "$UPDATED" ]; then
        TOTAL_UPDATED=$((TOTAL_UPDATED + UPDATED))
    fi

    echo "Batch $ITERATION: processed=$PROCESSED, updated=$UPDATED (total: $TOTAL_PROCESSED processed, $TOTAL_UPDATED updated)"

    if [ "$DONE" = "true" ]; then
        echo ""
        echo "✓ User progress stats backfill complete!"
        echo "Total processed: $TOTAL_PROCESSED"
        echo "Total updated: $TOTAL_UPDATED"
        break
    fi

    # Small delay to avoid rate limiting
    sleep 0.5
done
