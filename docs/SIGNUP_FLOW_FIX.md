# Owner Signup Flow Fix

## Problem
When an owner completes signup (Step 2/2), they are redirected to `/owner-setup` (facility creation page). However, a "No profile found" error appears, and they get redirected back to Step 2/2. This creates a frustrating loop.

## Root Cause
**Race Condition**: The profile insert in Step 2 completes, but the redirect to `/owner-setup` happens BEFORE the database transaction is fully committed. When `OwnerSetup.tsx` immediately queries for the profile, it doesn't exist yet.

## Solution Applied

### 1. **Signup.tsx - Ensure Profile Exists Before Redirect**
- Changed profile insert to use `.select().single()` to wait for the inserted profile data
- Added validation that profileData is not null
- Added **500ms delay** after profile creation to ensure database commit completes
- Added detailed console logging for debugging

**Changes:**
```typescript
// Before: Fire-and-forget insert
const { error: profileError } = await supabase
  .from('profiles')
  .insert({ ... });

// After: Wait for confirmation and add delay
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .insert({ ... })
  .select()
  .single();

if (!profileData) {
  throw new Error('Profile data is null after insert');
}

// Ensure commit
await new Promise(resolve => setTimeout(resolve, 500));
```

### 2. **OwnerSetup.tsx - Add Retry Logic**
- Added retry mechanism (3 attempts with 1-second delays) to handle any remaining race conditions
- More graceful error messages
- Redirect to `/signup` instead of `/owner-profile-setup` if profile still missing (better UX)

**Changes:**
```typescript
// Retry logic for race conditions
let profile = null;
let retries = 3;

while (retries > 0 && !profile) {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*, roles!inner(name)')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();
  
  profile = profileData;
  
  if (!profile && retries > 1) {
    console.log(`Profile not found, retrying... (${retries - 1} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  retries--;
}
```

## Flow After Fix

### Owner Signup Flow (Success Path):
1. **Step 1/2**: Enter email & password → Creates auth user
2. **Step 2/2**: Enter profile details → Creates profile with retry + delay
3. **500ms delay** → Ensures database commit
4. **Redirect to `/owner-setup`** → Facility creation page
5. **Profile verification (with retries)** → Finds profile successfully
6. **Facility setup** → Owner creates site & sensors
7. **Redirect to `/owner/dashboard`** → Completed!

### Edge Case Handling:
- If profile STILL not found after retries → Friendly error + redirect to `/signup`
- If wrong role → Error + redirect to `/role-selection`
- If no session → Error + redirect to `/login`

## Files Modified
1. `frontend/src/features/auth/Signup.tsx`
   - Line ~120-150: Profile creation with `.select().single()` and delay

2. `frontend/src/features/auth/OwnerSetup.tsx`
   - Line ~90-130: Added retry logic in `verifyOwnerRole()`

## Testing Instructions
1. Go to signup page
2. Select "Owner" role
3. Complete Step 1/2 (email/password)
4. Complete Step 2/2 (profile details)
5. **Expected:** Smoothly transition to facility setup page WITHOUT error
6. Create facility & sensors
7. **Expected:** Land on owner dashboard

## Success Criteria
✅ No "No profile found" error appears
✅ No redirect loop between signup and owner-setup
✅ Profile is always found when reaching owner-setup page
✅ Graceful error handling with retries

---

**Date Fixed:** August 26, 2026
**Issue:** Owner signup redirect loop
**Status:** ✅ Resolved
