# Blackboard API Experiment Notes

Date: April 22, 2026

## Goal

We explored whether LearnTerms could:

1. Add a `/tools` route to test the Blackboard Learn REST API.
2. Retrieve a student's course grades.
3. Let a user connect their own Blackboard account from a public route, without first signing in to LearnTerms.

This was implemented briefly in the app, verified with type-checking, and then fully removed at the user's request. This document preserves the research and implementation plan so the work can be repeated later without starting from zero.

## High-Level Conclusion

Short version:

- Yes, Blackboard Learn can return a user's course grades through the official REST API.
- Yes, Anthology officially supports user-authorized access through 3-legged OAuth (3LO), which is the right model for "connect your Blackboard account and fetch my grades."
- Maybe, but not guaranteed, for schools using custom SSO in front of Blackboard. The OAuth flow can still work, but only if the school's Learn login flow preserves the OAuth redirect parameters correctly.
- No clear evidence was found that Blackboard Learn should be used as a full replacement for LearnTerms site-wide authentication. The docs support user-authorized REST access, not Learn as a general third-party identity provider for arbitrary app login.

## What We Found

### 1. Blackboard supports grade retrieval through official REST endpoints

The most useful path was not "list every gradebook column, then fetch users per column," although that also exists. The cleaner route for a specific user is:

1. Get an access token.
2. Resolve the Blackboard user.
3. Get the user's course memberships.
4. For each course, get that user's grades directly.

The key endpoints:

- `POST /learn/api/public/v1/oauth2/token`
- `GET /learn/api/public/v1/users/{userId}/courses`
- `GET /learn/api/public/v2/courses/{courseId}/gradebook/users/{userId}`
- Optional supporting endpoint: `GET /learn/api/public/v2/courses/{courseId}/gradebook/columns`

Why the per-course grades endpoint matters:

- It is more direct than iterating all columns and then all column-user grade records.
- It is aligned with the user-facing use case of "show me my grades."
- It reduces implementation complexity and request count for this use case.

### 2. Blackboard supports user-authorized access through 3LO

Anthology's 3LO docs explicitly support an application acting as the Blackboard user instead of a broad system-level integration user.

That means a workable pattern for LearnTerms is:

1. User starts on LearnTerms.
2. We redirect them to Blackboard Learn's authorization endpoint.
3. They sign in through their school's Learn login flow.
4. Blackboard redirects back to LearnTerms with an authorization code.
5. LearnTerms exchanges the code for a user-scoped token.
6. LearnTerms uses that token to call Blackboard APIs on behalf of that user.

This is the right model for:

- "Connect Blackboard"
- "Import my Blackboard grades"
- "Show me my Blackboard courses"

This is not the same thing as replacing Clerk or LearnTerms account auth wholesale.

### 3. Custom SSO is the main risk

The user shared a redirect from `bb.nsuok.edu` to a QuickLaunch SAML endpoint like:

`https://id.quicklaunch.io/authenticationendpoint/login.do?...type=samlsso...`

That strongly suggests the school uses custom SSO in front of Blackboard Learn.

This does not rule out 3LO. Anthology's docs explicitly discuss 3LO working with custom login pages and SSO. The problem is that many custom login implementations break the redirect back to the app.

Typical failure mode:

1. App starts 3LO.
2. User is sent to Learn login.
3. SSO login succeeds.
4. User lands in Blackboard Learn instead of being redirected back to the app callback URL.

Anthology's explanation:

- The OAuth authorization request includes parameters that must survive the login process.
- If the login link is hard-coded or the SSO flow drops those parameters, the app never gets the auth code back.

So for schools using custom SSO:

- 3LO is still possible.
- The Blackboard admin and SSO/login page behavior determine whether it works in practice.

### 4. Admin configuration is still required

Even with correct code, the Learn instance must be configured correctly.

At minimum:

