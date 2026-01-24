# Dev Role Implementation Guide

## Overview

This document describes the role-based access control system with a clear hierarchy designed for different types of users:

- **Dev** = Technical team members (developers, system administrators)
- **Admin** = Cohort leaders (teachers, course coordinators)
- **Curator** = Content creators (teaching assistants, content managers)
- **Student** = Regular learners

## Quick Summary

**What can each role do?**

| Role | Manage Roles | Assign Roles | Change Plans | Switch Cohorts | Edit Content |
|------|-------------|--------------|--------------|----------------|--------------|
| **Dev** | ✅ All except devs | Student, Curator, Admin | ✅ Yes | ✅ Yes | ✅ Yes |
| **Admin** | ✅ Student ↔ Curator only | Student, Curator | ❌ No | ❌ No | ✅ Yes |
| **Curator** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Student** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |

**Key Design Principles:**
1. **Devs** = System-level access for technical team
2. **Admins** = Can delegate to curators but cannot create more admins
3. **Curators** = Content-only access, delegated by admins
4. **Self-protection** = Nobody can change their own role
5. **Plans are dev-only** = Only technical team can manage billing/features

## Role Hierarchy

```
dev > admin > curator > student (no role)
```

### Role Definitions

- **dev**: Technical team - Full system access + cohort switching + plan management
- **admin**: Cohort leaders - Can delegate to curators, manage student/curator roles only
- **curator**: Content creators - Can edit questions/content (delegated by admins)
- **student**: Regular users - Learning access only (no role field set)

### Role Management Rules - SIMPLIFIED

**Dev (Technical Team):**
- ✅ Can change ANY role (student, curator, admin)
- ✅ Can change ANY plan (free, pro)
- ✅ Can switch cohorts
- ✅ Full system access
- ❌ Cannot change their own role (self-protection)
- ❌ Cannot manage other devs (same level)

**Admin (Cohort Leaders):**
- ✅ Can toggle users between Student ↔ Curator ONLY
- ❌ Cannot assign admin role (requires dev)
- ❌ Cannot change plans (dev only)
- ❌ Cannot manage other admins or devs
- ❌ Cannot change their own role (self-protection)
- 💡 Purpose: Delegate content creation to curators

**Curator (Content Creators):**
- ✅ Can create/edit questions and content
- ❌ Cannot manage any roles
- ❌ Cannot change plans
- 💡 Purpose: Help admins with content management

**Student (Regular Users):**
- ✅ Can access learning materials
- ❌ No administrative permissions

### Quick Reference Matrix

| User Role | Can Manage Roles | Can Assign To | Can Change Plans | Can Switch Cohorts |
|-----------|-----------------|---------------|------------------|-------------------|
| **Dev** | Admin, Curator, Student | Admin, Curator, Student | ✅ Yes | ✅ Yes |
| **Admin** | Student, Curator | Student, Curator | ❌ No | ❌ No |
| **Curator** | ❌ None | ❌ None | ❌ No | ❌ No |
| **Student** | ❌ None | ❌ None | ❌ No | ❌ No |

### Examples

**✅ Allowed:**
- Dev promotes student to admin
- Dev changes user's plan to pro
- Admin promotes student to curator
- Admin demotes curator to student
- Admin toggles curator back and forth

**❌ Blocked:**
- Admin tries to promote anyone to admin → Error: "Admins can only assign student or curator roles"
- Admin tries to change a plan → Error: "Only devs can change user plans"
- Admin tries to manage another admin → Error: "Admins cannot manage other admins or devs"
- Anyone tries to change own role → Error: "You cannot change your own role"
- Dev tries to manage another dev → Error: "You cannot change your own role" (if self) or blocked (if other dev)

## What Changed

### Backend Changes

#### 1. Schema (`src/convex/schema.ts`)
- Added `'dev'` as a role option in users table:
  ```typescript
  role: v.optional(v.union(v.literal('dev'), v.literal('admin'), v.literal('curator')))
  ```

#### 2. Auth System (`src/convex/authQueries.ts`)
- Updated `authAdminQuery` and `authAdminMutation` to accept dev role
- Updated `authCuratorMutation` to accept dev role
- Created new `authDevQuery` and `authDevMutation` for dev-only operations
- Updated `joinCohort` and `switchCohort` mutations to allow dev access

