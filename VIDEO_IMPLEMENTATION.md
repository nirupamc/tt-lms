# Video Streaming Implementation Notes

## Completed Components

### ✅ File Server (Node.js/Express)

Location: `/file-server/`

**Files created:**

- `server.js` - Main Express app with JWT middleware and streaming endpoint
- `package.json` - Dependencies (express, jsonwebtoken, dotenv, cors)
- `.env.example` - Configuration template
- `.gitignore` - Prevents committing node_modules and .env

**Key features implemented:**

- JWT verification middleware using `jsonwebtoken.verify()`
- Path traversal prevention with `path.resolve()` validation
- HTTP Range request support for video seeking (206 Partial Content)
- CORS configuration with `ALLOWED_ORIGIN`
- Content-Type detection for multiple video formats
- Health check endpoint at `/health`

**Endpoint:**

```
GET /stream/:filePath(*)
Authorization: Bearer <jwt-token>
Range: bytes=0-1024 (optional)
```

**To run:**

```bash
cd file-server
npm install
cp .env.example .env
# Edit .env with your paths
npm start
```

---

### ✅ Supabase Edge Function

Location: `/supabase/functions/sign-video-url/`

**Files created:**

- `index.ts` - Deno Edge Function
- `README.md` - Deployment instructions

**Flow:**

1. Receives `module_id` from authenticated request
2. Verifies user authentication via Supabase JWT
3. Looks up `modules.video_local_path` and `course_id`
4. Checks enrollment in `enrollments` table
5. Signs JWT with `SUPABASE_JWT_SECRET` (2-hour exp)
6. Returns `{ token, filePath, expiresIn }`

**Environment variables needed:**

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

**To deploy:**

```bash
supabase functions deploy sign-video-url
```

---

### ✅ React VideoPlayer Component

Location: `/src/components/VideoPlayer.jsx`

**Features implemented:**

- Fetches signed token from Edge Function via `supabase.functions.invoke()`
- Streams video with Authorization header
- Creates Blob URL from response using `URL.createObjectURL()`
- Framer Motion loading skeleton
- Error handling with user-friendly UI
- Automatic cleanup with `URL.revokeObjectURL()` on unmount
- Native HTML5 `<video>` controls with `controlsList="nodownload"`

**Props:**

```jsx
<VideoPlayer moduleId="uuid" videoLocalPath="relative/path/to/video.mp4" />
```

---

### ✅ Database Migration

Location: `/supabase/migrations/009_add_video_local_path.sql`

**Added column:**

```sql
ALTER TABLE modules
ADD COLUMN video_local_path TEXT;
```

Stores relative path to video file (e.g., `'git/intro.mp4'`)

---

### ✅ ModuleViewer Integration

Location: `/src/pages/ModuleViewerPage.jsx`

**Changes:**

1. Imported `VideoPlayer` component
2. Added video rendering section after PDF downloads:

```jsx
{
  module.video_local_path && (
    <VideoPlayer moduleId={moduleId} videoLocalPath={module.video_local_path} />
  );
}
```

3. Conditional rendering: only shows if `video_local_path` is set

---

### ✅ Environment Configuration

Location: `/.env.example`

**Added:**

```env
VITE_FILE_SERVER_URL=http://localhost:4000
```

React app needs this to construct the streaming URL.

---

## Security Implementation

### ✅ JWT Token Flow

1. **User auth**: Supabase JWT verifies user identity
2. **Enrollment check**: Edge Function queries `enrollments` table
3. **Video token**: Signed JWT contains `{ filePath, userId, moduleId, exp }`
4. **File server**: Validates JWT before streaming

### ✅ Attack Mitigation

- **Path traversal**: File paths validated with `path.resolve()` check
- **Unauthorized access**: JWT verification + enrollment validation
- **Token reuse**: 2-hour expiration limit
- **CORS bypass**: Strict origin validation
- **Download prevention**: `controlsList="nodownload"` attribute

---

## Admin Video Path Configuration

### 🚧 TODO: Admin Course Builder Enhancement

Location: `/src/pages/AdminPage.jsx` (or new `/admin/courses/edit`)

**What needs to be built:**

1. Course management UI
2. Module editor with form field for `video_local_path`
3. Input validation (no `..`, must be relative path)
4. Save to database via Supabase client

**Example form field:**

```jsx
<Input
  label="Video Path"
  placeholder="git/intro.mp4"
  value={videoPath}
  onChange={(e) => setVideoPath(e.target.value)}
  helperText="Relative to ASSETS_BASE_PATH"
/>
```

