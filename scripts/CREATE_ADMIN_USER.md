# Creating Admin User

To create the admin user, follow these steps:

## Admin Credentials

- **Email**: `admin@tntechllc.com`
- **Password**: `Admin@Tantech23`
- **Role**: admin

## 1. Get Your Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **wsueekkqtmykiqltxprc**
3. Navigate to **Settings → API** (left sidebar)
4. Under "Project API keys", copy the **"Service Role Secret"** key (the longer one, not the Anon key)

## 2. Run the Setup Script

```bash
# On Windows (PowerShell):
$env:SUPABASE_SERVICE_ROLE_KEY='<paste_your_service_role_key_here>'
node scripts/create-admin-user.js

# On Mac/Linux:
export SUPABASE_SERVICE_ROLE_KEY='<paste_your_service_role_key_here>'
node scripts/create-admin-user.js
```

## 3. Verify in Supabase Dashboard

After the script completes:

1. Go to Supabase Dashboard → **Authentication → Users**
2. You should see `admin@tntechllc.com` with role **admin**

---

## Login Behavior

- **Admin login**: Select the "Admin" tab on the login page → redirects to `/admin` dashboard
- **Employee login**: Select the "Employee" tab → redirects to `/dashboard`
- Admins are automatically redirected from `/dashboard` to `/admin`
- Non-admins attempting admin login will see "Access denied" error

## Manual Setup (Alternative)

If the script doesn't work, you can manually create the admin:

1. Go to Supabase Dashboard → **Authentication → Users**
2. Click **Add User → Create New User**
3. Enter email: `admin@tntechllc.com`, password: `Admin@Tantech23`
4. Check "Auto Confirm User"
5. Click Create
6. Go to **Table Editor → profiles**
7. Find the new user's row and update `role` to `admin`