#### 3. Cohort Management (`src/convex/cohort.ts`)
- Updated `listCohortsWithSchools` to check Convex role instead of Clerk metadata
- Now only accessible to users with `role: 'dev'`

#### 4. User Management (`src/convex/users.ts`)
- Updated `updateUserRoleAndPlan` to support 'dev' role

#### 5. Migrations (`src/convex/migrations.ts`)
- Added `bootstrapDev` mutation for setting dev role manually

#### 6. Server Hooks (`src/hooks.server.ts`)
- Updated `protectAdmin` to allow dev access to admin routes

### Frontend Changes

#### 1. Navigation Bar (`src/lib/components/NavBar.svelte`)
- Changed dev check from Clerk metadata to Convex role: `userDataQuery.data?.role === 'dev'`
- Cohort switcher now appears for dev users

#### 2. Updated Role Checks in Components
All components now include dev in permission checks:

- `src/routes/classes/+page.svelte` - Added dev badge display
- `src/routes/admin/[classId]/module/[moduleId]/+page.svelte` - Updated canEdit
- `src/lib/components/Sidebar.svelte` - Updated admin menu visibility
- `src/routes/admin/[classId]/+page.svelte` - Added dev check
- `src/routes/admin/progress/+page.svelte` - Updated isAdmin, added dev to role selector
- `src/lib/components/MainQuiz.svelte` - Updated canEdit
- `src/routes/admin/+page.svelte` - Added dev check
- `src/lib/components/MobileMenu.svelte` - Updated canEdit

#### 3. Admin Progress Page
- **Removed role and plan columns from main table** - cleaner UI
- **Role/plan controls moved to student detail modal** - better UX
- **Dev role removed from dropdown** - can only be set via backend
- **Backend protection** - Only devs can assign/modify dev role

## Features for Dev Users

### 1. Cohort Switching
- Dev users see a cohort switcher in the navbar
- Can switch between any cohort in the system
- Page automatically reloads after switch to reflect new cohort context

### 2. Full Administrative Access
- Access to all admin pages and features
- Can edit/create/delete content across all cohorts
- Can manage user roles including promoting other users to dev

### 3. User Management
- Can assign any role (dev, admin, curator) to users
- Can manage user plans (pro, free)
- Full visibility into all student progress

## Setting Up Dev Users

### Method 1: Using CLI (Recommended for first dev)

```bash
# Set a user as dev using their Clerk user ID
bunx convex run migrations:bootstrapDev '{"clerkUserId": "user_xxxxx"}'
```

### Method 2: ~~Using Admin UI~~ (REMOVED)

**The dev role can NO LONGER be assigned through the UI.** This is by design for security.

Only use backend methods (CLI or migrations) to assign dev role.

### Method 3: Using Direct Mutation

```bash
# If you know the Convex user ID
bunx convex run users:updateUserRoleAndPlan '{"userId": "<convex_user_id>", "role": "dev"}'
```

## Migration Notes

### Users Who Were "Developer" in Clerk

If you previously had users with `publicMetadata.view === 'developer'` in Clerk:

1. These users will **NOT** automatically become dev in Convex
2. You must manually set their role using one of the methods above
3. The old Clerk metadata is no longer checked by the system

### Finding Your Clerk User ID

To set someone as dev, you need their Clerk user ID:

1. **Option A**: Check the Clerk Dashboard
   - Go to Users section
   - Find the user
   - Copy their User ID (starts with `user_`)

2. **Option B**: Have them log in and check the database
   ```bash
   bunx convex run users:getUserById '{"id": "user_xxxxx"}'
   ```

## UI/UX Improvements

### Cleaner Admin Progress Page
- **Role and Plan columns removed** from main student table
- Table now focuses on key info: name, last sign-in, join date
- Click any student row to open detailed modal

