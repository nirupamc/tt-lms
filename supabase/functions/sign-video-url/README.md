# Sign Video URL Edge Function

This Deno Edge Function generates short-lived JWT tokens for secure video streaming.

## Purpose

- Validates user authentication via Supabase JWT
- Checks course enrollment authorization
- Looks up the module's video_local_path
- Returns a signed JWT token (2-hour expiration) for the file server

## Request

```json
POST /functions/v1/sign-video-url
Authorization: Bearer <supabase-jwt>
Content-Type: application/json

{
  "module_id": "uuid-of-module"
}
```

## Response

```json
{
  "token": "eyJhbGc...",
  "filePath": "git/intro.mp4",
  "expiresIn": 7200
}
```

## Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for bypassing RLS
- `SUPABASE_JWT_SECRET`: JWT secret for signing file server tokens

## Deployment

```bash
supabase functions deploy sign-video-url
```
