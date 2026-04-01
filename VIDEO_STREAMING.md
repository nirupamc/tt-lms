# On-Prem Video Streaming System

This system provides secure, authenticated video streaming for the TanTech Upskill Platform.

## Architecture Overview

```
React App                 Supabase Edge Function            File Server
---------                 ----------------------            -----------
   |                              |                              |
   |-- 1. Request video token --->|                              |
   |                              |-- 2. Verify user auth        |
   |                              |-- 3. Check enrollment        |
   |                              |-- 4. Sign JWT token          |
   |<-- 5. Return signed token ---|                              |
   |                                                             |
   |-- 6. Stream video with token --------------------------->   |
   |                                                             |-- 7. Verify JWT
   |                                                             |-- 8. Stream file
   |<-- 9. Video data (Range-aware) ----------------------------|
```

## Components

### 1. File Server (`/file-server/`)

Standalone Node.js/Express application that serves video files with JWT authentication.

**Features:**

- JWT token verification on every request
- Path traversal attack prevention
- HTTP Range request support for video seeking
- CORS configured for React app origin
- Content-Type detection for multiple video formats

**Setup:**

```bash
cd file-server
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

**Environment Variables:**

- `FILE_SERVER_PORT`: Port for file server (default: 4000)
- `SUPABASE_JWT_SECRET`: JWT secret from Supabase (Settings > API > JWT Secret)
- `ASSETS_BASE_PATH`: Absolute path to video files directory
- `ALLOWED_ORIGIN`: React app URL for CORS (e.g., http://localhost:5173)

### 2. Supabase Edge Function (`/supabase/functions/sign-video-url/`)

Deno Edge Function that generates short-lived JWT tokens for video access.

**Features:**

- Validates user authentication via Supabase JWT
- Checks course enrollment authorization
- Looks up module's `video_local_path`
- Returns signed JWT (2-hour expiration)

**Deployment:**

```bash
supabase functions deploy sign-video-url
```

### 3. React VideoPlayer Component (`/src/components/VideoPlayer.jsx`)

Client-side video player with authentication.

**Features:**

- Fetches signed token from Edge Function
- Creates Blob URL from authenticated stream
- Loading skeleton with Framer Motion animations
- Error handling with user-friendly messages
- Automatic cleanup of Blob URLs

**Usage:**

```jsx
<VideoPlayer moduleId="uuid-of-module" videoLocalPath="git/intro.mp4" />
```

## Database Schema

### modules table

Added column:

- `video_local_path` (TEXT, nullable): Relative path to video file

Example: `'git/intro.mp4'` resolves to `${ASSETS_BASE_PATH}/git/intro.mp4`

## Security

### Authentication Flow

1. User authenticates with Supabase
2. React requests signed token from Edge Function with Supabase JWT
3. Edge Function validates user and enrollment
4. Edge Function signs new JWT for file server (includes userId, moduleId, filePath)
5. React streams video with signed JWT
6. File server validates JWT on each request

### Security Features

- **JWT expiration**: Video tokens expire after 2 hours
- **Enrollment validation**: Users must be enrolled in the course
- **Path traversal prevention**: File paths are validated to prevent `../` attacks
- **CORS**: File server only accepts requests from configured origin
- **RLS**: Database policies ensure users can only access their own data

### Threat Mitigation

- ✅ Unauthorized access: JWT verification + enrollment check
- ✅ Token sharing: Short expiration (2 hours)
- ✅ Path traversal: Input validation with `path.resolve()` check
- ✅ CORS bypass: Strict origin validation
- ✅ Video download: `controlsList="nodownload"` on video element

## Admin Configuration

Admins can set `video_local_path` for each module in the Course Builder:

1. Navigate to `/admin/courses/[courseId]/modules`
2. Edit module settings
3. Set "Video Path" field (e.g., `git/intro.mp4`)
4. Video path is relative to `ASSETS_BASE_PATH`

## File Organization

Recommended structure:

```
${ASSETS_BASE_PATH}/
├── git/
│   ├── intro.mp4
│   ├── branching.mp4
│   └── merging.mp4
├── react/
│   ├── components.mp4
│   └── hooks.mp4
└── node/
    └── express-basics.mp4
```

## Testing

### 1. Start File Server

```bash
cd file-server
npm start
# Should see: 🎥 File Server running on port 4000
```

### 2. Deploy Edge Function

```bash
supabase functions deploy sign-video-url
```

### 3. Add Test Video

```bash
# Create test directory
mkdir -p /path/to/assets/test

# Add a sample video
cp sample.mp4 /path/to/assets/test/intro.mp4
```

### 4. Update Module

```sql
UPDATE modules
SET video_local_path = 'test/intro.mp4'
WHERE id = 'your-module-id';
```

### 5. View in Browser

Navigate to `/module/[module-id]` and verify:

- Video player loads with skeleton
- Video streams successfully
- Seeking works (Range requests)
- Error handling on invalid paths

## Troubleshooting

### Video doesn't load

1. Check file server is running: `curl http://localhost:4000/health`
2. Verify `ASSETS_BASE_PATH` is correct
3. Check file exists: `ls ${ASSETS_BASE_PATH}/path/to/video.mp4`
4. Verify `SUPABASE_JWT_SECRET` matches Supabase dashboard
5. Check browser console for errors

### "Unauthorized" error

1. Verify user is logged in
2. Check user is enrolled in the course
3. Verify Edge Function is deployed
4. Check `SUPABASE_JWT_SECRET` in file-server/.env

### "File not found" error

1. Verify `video_local_path` is set in database
2. Check path is relative (no leading `/`)
3. Verify file exists at `${ASSETS_BASE_PATH}/${video_local_path}`

### CORS error

1. Verify `ALLOWED_ORIGIN` in file-server/.env
2. Check React app URL matches exactly
3. Restart file server after .env changes

## Performance Optimization

### Recommended Practices

- Use modern video formats (MP4 H.264, WebM)
- Compress videos before uploading (HandBrake, FFmpeg)
- Target bitrate: 1-3 Mbps for 720p, 3-6 Mbps for 1080p
- Use adaptive streaming for longer videos (HLS/DASH)

### Scaling

For production deployment:

- Use a reverse proxy (nginx) in front of file server
- Implement rate limiting (express-rate-limit)
- Add caching headers for static assets
- Consider CDN for video distribution
- Monitor bandwidth usage

## Production Deployment

### File Server

1. Set up dedicated server (Linux VM, Docker)
2. Configure systemd service for auto-restart
3. Use nginx reverse proxy with SSL
4. Mount video storage (NFS, S3-compatible)
5. Set up monitoring (PM2, New Relic)

### Edge Function

1. Deploy via Supabase CLI: `supabase functions deploy`
2. Verify in Supabase dashboard
3. Set up Edge Function secrets (JWT_SECRET)
4. Monitor logs in Supabase dashboard

### Environment Variables

- Store in secure secret management (Vault, AWS Secrets Manager)
- Never commit `.env` files to git
- Rotate JWT secrets periodically
- Use different secrets per environment

## License

Internal use only - TanTech Corporation
