# Fix Admin Access - Step by Step Guide

## Root Cause Identified ✅

**Two critical database issues preventing admin access:**

### 1. **Infinite Recursion in RLS Policies** (CRITICAL)

- Error: `'infinite recursion detected in policy for relation "profiles"'`
- Cause: Admin policies in `002_profiles.sql` query `profiles` table within `profiles` RLS policy
- Result: Any profile read causes infinite loop → 500 error → profile = null → redirect to /dashboard

### 2. **Missing `session_date` Column in timesheet_sessions**

- Error: `'column "session_date" of relation "timesheet_sessions" does not exist'`
- Cause: V3 spec requires generated column, but `016_timesheet_engine_schema.sql` didn't create it
- Result: Timesheet tracking fails on login

---

## Fix Instructions

### STEP 1: Run Migration 023

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy/paste the entire contents of:
   ```
   supabase/migrations/023_fix_rls_recursion_and_timesheet.sql
   ```
4. Click **"Run"**
5. Wait for success message

**What this migration does:**

- ✅ Creates `is_admin()` helper function with SECURITY DEFINER (bypasses RLS)
- ✅ Drops recursive admin policies
- ✅ Recreates admin policies using `is_admin()` function (no recursion)
- ✅ Adds `session_date` generated column to `timesheet_sessions`
- ✅ Adds `duration_seconds` generated column to `timesheet_sessions`
- ✅ Updates `start_session()` RPC to work with generated columns
- ✅ Creates proper indexes

---

### STEP 2: Verify Admin Role

After migration, verify the admin user has correct role:

```sql
SELECT id, email, role, join_date
FROM profiles
WHERE email = 'admin@tantechllc.com';
```

**Expected result:**

- `role` column should show **'admin'**

**If role is NULL or 'employee', run:**

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@tantechllc.com';
```

---

### STEP 3: Clear Browser Cache & Test

1. **Clear localStorage:**
   - Open DevTools Console (F12)
   - Type: `localStorage.clear()`
   - Type: `sessionStorage.clear()`

2. **Hard refresh:**
   - Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

3. **Test admin login:**
   - Go to `/login`
   - Click **"Admin Access"** tab
   - Email: `admin@tantechllc.com`
   - Password: `Admin@Tantech23`
   - Click "Sign In"

4. **Expected behavior:**
   - ✅ No console errors
   - ✅ Redirect to `/admin` (not `/dashboard`)
   - ✅ Admin dashboard loads successfully
   - ✅ No infinite recursion errors

---

## Technical Details

### Why This Fix Works

**Before (Broken):**

```sql
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles         -- 🔥 RECURSION!
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

To check if user can SELECT from profiles:

1. RLS checks policy
2. Policy runs `SELECT FROM profiles`
3. This triggers RLS check again
4. Infinite loop → stack overflow → 500 error

**After (Fixed):**

```sql
-- Helper function with SECURITY DEFINER (bypasses RLS)
CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ SECURITY DEFINER;

-- Policy uses helper function (no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());  -- ✅ No recursion!
```

The `SECURITY DEFINER` flag makes the function run with elevated privileges, bypassing RLS entirely. This breaks the circular dependency.

---

## Troubleshooting

### If admin login still redirects to /dashboard:

1. **Check console for errors**
   - Open DevTools → Console
   - Look for "Error fetching profile:" messages
   - Share the error code/message

2. **Verify migration ran successfully**

   ```sql
   -- Check if is_admin() function exists
   SELECT proname FROM pg_proc WHERE proname = 'is_admin';

   -- Check if session_date column exists
   SELECT column_name, data_type, is_generated
   FROM information_schema.columns
   WHERE table_name = 'timesheet_sessions'
   AND column_name = 'session_date';
   ```

3. **Check RLS policies**

   ```sql
   SELECT policyname, qual
   FROM pg_policies
   WHERE tablename = 'profiles'
   AND policyname LIKE '%Admin%';
   ```

   Should show: `qual` contains `is_admin()` function (not recursive SELECT)

---

## Success Criteria

After applying the fix, you should see:

✅ No console errors mentioning "infinite recursion"  
✅ No 500 errors on profile fetch  
✅ Admin user redirects to `/admin` after login  
✅ Timesheet tracking starts without errors  
✅ Admin dashboard loads with course management tools

---

## Files Changed in This Fix

- **Created:** `supabase/migrations/023_fix_rls_recursion_and_timesheet.sql`
- **Created:** `FIX_ADMIN_ACCESS.md` (this file)
- **Created:** `DIAGNOSTIC_REPORT.md` (diagnostic analysis)

---

## Next Steps After Fix

Once admin access works:

1. **Test admin features:**
   - Course creation
   - User management
   - Timesheet analytics

2. **Seed demo data** (if needed):
   - Run seed scripts for courses, modules, content

3. **Continue V3 development:**
   - Complete remaining gap-fill features
   - Test end-to-end learner experience

---

Need help? Check console errors and refer to `DIAGNOSTIC_REPORT.md` for detailed analysis.
