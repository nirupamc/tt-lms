# Quick Start Guide - TanTech Upskill Platform

Get the platform running in 5 minutes.

## 1. Prerequisites Check

```bash
# Check Node.js version (need 20.12+)
node --version

# Check npm
npm --version

# Install Supabase CLI (if not installed)
npm install -g supabase
```

## 2. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd ttlmsss

# Install React app dependencies
npm install

# Install file server dependencies
cd file-server
npm install
cd ..
```

## 3. Supabase Setup

### Option A: Use existing Supabase project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Copy your project URL and anon key
3. Copy JWT secret from Settings > API

### Option B: Local Supabase (Docker required)

```bash
# Start local Supabase
supabase start

# Note the credentials printed
# API URL: http://localhost:54321
# Anon key: eyJhb...
# Service role key: eyJhb...
```

## 4. Environment Configuration

### React App (.env)

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_FILE_SERVER_URL=http://localhost:4000
```

### File Server (file-server/.env)

```bash
cd file-server
cp .env.example .env
```

Edit `file-server/.env`:

```env
FILE_SERVER_PORT=4000
SUPABASE_JWT_SECRET=your-jwt-secret-here
ASSETS_BASE_PATH=C:/tantech/videos
ALLOWED_ORIGIN=http://localhost:5173
```

**Create video directory:**

```bash
# Windows
mkdir C:\tantech\videos

# Mac/Linux
mkdir -p /opt/tantech/videos
```

## 5. Database Setup

### Run migrations

```bash
# If using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor:
# Copy/paste each file from supabase/migrations/ in order:
# 001, 002, 003, 004, 005, 006, 007, 008, 009
```

### Deploy Edge Function

```bash
supabase functions deploy sign-video-url
```

## 6. Seed Test Data (Optional)

Run in Supabase SQL Editor:

````sql
-- Create test admin user (manually set in auth.users after signup)
-- Or create via UI and then update:
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@tantech.com';

-- Create test course
INSERT INTO courses (id, title, description, skill_tag) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Git & GitHub Mastery', 'Learn version control from scratch', 'git');

-- Create section
INSERT INTO sections (id, course_id, title, sequence_number) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Introduction to Git', 1);

-- Create module
INSERT INTO modules (id, section_id, title, description, module_type, content_body, sort_order, duration_minutes) VALUES
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'What is Git?', 'Understanding version control', 'reading',
'# What is Git?

Git is a distributed version control system that tracks changes in source code during software development.

## Key Concepts

- **Repository**: A directory tracked by Git
- **Commit**: A snapshot of changes
- **Branch**: A parallel version of the repository
- **Merge**: Combining branches together

```bash
# Initialize a repository
git init

# Add files to staging
git add .

# Commit changes
git commit -m "Initial commit"
````

## Benefits

1. Track history of changes
2. Collaborate with teams
3. Revert to previous versions
4. Work on features in isolation

Ready to dive in? Let''s get started!', 1, 15);

````

## 7. Start Development Servers

### Terminal 1: React App
```bash
npm run dev
````

Open [http://localhost:5173](http://localhost:5173)

### Terminal 2: File Server (for video streaming)

```bash
cd file-server
npm start
```

File server runs on port 4000

## 8. Test the Platform

### Create Account

1. Go to http://localhost:5173
2. Click "Sign Up"
3. Enter email: `test@tantech.com`
4. Password: `Test123!`
5. Full name: `Test User`

### Verify Dashboard

- Should see welcome message
- Timeline with 36 slots (all locked)
- Empty enrolled courses
- Overall progress: 0%

### Enroll in Course (SQL)

```sql
-- Enroll test user in test course
INSERT INTO enrollments (user_id, course_id)
SELECT id, '550e8400-e29b-41d4-a716-446655440000'
FROM profiles
WHERE email = 'test@tantech.com';
```

Refresh dashboard - should now see:

- Course in enrolled list
- First module "in_progress"
- Timeline slot 1 pulsing (current)

### View Module

- Click Timeline slot 1 or course title
- Should load module viewer
- Markdown renders with syntax highlighting
- "Mark Complete" button visible

### Test Admin Access

```sql
-- Make test user admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'test@tantech.com';
```

Navigate to [http://localhost:5173/admin](http://localhost:5173/admin) - should see admin panel.

## 9. Test Video Streaming (Optional)

### Add test video

```bash
# Copy a sample MP4 to assets directory
# Windows:
copy sample.mp4 C:\tantech\videos\test-intro.mp4

# Mac/Linux:
cp sample.mp4 /opt/tantech/videos/test-intro.mp4
```

### Update module with video path

```sql
UPDATE modules
SET video_local_path = 'test-intro.mp4'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';
```

### View module

- Refresh module viewer page
- Video player should appear above content
- Loading skeleton shows first
- Video loads and plays
- Seeking should work

## 10. Common Issues

### Build fails with "Cannot find module"

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection error

- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in `.env`
- Verify project is running (not paused)
- Check browser console for CORS errors

### Video won't load

- Ensure file server is running (`npm start` in file-server/)
- Check `ASSETS_BASE_PATH` points to correct directory
- Verify video file exists at path
- Check browser console for auth errors
- Verify `SUPABASE_JWT_SECRET` matches between Supabase and file-server/.env

### Migrations fail

```bash
# Reset database (WARNING: deletes all data)
supabase db reset

# Or manually drop tables in SQL Editor and re-run migrations
```

### Edge Function not found

```bash
# Redeploy function
supabase functions deploy sign-video-url

# Verify deployment in Supabase dashboard
```

### Port already in use

```bash
# Change ports in .env files
# React app: VITE runs on 5173 by default
# File server: change FILE_SERVER_PORT in file-server/.env

# Or kill processes
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill -9
```

## 11. Development Tips

### Hot Module Replacement

- React app supports HMR - changes reflect immediately
- File server requires restart for changes
- Edge Functions require redeployment

### Debugging

```bash
# React app errors: Check browser console
# Supabase errors: Check Network tab > Response
# File server errors: Check terminal running server
# Edge Function logs: Supabase Dashboard > Edge Functions > Logs
```

### Database Changes

```bash
# After modifying SQL:
supabase db diff --schema public > supabase/migrations/010_my_changes.sql
supabase db push
```

### Testing without video

- Video streaming is optional
- Platform works fully without video_local_path set
- Just won't show video player in modules

## 12. Next Steps

- [ ] Customize landing page (src/pages/HomePage.jsx)
- [ ] Add more test courses and modules
- [ ] Configure weekly time targets
- [ ] Set up badge triggers
- [ ] Build admin course management UI
- [ ] Deploy to production

## 📚 Documentation Reference

- [README.md](./README.md) - Full platform documentation
- [VIDEO_STREAMING.md](./VIDEO_STREAMING.md) - Video system architecture
- [VIDEO_IMPLEMENTATION.md](./VIDEO_IMPLEMENTATION.md) - Implementation notes
- Master context in prompts - Full feature specification

## 🆘 Need Help?

Common resources:

- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)

---

**Happy coding! 🚀**
