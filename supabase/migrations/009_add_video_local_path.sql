-- Add video_local_path field to modules table for on-prem video streaming

ALTER TABLE modules
ADD COLUMN video_local_path TEXT;

COMMENT ON COLUMN modules.video_local_path IS 'Relative path to video file in ASSETS_BASE_PATH (e.g. git/intro.mp4)';