- The REST integration must exist in the Learn instance.
- End User Access must be enabled for the integration.
- The app's redirect URI must match what Blackboard expects.
- The Learn-side privileges and app registration need to allow the calls being made.

Without that, the code can be technically correct and still fail.

## Sources Used

These were the main official sources referenced during the experiment:

- Anthology 3LO docs:
  - https://docs.anthology.com/docs/blackboard/rest-apis/getting-started/3lo
- Anthology custom login + 3LO docs:
  - https://docs.anthology.com/docs/blackboard/rest-apis/getting-started/rest-3lo-and-learn-sso
- Anthology basic auth / token docs:
  - https://docs.anthology.com/docs/blackboard/rest-apis/getting-started/basic-authentication
- Anthology gradebook guide:
  - https://docs.anthology.com/docs/blackboard/rest-apis/hands-on/pulling-gradebook-data-and-assessment-grades
- Anthology "first steps" docs:
  - https://docs.anthology.com/docs/blackboard/rest-apis/getting-started/first-steps
- Latest Learn OpenAPI spec inspected during the experiment:
  - https://devportal-docstore.s3.amazonaws.com/learn-swagger-4000.16.0.json

## What We Implemented

This was implemented locally and then removed. Nothing remains in the app code today. The approach is still worth preserving because it was structurally sound.

### Phase 1: Internal testing route

We first created a protected route under `/tools` for internal testing only.

Purpose:

- Keep Blackboard app credentials on the server.
- Verify token exchange worked.
- Allow manual Blackboard user lookup by username, email, external ID, student ID, or exact Blackboard user ID.
- Fetch memberships and per-course grades for the resolved user.

Server behavior:

- Exchange `client_credentials` token server-side.
- Resolve a Blackboard user.
- Load memberships via `/users/{userId}/courses`.
- Load grades per course via `/v2/courses/{courseId}/gradebook/users/{userId}`.
- Optionally load columns to decorate results with names, due dates, and points possible.

### Phase 2: Public route with Blackboard 3LO

After that, we moved the route "out in front of" LearnTerms login.

Purpose:

- Let a user start from a public route.
- Redirect them into Blackboard Learn login.
- Receive a user-scoped token after successful authorization.
- Use the returned Blackboard `user_id` to fetch that user's grades directly.

This matched Anthology's documented 3LO flow much better than trying to guess a Blackboard user record from LearnTerms account data.

### Files created during the experiment

These files existed briefly and were then deleted:

- `src/lib/server/blackboard.ts`
- `src/routes/tools/blackboard-api/+page.server.ts`
- `src/routes/tools/blackboard-api/+page.svelte`
- `src/routes/tools/blackboard-api/shared.ts`
- `src/routes/tools/blackboard-api/connect/+server.ts`
- `src/routes/tools/blackboard-api/callback/+server.ts`

## Implementation Details To Reuse Later

### A. Server-only Blackboard client

We built a server-side helper for:

- Normalizing the Blackboard base URL.
- Exchanging tokens.
- Fetching users.
- Fetching memberships.
- Fetching course columns.
- Fetching user grades per course.
- Wrapping Blackboard REST errors into a usable typed error shape.

Key implementation notes:

- Never expose Blackboard app key/secret in client-side code.
- Keep all token exchange server-side.
- Normalize a Learn host like `https://bb.nsuok.edu` so callers do not accidentally include `/learn/api/public/...` in the configured base URL.
- Use a paginated fetch helper for Blackboard list endpoints.

### B. Public 3LO flow

The public flow we implemented was:

1. User visits `/tools/blackboard-api`
2. User clicks "Connect Blackboard account"
3. Server route generates:
   - `state`
   - PKCE `code_verifier`
   - PKCE `code_challenge`
4. Server stores these in short-lived cookies
5. Server redirects to:
   - `GET /learn/api/public/v1/oauth2/authorizationcode`
