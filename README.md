# TanTech Upskill Platform

A Coursera-style internal employee upskilling platform built with React 18, Vite, Supabase, and TailwindCSS.

## 🚀 Features

### Core Platform

- **Authentication & Authorization**: Supabase Auth with role-based access (employee/admin)
- **Progress Tracking**: Automatic progress tracking with module completion and course progression
- **Content Types**: Support for video, reading, code challenges, and milestone projects
- **36-Month Learning Journey**: Visual timeline with 36 horizontal slots representing the complete learning path
- **Milestone Projects**: GitHub repository submissions with admin review workflow

### Video Streaming System (NEW)

- **Secure On-Prem Video Hosting**: JWT-authenticated video streaming from local file server
- **Range Request Support**: Full video seeking capability with HTTP Range headers
- **Enrollment-Based Access**: Videos only accessible to enrolled learners
- **Short-Lived Tokens**: 2-hour expiration for enhanced security

### Timesheet & Incentives (V3)

- **Automatic Time Tracking**: Session tracking with visibility API integration
- **Weekly Targets**: Configurable time goals (global default + per-user overrides)
- **Streak System**: Bronze/Silver/Gold/Platinum badges for consistent learning
- **Gamification**: Badge awards for milestones, quiz aces, speed learning, and early bird sessions

### Design & UX

- **Framer Motion Animations**: 18 microinteractions including page transitions, completion bursts, confetti
- **shadcn/ui Components**: Consistent, accessible UI components
- **Dark Mode**: Full dark mode support with Tailwind color system
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

## 🛠️ Tech Stack

**Frontend**

- React 18 with Vite
- React Router v6
- TailwindCSS
- shadcn/ui
- Framer Motion
- react-markdown + react-syntax-highlighter

**Backend**

- Supabase (PostgreSQL + Auth + RLS)
- Supabase Edge Functions (Deno)
- Node.js/Express file server for video streaming

**State Management**

- React Context + useReducer
- Custom hooks (useProgress, useToast)

**Video System**

- On-prem Node.js/Express file server
- JWT authentication
- HTTP Range requests for seeking

## 📁 Project Structure

```
ttlmsss/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── Timeline.jsx     # 36-slot learning timeline
│   │   ├── VideoPlayer.jsx  # Authenticated video player
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx  # Authentication state
│   ├── hooks/
│   │   ├── useProgress.js   # Progress tracking hook
│   │   └── useToast.js      # Toast notifications
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ModuleViewerPage.jsx
│   │   └── AdminPage.jsx
│   ├── lib/
│   │   ├── supabase.js      # Supabase client
│   │   └── utils.js         # Utility functions
│   └── App.jsx              # Router setup
├── supabase/
│   ├── migrations/          # 9 SQL migration files
│   │   ├── 001_enums.sql
│   │   ├── 002_profiles.sql
│   │   ├── 003_courses_sections_modules.sql
│   │   ├── 004_content_progress.sql
│   │   ├── 005_enrollments_events.sql
│   │   ├── 006_timesheet_targets.sql
│   │   ├── 007_badges_streaks.sql
│   │   ├── 008_module_content_extensions.sql
│   │   └── 009_add_video_local_path.sql
│   └── functions/
│       └── sign-video-url/  # Video token signing function
├── file-server/             # Standalone video streaming server
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── VIDEO_STREAMING.md       # Video system architecture
├── VIDEO_IMPLEMENTATION.md  # Implementation notes
└── README.md                # This file
```

## 🚦 Getting Started

### Prerequisites

