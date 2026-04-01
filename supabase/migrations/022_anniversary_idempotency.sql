-- filepath: d:\tantech\ttlmsss\supabase\migrations\022_anniversary_idempotency.sql
-- Add last_notified_month column for anniversary email idempotency
-- Migration 022: Anniversary idempotency

-- Add last_notified_month column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_notified_month INTEGER DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_notified_month ON profiles(last_notified_month);

-- Add blocks_completed and total_blocks columns to progress table (for granular tracking)
ALTER TABLE progress 
ADD COLUMN IF NOT EXISTS blocks_completed INTEGER DEFAULT 0;

ALTER TABLE progress 
ADD COLUMN IF NOT EXISTS total_blocks INTEGER DEFAULT 1;

-- Update RPC to increment block progress
CREATE OR REPLACE FUNCTION increment_block_progress(
  p_user_id UUID,
  p_module_id UUID,
  p_blocks_completed INTEGER DEFAULT 1,
  p_total_blocks INTEGER DEFAULT NULL
)
RETURNS progress
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_progress progress;
BEGIN
  -- Upsert progress record
  INSERT INTO progress (user_id, module_id, blocks_completed, total_blocks)
  VALUES (p_user_id, p_module_id, p_blocks_completed, COALESCE(p_total_blocks, 1))
  ON CONFLICT (user_id, module_id) 
  DO UPDATE SET 
    blocks_completed = GREATEST(progress.blocks_completed, EXCLUDED.blocks_completed),
    total_blocks = COALESCE(EXCLUDED.total_blocks, progress.total_blocks),
    updated_at = NOW()
  RETURNING * INTO v_progress;
  
  RETURN v_progress;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_block_progress(UUID, UUID, INTEGER, INTEGER) TO authenticated;