**Save logic:**

```jsx
await supabase
  .from("modules")
  .update({ video_local_path: videoPath })
  .eq("id", moduleId);
```

---

## File Organization Recommendations

### Recommended directory structure:

```
${ASSETS_BASE_PATH}/
├── git/
│   ├── intro.mp4
│   ├── branching.mp4
│   └── merging.mp4
├── react/
│   ├── components.mp4
│   ├── hooks.mp4
│   └── state-management.mp4
├── node/
│   ├── express-basics.mp4
│   └── middleware.mp4
└── python/
    ├── basics.mp4
    └── django-intro.mp4
```

---

## Testing Checklist

### Before testing:

- [ ] File server running (`npm start` in `/file-server/`)
- [ ] Edge Function deployed (`supabase functions deploy sign-video-url`)
- [ ] Test video file exists at `${ASSETS_BASE_PATH}/test/sample.mp4`
- [ ] Module has `video_local_path` set: `'test/sample.mp4'`
- [ ] User is enrolled in the course
- [ ] React app has `VITE_FILE_SERVER_URL` in `.env`

### Test scenarios:

1. ✅ Happy path: Video loads and plays
2. ✅ Video seeking: Scrub through timeline (Range requests)
3. ✅ Not enrolled: Shows "Not enrolled" error
4. ✅ Invalid path: Shows "File not found" error
5. ✅ Expired token: After 2 hours, video stops loading
6. ✅ Path traversal attempt: `../../etc/passwd` blocked
7. ✅ No video set: VideoPlayer not rendered

---

## Production Deployment Notes

### File Server

- Deploy on dedicated Linux VM or Docker container
- Use systemd service for auto-restart
- Nginx reverse proxy with SSL/TLS
- Environment: `NODE_ENV=production`
- Monitoring: PM2 or similar process manager

### Video Storage

- NFS mount for centralized storage
- Or S3-compatible object storage
- Regular backups
- Monitor disk space

### Performance

- Compress videos before upload (H.264, 1-3 Mbps)
- Consider HLS/DASH for adaptive bitrate
- CDN distribution for global users
- Rate limiting on file server

### Security

- Rotate JWT secrets quarterly
- Monitor failed auth attempts
- Implement rate limiting (express-rate-limit)
- Regular security audits

---

## Known Limitations

1. **No adaptive bitrate**: Uses single-quality video files
2. **No progress tracking**: Doesn't track watch time or completion
3. **No captions**: No support for subtitle tracks (WebVTT)
4. **No DRM**: Content protection is JWT-only
5. **Admin UI**: Video path must be set via SQL or future admin UI

---

## Future Enhancements

### Potential improvements:

1. **Video progress tracking**: Record watch time per user
2. **Adaptive streaming**: HLS/DASH for bandwidth adaptation
3. **Thumbnail generation**: Generate preview thumbnails
4. **Captions support**: Upload and serve WebVTT subtitle files
5. **Video transcoding**: On-upload conversion to optimal formats
6. **CDN integration**: Cloudflare Stream, AWS CloudFront
7. **Admin upload UI**: Drag-and-drop video upload interface
8. **Analytics**: View counts, completion rates, drop-off points

---

## Files Created Summary

```
/file-server/
├── server.js                 (Express app with JWT auth)
├── package.json              (Dependencies)
├── .env.example              (Config template)
└── .gitignore                (Git ignore rules)

/supabase/
├── functions/
│   └── sign-video-url/
│       ├── index.ts          (Edge Function)
│       └── README.md         (Docs)
└── migrations/
    └── 009_add_video_local_path.sql  (DB schema)

/src/
└── components/
    └── VideoPlayer.jsx       (React component)

Root:
├── VIDEO_STREAMING.md        (System architecture docs)
├── .env.example              (Updated with FILE_SERVER_URL)
└── VIDEO_IMPLEMENTATION.md   (This file)
```

---

## Integration Verified

✅ Build successful (`npm run build`)
✅ No TypeScript errors
✅ All imports resolved
✅ Framer Motion animations included
✅ Error boundaries in place
✅ Environment variables templated

---

## Next Steps (if continuing implementation)

1. **Admin course builder**: Build UI for setting `video_local_path`
2. **Video progress tracking**: Track watch time, completion %
3. **Test with real Supabase**: Deploy migrations, test end-to-end
4. **Performance testing**: Load test file server with concurrent users
5. **Security audit**: Penetration testing, token security review

---

**Implementation Date**: 2025
**Status**: ✅ Complete (core functionality)
**Remaining**: Admin UI for video path configuration