6. Blackboard/SSO login occurs
7. Blackboard redirects back to our callback route
8. Callback route:
   - validates `state`
   - exchanges the code for a token
   - reads `user_id` from the token response
   - stores a short-lived session cookie with the Blackboard access token and `user_id`
9. Main route uses that token to fetch:
   - user profile
   - memberships
   - per-course grades

Why PKCE was included:

- Anthology supports PKCE with 3LO.
- It is the safer default for an authorization-code flow.

### C. Cookie/session handling

The experiment used short-lived cookies for:

- OAuth `state`
- PKCE `code_verifier`
- Blackboard base URL
- Temporary Blackboard session state after callback
- Flash-style status messages

Implementation notes:

- Cookies should be `httpOnly`.
- Use `sameSite='lax'`.
- Use `secure` outside development.
- Keep token lifetime short and aligned to Blackboard `expires_in`.

### D. Manual probe fallback

We also preserved a manual testing flow alongside 3LO.

Why it was useful:

- Helpful before OAuth is fully configured.
- Helpful for admins and debugging.
- Lets you test the REST integration directly using env-provided credentials.

The manual flow accepted:

- Learn base URL
- App key
- App secret
- Blackboard user lookup field
- Blackboard user lookup value

This is worth keeping if the experiment is revived.

## Recommended Reimplementation Plan

If we try this again, do it in this order:

### Step 1: Recreate a server-only Blackboard client

Rebuild a helper similar to the deleted `src/lib/server/blackboard.ts`.

Required features:

- `normalizeBlackboardBaseUrl`
- `exchangeClientCredentials`
- `exchangeAuthorizationCode`
- `fromAccessToken`
- `getUser`
- `findUsers`
- `getUserMemberships`
- `getCourseColumns`
- `getCourseGradesForUser`

### Step 2: Recreate a simple internal manual test route

Before touching public OAuth again, rebuild an internal route to confirm:

- The Learn host is correct
- The app key/secret are valid
- The integration is installed in Blackboard
- The grade endpoints return data for a known Blackboard user

This isolates Blackboard API correctness from SSO/OAuth complexity.

### Step 3: Recreate the public 3LO flow

Once the manual test works:

- Add `/tools/blackboard-api`
- Add `/tools/blackboard-api/connect`
- Add `/tools/blackboard-api/callback`

Keep the UI simple:

- "Connect Blackboard"
- Show connection status
- Show resolved Blackboard user
- Show memberships
- Show course grades

### Step 4: Test specifically against the school's SSO behavior

For schools like NSUO with QuickLaunch/SAML in front of Learn:

- Start the OAuth flow
- Complete the SSO login
- Confirm whether the user returns to the app callback URL

This is the highest-risk part of the whole project.

### Step 5: Only then consider account linking

If 3LO works reliably:

- Consider linking a LearnTerms user to a Blackboard user record
- Store Blackboard user ID or external ID in LearnTerms
- Use Blackboard only as a connected data source, not as the app's only identity provider

That is the conservative architecture.

## Environment Variables We Used

These names were used during the experiment:

- `BLACKBOARD_BASE_URL`
- `BLACKBOARD_API_KEY`
- `BLACKBOARD_API_SECRET`

If we repeat this, keep those names unless there is a strong reason to change them.

## Why The Experiment Was Removed

The user asked to leave no trace of the Blackboard API experiment in the app itself.

So the implementation was deleted after the experiment:

- route removed
- helper removed
- callback flow removed
- no active Blackboard code remains in production paths

This note is the only intentional remaining artifact.

## Practical Recommendation

If we revisit this later, do not begin by trying to replace LearnTerms login with Blackboard.

The better path is:

1. Treat Blackboard as a connected external account.
2. Use 3LO for user-scoped API access.
3. Prove the school's SSO flow returns correctly to the callback.
4. Use Blackboard only for the data import and grade sync problem first.

That is the part the official Anthology documentation supports most clearly.
