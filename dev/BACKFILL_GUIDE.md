# Production Backfill Guide: User Data from Clerk

This guide will walk you through running the user data backfill in production to sync Clerk user information into your Convex database.

## What the Backfill Does

The backfill function (`backfillUsersFromClerk`) fetches all users from Clerk and updates your Convex `users` table with:
- `firstName` - User's first name
- `lastName` - User's last name
- `email` - Primary email address
- `username` - Clerk username (if set)
- `imageUrl` - Profile image URL
- `lastSignInAt` - Last sign-in timestamp
- `createdAt` - Account creation timestamp
- `lastActiveAt` - Last activity timestamp

## Prerequisites

Before running the backfill in production:

1. **Ensure Convex is deployed to production**
   ```bash
   bun convex deploy
   ```

2. **Verify CLERK_SECRET_KEY is set in production**
   - Go to your Convex dashboard: https://dashboard.convex.dev
   - Select your production deployment
   - Navigate to Settings → Environment Variables
   - Confirm `CLERK_SECRET_KEY` is set (should already be configured)

## Running the Backfill in Production

### Option 1: Using the Convex CLI (Recommended)

**Step 1: Run the backfill command**
```bash
bun convex run users:backfillUsersFromClerk --prod
```

**Step 2: Monitor the output**
You'll see logs like:
```
Fetching users from Clerk...
Fetched 10 users so far...
Fetched 20 users so far...
Total users from Clerk: 25
Backfill complete: {
  totalClerkUsers: 25,
  successCount: 25,
  errorCount: 0,
  timestamp: 1766460200206
}
```

**Step 3: Review the results**
The command returns a summary:
- `totalClerkUsers` - Total users fetched from Clerk
- `successCount` - Number of users successfully updated
- `errorCount` - Number of failures (should be 0)
- `timestamp` - When the backfill completed

### Option 2: Using the Convex Dashboard

**Step 1: Open your Convex dashboard**
- Go to https://dashboard.convex.dev
- Select your production deployment

**Step 2: Navigate to Functions**
- Click "Functions" in the left sidebar
- Find and click `users:backfillUsersFromClerk`

**Step 3: Run the function**
- Click the "Run" button
- Leave the arguments empty (`{}`)
- Click "Run Function"

**Step 4: View the results**
The function will execute and show the result in the dashboard.

## Verifying the Backfill

After running the backfill, verify the data was updated:

**Method 1: Check in Convex Dashboard**
```bash
bun convex data users --prod --limit 5 --format pretty
```

**Method 2: Check in Convex Dashboard UI**
1. Go to https://dashboard.convex.dev
2. Select your production deployment
3. Click "Data" in the left sidebar
4. Select the `users` table
5. Verify the new fields are populated (email, firstName, imageUrl, etc.)

**Method 3: Test in your app**
1. Navigate to `/admin/progress` in production
2. Verify user profiles show:
   - Real profile images
   - Email addresses
   - Last sign-in times
   - Join dates

## Troubleshooting

### Error: "CLERK_SECRET_KEY is not set"
**Solution:** Add the environment variable to production
1. Get your Clerk Secret Key from https://dashboard.clerk.com
2. In Convex Dashboard → Settings → Environment Variables
3. Add `CLERK_SECRET_KEY` with your secret key
4. Redeploy: `bun convex deploy`

### Error: "User not found for clerkUserId"
**Cause:** User exists in Clerk but not in Convex
**Solution:** This is expected for users who haven't signed into your app yet. The backfill will skip them (logged but not an error).

### Partial Success (errorCount > 0)
**Solution:** Check the logs for specific error messages
```bash
bun convex logs --prod
```

Look for entries from `users:backfillUsersFromClerk` to see which users failed and why.

## When to Run the Backfill Again

You should re-run the backfill when:

1. **New users join** - The backfill will update existing users and add data for new ones
2. **Users update their Clerk profiles** - To sync name changes, new profile images, etc.
3. **After schema changes** - If you add more fields to sync from Clerk

**Recommended Schedule:**
- **Weekly** - For active apps with frequent new users
- **Monthly** - For stable apps with occasional new users
- **On-demand** - After bulk user imports or migrations

## Automation (Optional)

To automate the backfill, you can set up a scheduled function in Convex:

**Create `src/convex/crons.ts`:**
```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run backfill every Sunday at 2 AM UTC
crons.weekly(
  "weekly user backfill",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.users.backfillUsersFromClerk
);

export default crons;
```

**Note:** You'll need to change `backfillUsersFromClerk` from an `action` to an `internalAction` for this to work.

## Safety Notes

- ✅ The backfill is **safe to run multiple times** (it only updates existing users)
- ✅ It **does not delete** any data
- ✅ It **does not modify** user progress or cohort assignments
- ✅ It **only updates** the 8 fields listed at the top of this guide
- ⚠️  For large user bases (1000+ users), the backfill may take a few minutes

## Cost Considerations

- **Clerk API calls:** ~1 request per 100 users (due to pagination)
- **Convex operations:** 1 read + 1 write per user
- For most apps, this is negligible cost

## Support

If you encounter issues:
1. Check the error logs: `bun convex logs --prod`
2. Verify your environment variables are set
3. Test in development first: `bun convex run users:backfillUsersFromClerk` (without --prod)
4. Check Clerk API status: https://status.clerk.com