- Node.js 20.12+ (for Vite 5 compatibility)
- npm or pnpm
- Supabase account
- (Optional) Video file storage for streaming feature

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ttlmsss
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FILE_SERVER_URL=http://localhost:4000
```

4. **Run Supabase migrations**

```bash
supabase db push
```

5. **Deploy Edge Functions** (for video streaming)

```bash
supabase functions deploy sign-video-url
```

6. **Set up file server** (for video streaming)

```bash
cd file-server
npm install
cp .env.example .env
# Edit file-server/.env with your configuration
npm start
```

7. **Start development server**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🗄️ Database Schema

### Core Tables

- **profiles**: User profiles with role, join_date, last_seen_at
- **courses**: Course catalog with skill tags
- **sections**: Course sections with sequence
- **modules**: Learning modules (video, reading, code, milestone)
- **content_blocks**: Rich content within modules
- **progress**: User progress tracking with status (locked/in_progress/completed/pending_review)
- **enrollments**: Course enrollment records
- **milestone_submissions**: Project submissions with admin review

### V3 Tables (Timesheet & Incentives)

- **timesheet_sessions**: Automatic time tracking with start/end timestamps
- **time_targets**: Weekly hour targets (global + per-user)
- **incentive_badges**: Badge definitions (time_streak, module_complete, quiz_ace, etc.)
- **user_badges**: Awarded badges with context JSON
- **weekly_streaks**: Streak tracking (current + longest)

### Video Streaming

- **modules.video_local_path**: Relative path to video file

## 🎬 Video Streaming System

The platform includes a secure on-premise video streaming system. See [VIDEO_STREAMING.md](./VIDEO_STREAMING.md) for complete documentation.

**Quick overview:**

1. User requests video in ModuleViewer
2. Edge Function validates auth + enrollment, signs JWT token
3. React fetches video stream with signed token
4. File server validates JWT and streams video with Range support

**Security features:**

- JWT authentication (2-hour expiration)
- Enrollment-based authorization
- Path traversal prevention
- CORS protection

## 🎨 Microinteractions

The platform implements 18+ Framer Motion microinteractions:

- Page transitions with slide animations
- Module completion particle burst
- Quiz pass confetti cannon
- Progress bar animated fills with counting numbers
- Streak counter bounce animation
- Button press ripples
- Card hover lift effects
- Badge award toasts with shimmer
- Timeline stagger entrance
- Skeleton to content fade transitions

See master context for full catalogue.

## 🔒 Security

### Authentication

- Supabase JWT-based authentication
- Row-Level Security (RLS) on all tables
- Role-based access control (employee/admin)

### Video Streaming

- JWT verification on every request
- Enrollment validation before video access
- Path traversal attack prevention
- Short-lived tokens (2-hour expiration)

### Database Policies

- Employees: Read/write own data only
- Admins: Full access via service role
- Public: No access (all tables behind RLS)

## 📊 Progress Tracking

### Automatic Progression

- First module unlocked on enrollment
- Modules progress via `unlock_next_module` RPC
- Status transitions: locked → in_progress → completed
- Course completion tracked automatically

### Milestone Projects

- Requires GitHub URL + optional hosted URL
- Status: pending_review until admin approval
- Blocks progression until reviewed

## 🎯 Weekly Targets & Streaks

### Time Tracking

- Automatic session tracking (visibility API)
- Sessions < 30 seconds ignored
- Aggregated by day for weekly totals

### Streak System

- Cron job runs every Monday 00:00 UTC
- Compares hours vs weekly_hours_target
- Awards badges based on consecutive weeks met:
  - 1 week → Bronze "Week Warrior"
  - 4 weeks → Silver "Month Master"
  - 8 weeks → Gold "Gold Learner"
  - 16 weeks → Platinum "Platinum Scholar"

## 🚀 Deployment

### Frontend (React)

```bash
npm run build
# Deploy dist/ to Vercel, Netlify, or static host
```

### Supabase

- Migrations applied via `supabase db push`
- Edge Functions deployed via `supabase functions deploy`
- Configure secrets in Supabase dashboard

### File Server

- Deploy on Linux VM or Docker
- Use systemd for process management
- Nginx reverse proxy with SSL
- Mount video storage (NFS, S3-compatible)

See [VIDEO_STREAMING.md](./VIDEO_STREAMING.md) for production deployment details.

## 🧪 Testing

### Manual Testing Checklist

- [ ] User signup and login
- [ ] Dashboard loads with progress
- [ ] Timeline displays 36 slots correctly
- [ ] Module viewer renders markdown + code highlighting
- [ ] Video player loads and seeks properly
- [ ] Milestone submission workflow
- [ ] Admin access to /admin
- [ ] Badge awards on module completion
- [ ] Timesheet tracking on session start/end

### Build Verification

```bash
npm run build
# Check for errors, warnings about chunk size are expected
```

## 📝 TODO / Future Enhancements

### High Priority

- [ ] Admin course builder UI (create/edit courses)
- [ ] Admin video path configuration interface
- [ ] Timesheet tracking hook (useTimesheet with visibility API)
- [ ] Course enrollment flow
- [ ] Quiz and code challenge components

### Medium Priority

- [ ] Video progress tracking (watch time, completion %)
- [ ] Adaptive video streaming (HLS/DASH)
- [ ] Caption/subtitle support (WebVTT)
- [ ] User profile page with stats
- [ ] Skills earned visualization

### Low Priority

- [ ] Email notifications (Resend API integration)
- [ ] Mobile app (React Native)
- [ ] Offline mode support
- [ ] AI-powered learning recommendations

## 🤝 Contributing

This is an internal TanTech project. For questions or issues, contact the development team.

## 📄 License

Internal use only - TanTech Corporation

## 🙏 Acknowledgments

Built with:

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Framer Motion](https://www.framer.com/motion/)

---

**Version**: 1.0.0 (V3 with video streaming)  
**Last Updated**: 2025  
**Status**: ✅ Core features complete, admin UI pending
