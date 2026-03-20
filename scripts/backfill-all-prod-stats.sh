#!/bin/bash

# Backfill all production progress stats for all cohorts
# This ensures the admin progress dashboard never falls back to expensive computation

set -e

echo "=========================================="
echo "Production Progress Stats Backfill"
echo "=========================================="
echo ""

# Step 1: Check status of all cohorts
echo "Step 1: Checking current status of all cohorts..."
bunx convex run migrations:getAllCohortsStatus --prod

echo ""
read -p "Do you want to proceed with backfill? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Backfill cancelled."
    exit 0
fi

# Step 2: Backfill cohort-level stats for each cohort individually
echo ""
echo "Step 2: Backfilling cohort-level stats for each cohort..."
echo ""

# Get all cohorts and extract their IDs
COHORTS_JSON=$(bunx convex run migrations:getAllCohortsStatus --prod)

# Extract cohort IDs that need backfill
COHORT_IDS=$(echo "$COHORTS_JSON" | grep -o '"cohortId": "[^"]*"' | cut -d'"' -f4)

COHORT_STAT_COUNT=0
for COHORT_ID in $COHORT_IDS; do
    COHORT_STAT_COUNT=$((COHORT_STAT_COUNT + 1))
    echo "  Backfilling cohort #$COHORT_STAT_COUNT: $COHORT_ID"
    bunx convex run migrations:backfillCohortStats "{\"cohortId\": \"$COHORT_ID\"}" --prod
done

echo ""
echo "✓ Backfilled stats for $COHORT_STAT_COUNT cohorts"
echo ""

# Step 3: Backfill user progress stats for each cohort (paginated)
echo "Step 3: Backfilling user progress stats for all cohorts..."
echo "This will process cohorts one at a time with pagination..."
echo ""

COHORT_COUNT=0

while true; do
    # Get the next cohort that needs backfilling
    NEXT_COHORT=$(bunx convex run migrations:getNextCohortForUserBackfill --prod)

    # Check if we're done
    if echo "$NEXT_COHORT" | grep -q '"done": true'; then
        echo ""
        echo "✓ All cohorts have user progress stats backfilled!"
        break
    fi

    # Extract cohort ID and name
    COHORT_ID=$(echo "$NEXT_COHORT" | grep -o '"cohortId": "[^"]*"' | cut -d'"' -f4)
    COHORT_NAME=$(echo "$NEXT_COHORT" | grep -o '"cohortName": "[^"]*"' | cut -d'"' -f4)
    STUDENTS_NEEDING=$(echo "$NEXT_COHORT" | grep -o '"studentsNeedingBackfill": [0-9]*' | cut -d':' -f2 | tr -d ' ')

    if [ -z "$COHORT_ID" ]; then
        echo "Error: Could not parse cohort ID from response"
        echo "$NEXT_COHORT"
        exit 1
    fi

    COHORT_COUNT=$((COHORT_COUNT + 1))

    echo ""
    echo "----------------------------------------"
    echo "Processing Cohort #$COHORT_COUNT: $COHORT_NAME"
    echo "Cohort ID: $COHORT_ID"
    echo "Students needing backfill: $STUDENTS_NEEDING"
    echo "----------------------------------------"

    # Paginated backfill for this cohort
    BATCH_SIZE=20
    CURSOR=""
    ITERATION=0
    TOTAL_PROCESSED=0
    TOTAL_UPDATED=0

    while true; do
        ITERATION=$((ITERATION + 1))

        # Build the args JSON
        if [ -z "$CURSOR" ]; then
            ARGS="{\"cohortId\": \"$COHORT_ID\", \"batchSize\": $BATCH_SIZE}"
        else
            ARGS="{\"cohortId\": \"$COHORT_ID\", \"batchSize\": $BATCH_SIZE, \"cursor\": \"$CURSOR\"}"
        fi

        echo "  Batch #$ITERATION..."

        # Run the backfill
        RESULT=$(bunx convex run migrations:backfillUserProgressStats "$ARGS" --prod)

        # Extract metrics
        PROCESSED=$(echo "$RESULT" | grep -o '"processed": [0-9]*' | cut -d':' -f2 | tr -d ' ')
        UPDATED=$(echo "$RESULT" | grep -o '"updated": [0-9]*' | cut -d':' -f2 | tr -d ' ')
        DONE=$(echo "$RESULT" | grep -o '"done": [a-z]*' | cut -d':' -f2 | tr -d ' ')

        TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
        TOTAL_UPDATED=$((TOTAL_UPDATED + UPDATED))

        echo "  Processed: $PROCESSED | Updated: $UPDATED | Total: $TOTAL_PROCESSED"

        # Check if done
        if [ "$DONE" = "true" ]; then
            echo "  ✓ Cohort complete: $TOTAL_UPDATED users updated"
            break
        fi

        # Extract cursor for next iteration
        CURSOR=$(echo "$RESULT" | grep -o '"cursor": "[^"]*"' | cut -d'"' -f4)

        if [ -z "$CURSOR" ]; then
            echo "  Warning: No cursor found but not done. Breaking loop."
            break
        fi

        # Small delay to avoid overwhelming the database
        sleep 0.5
    done
done

# Step 4: Final status check
echo ""
echo "=========================================="
echo "Backfill Complete!"
echo "=========================================="
echo ""
echo "Final status:"
bunx convex run migrations:getAllCohortsStatus --prod

echo ""
echo "✓ All progress stats backfilled successfully!"
echo "  The admin progress dashboard will now use precomputed stats."
echo ""