### Student Detail Modal
- Role and plan controls moved here for better organization
- Only visible to admin+ users
- **Self-protection**: Account Management section **completely hidden** when viewing own profile
- **Intelligent role filtering**: Dropdown only shows roles below your level
- **Hierarchy enforcement**: Can't edit users at or above your level (selector disabled with message)
- Dev role shown with warning badge if present (can't be changed in UI)

### Role Selector Behavior

**For Dev users:**
- **Own profile**: Account Management section hidden entirely
- **Other devs**: Account Management hidden (cannot manage same level)
- **Other users**: Can see Student, Curator, Admin options
- **Plan control**: Active - can change any user's plan
- Can edit: Anyone except devs and self

**For Admin users:**
- **Own profile**: Account Management section hidden entirely
- **Students/Curators**: Can see Student, Curator options (toggle only)
- **Other admins/devs**: Role selector disabled with message
- **Plan control**: Disabled - "Only devs can change plans"
- Can edit: Only students and curators (toggle between these two)

**For Curator users:**
- Cannot see Account Management at all (not admin+)
- Content editing only

### Visual Feedback

**Role Dropdown:**
- **Dev viewing student/curator/admin**: Shows Student, Curator, Admin (all options)
- **Admin viewing student/curator**: Shows Student, Curator (toggle options only)
- **Admin viewing admin/dev**: Disabled with "Cannot manage admins or devs"
- **Own profile**: Entire section hidden

**Plan Dropdown:**
- **Dev**: Active selector with Free/Pro options
- **Admin**: Disabled selector with "Only devs can change plans"
- **Own profile**: Entire section hidden

**Special Cases:**
- **Dev role badge**: "⚠️ Dev role (backend only)" shown but selector disabled
- **Own profile**: No Account Management section at all

## Security Considerations

### Dev Role Should Be Rare
- Only assign dev role to trusted administrators
- Dev users can access ALL cohorts and ALL data
- ~~Dev users can promote other users to dev~~ **REMOVED** - Only backend can assign dev

### Backend Protection

The `updateUserRoleAndPlan` mutation enforces these rules:

1. **Self-Protection Rule** (applies to everyone)
   ```typescript
   if (caller?._id === args.userId && args.role !== undefined) {
     throw new Error('You cannot change your own role');
   }
   ```
   - Prevents accidental self-demotion
   - Prevents privilege escalation
   - Applies to ALL users including devs

2. **Dev Bypass** (devs can do anything)
   ```typescript
   if (callerRole === 'dev') {
     // Can change any role (except other devs and self)
     // Can change any plan
     // Full access granted
   }
   ```

3. **Admin Restrictions** (cohort leaders)
   ```typescript
   // Can only manage students and curators
   if (targetCurrentRole === 'admin' || targetCurrentRole === 'dev') {
     throw new Error('Admins cannot manage other admins or devs');
   }
   
   // Can only assign student or curator roles
   if (targetNewRole === 'admin' || targetNewRole === 'dev') {
     throw new Error('Admins can only assign student or curator roles');
   }
   
   // Cannot change plans
   if (args.plan !== undefined) {
     throw new Error('Only devs can change user plans');
   }
   ```

4. **Curator/Student Block** (no permissions)
   ```typescript
   throw new Error('You do not have permission to manage roles');
   ```

### Audit Trail
- Consider adding logging for role changes
- Monitor cohort switching activity
- Track when devs access different cohorts

### Best Practices
1. Only assign dev to 1-3 core team members
2. Use admin role for most administrative tasks
3. Use curator role for content creators
4. Regular users should have no role field
5. **Never expose dev role assignment in UI**

## Testing Your Setup

After implementing dev role:

1. **Set yourself as dev**:
   ```bash
   bunx convex run migrations:bootstrapDev '{"clerkUserId": "your_clerk_user_id"}'
   ```

2. **Log in and verify**:
   - You should see a "Dev" badge on your profile
   - Navbar should show cohort switcher
   - You can access all admin pages
   - You can switch between cohorts

3. **Test role assignment**:
   - Go to Admin > Class Progress
   - Click on a student to open detail modal
   - Try assigning curator/admin roles to test users
   - Verify they receive appropriate access
   - Confirm dev option is NOT in the dropdown

## Common Scenarios & Edge Cases

### Scenario 1: Admin Delegates to Curator
**Setup:** Admin promotes a student to curator
**Action:** Admin clicks student → Changes role to Curator
**Result:** ✅ Success
**Reason:** Admins can toggle between student ↔ curator

### Scenario 2: Admin Tries to Promote to Admin
**Setup:** Admin tries to promote curator to admin
**Action:** Admin clicks curator → Admin option not in dropdown
**Result:** ❌ Blocked by UI (admin not shown in dropdown)
**Backend:** Even if bypassed, returns "Admins can only assign student or curator roles"
**Solution:** A dev must promote them

### Scenario 3: Admin Tries to Change Plan
**Setup:** Admin tries to change a student's plan to pro
**Action:** Admin clicks student → Plan selector is disabled
**Result:** ❌ Plan selector disabled
**Message:** "Only devs can change plans"
**Reason:** Plans are dev-only feature

### Scenario 4: Admin Tries to Manage Another Admin
**Setup:** Admin clicks on another admin's profile
**Action:** Views their profile
**Result:** ❌ Role selector disabled
**Message:** "Cannot manage admins or devs"
**Reason:** Admins cannot manage same-level users

### Scenario 5: Dev Promotes Student to Admin
**Setup:** Dev promotes a student to admin
**Action:** Dev clicks student → Changes role to Admin
**Result:** ✅ Success
**Reason:** Devs can assign any role (student, curator, admin)

### Scenario 6: Dev Changes User Plan
**Setup:** Dev changes a user's plan to pro
**Action:** Dev clicks user → Changes plan to Pro
**Result:** ✅ Success
**Reason:** Only devs can manage plans

### Scenario 7: Anyone Tries Own Profile
**Setup:** Any admin/dev clicks on their own profile
**Result:** ❌ Account Management section completely hidden
**Visible:** Only progress stats and personal info
**Reason:** Self-protection - nobody can change their own role/plan

## Important Implications

### Dev Role is Permanent (by design)
- Once someone is a dev, they **cannot demote themselves**
- Another dev also **cannot demote them** (same level protection)
- **Only way to remove dev**: Direct database access or CLI with system permissions

### Need to Change Dev Users?
If you need to demote a dev or if the only dev needs to step down:

**Option 1: Emergency Bootstrap (Recommended)**
```bash
# Promote a trusted admin to dev first
bunx convex run migrations:bootstrapDev '{"clerkUserId": "new_dev_user_id"}'

# Now the new dev can manage the old dev via database
```

**Option 2: Direct Database Manipulation**
```bash
# Only use in emergencies - requires careful ID verification
bunx convex run migrations:updateUserRole '{"userId": "<convex_id>", "role": "admin"}'
```

**Option 3: Create Custom Migration**
Add a migration in `src/convex/migrations.ts` that bypasses normal auth:
```typescript
export const emergencyDemoteDev = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    // This bypasses normal auth checks
    const user = await ctx.db.query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
      .first();
    
    if (!user) throw new Error('User not found');
    
    await ctx.db.patch(user._id, { 
      role: 'admin', // or undefined for student
      updatedAt: Date.now() 
    });
    
    return { success: true, previousRole: user.role };
  }
});
```

### Why This Design?
1. **Prevents Accidents**: No one can accidentally demote themselves
2. **Audit Trail**: Role changes require deliberate backend actions for devs
3. **Security**: Harder for compromised accounts to demote admins
4. **Intentional Friction**: Dev role changes should be rare and deliberate

## Troubleshooting

### Cohort Switcher Not Appearing
- Check that `role` field is exactly `'dev'` (not `'developer'`)
- Verify user data is loaded: check browser console for errors
- Clear browser cache and reload

### Can't Access Admin Pages
- Verify role is set in Convex database
- Check server hooks are updated
- Ensure no auth errors in server logs

### Can't Assign Dev Role Through UI
- **This is intentional!** Dev role can only be set via backend
- Use CLI: `bunx convex run migrations:bootstrapDev '{"clerkUserId": "user_xxxxx"}'`
- If a user has dev role, it shows with a warning badge but can't be changed in UI

## Future Enhancements

Potential additions for dev role:

1. **Audit logging**: Track all dev actions across cohorts
2. **System settings**: Access to global configuration
3. **Analytics dashboard**: Cross-cohort analytics and insights
4. **Bulk operations**: Mass updates across multiple cohorts
5. **User impersonation**: View system as another user (for debugging)

## Summary

The dev role provides super-admin capabilities with cohort-switching superpowers. It's designed for core team members who need to manage the entire platform across all cohorts.

**Key Points**:
- ✅ Dev > Admin > Curator > User hierarchy
- ✅ Cohort switching enabled for dev users
- ✅ Manual role assignment (no automatic migration)
- ✅ Full access to all features and data
- ⚠️ Assign sparingly to trusted team members only
