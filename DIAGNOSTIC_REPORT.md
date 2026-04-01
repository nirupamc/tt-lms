# ADMIN ACCESS DIAGNOSTIC REPORT

## STEP 1: Database Verification

**ACTION REQUIRED:** Run the queries in `diagnostic-queries.sql` in Supabase SQL Editor

Expected results:

- profiles table should return: role = 'admin'
- auth.users table should return: matching email
- UUID should match between both tables

## STEP 2: AuthContext Role Fetching Analysis

### ✅ FOUND: Role fetching code (lines 58-74)

```javascript
const fetchProfile = useCallback(async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*") // ✅ GOOD: Fetches all columns including role
      .eq("id", userId)
      .single();

    if (error) throw error;
    dispatch({ type: "SET_PROFILE", payload: data });
    return data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null; // ⚠️ BUG D: Returns null on error (silently swallows RLS failures)
  }
}, []);
```

### ✅ Role is read from profiles table (lines 227-228)

```javascript
isAdmin: state.profile?.role === "admin",
isEmployee: state.profile?.role === "admin",
```

### BUG ANALYSIS:

- ❌ **BUG D CONFIRMED**: fetchProfile returns `null` on RLS error (line 72)
  - If RLS blocks the query, profile becomes null
  - isAdmin becomes `null?.role === "admin"` → `false`
  - User gets redirected to /dashboard

### Authentication flow (lines 202-214):

```javascript
supabase.auth.onAuthStateChange(async (event, session) => {
  dispatch({ type: "SET_SESSION", payload: { session } });

  if (session?.user) {
    await fetchProfile(session.user.id); // ✅ Awaits properly

    if (event === "SIGNED_IN") {
      await updateLastSeen(session.user.id);
    }
  } else {
    dispatch({ type: "SET_PROFILE", payload: null });
  }
});
```

- ✅ No race condition (BUG A): Properly checks session?.user
- ✅ Not reading from user_metadata (BUG B): Fetches from profiles table
- ✅ No silent fallback (BUG C): Uses optional chaining correctly
- ❌ **BUG D**: Silent error swallowing in catch block

## STEP 3: AdminRoute Component Analysis

### Code (lines 77-99):

```javascript
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <SkeletonFade isLoading={true} skeleton={<PageSkeleton />}>
        {null}
      </SkeletonFade>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Non-admin users are redirected to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

### BUG ANALYSIS:

- ✅ No BUG E: Has loading guard (lines 81-90)
- ✅ No BUG F: Waits for loading to complete before checking role
- ✅ Logic order is correct: loading → authentication → admin check

**CONCLUSION:** AdminRoute is correctly implemented!

## STEP 4: RLS Policies Check

**ACTION REQUIRED:** Run the RLS query in `diagnostic-queries.sql`

Expected: Should have a policy allowing users to SELECT their own profile row.

## ROOT CAUSE HYPOTHESIS

Based on code analysis, the most likely issue is **ONE** of these:

### HYPOTHESIS A: Role is not 'admin' in database

- **Symptom:** profile.role = 'employee' or NULL
- **Fix:** `UPDATE profiles SET role = 'admin' WHERE email = 'admin@tantechllc.com';`

### HYPOTHESIS B: RLS policy blocks profile fetch

- **Symptom:** fetchProfile returns null due to RLS denial
- **Silent failure:** Error logged to console but profile becomes null
- **isAdmin check:** `null?.role === 'admin'` → false → redirect to /dashboard
- **Fix:** Add/fix RLS policy for profiles table

### HYPOTHESIS C: Profile row doesn't exist

- **Symptom:** auth.users has row, but profiles doesn't
- **Cause:** Database trigger failed to create profile on user creation
- **Fix:** Manually INSERT profile row with role='admin'

## NEXT STEPS

1. **Run diagnostic-queries.sql** in Supabase SQL Editor
2. **Check browser console** for "Error fetching profile:" message during login
3. **Report findings:**
   - What does Query 1 return? (profile row)
   - What does Query 2 return? (auth.users row)
   - What does Query 3 return? (UUID match)
   - What does Query 4 return? (RLS policies)
   - Any console errors during login?

4. **Apply targeted fix** based on findings

## EXPECTED OUTCOMES

### If Query 1 shows role = 'employee':

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@tantechllc.com';
```

### If Query 1 returns 0 rows:

```sql
INSERT INTO profiles (id, email, full_name, role, join_date)
SELECT id, email, 'Admin User', 'admin', CURRENT_DATE
FROM auth.users
WHERE email = 'admin@tantechllc.com';
```

### If RLS policies block SELECT:

```sql
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```
