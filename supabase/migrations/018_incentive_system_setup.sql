-- Add timezone column to profiles table and seed the badge catalogue
-- Migration 018: Incentive system setup

-- Add timezone column to profiles for early bird badge (if not already present)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Don't recreate cron_logs—it's already created by migration 011
-- The existing cron_logs table has executed_at (not execution_time)

-- Seed incentive badges catalogue (with conflict handling for re-runs)
INSERT INTO incentive_badges (slug, label, description, icon_emoji, tier, badge_type) VALUES
-- Time-streak badges
('week-warrior', 'Week Warrior', 'Met your weekly learning target for 1 consecutive week', '🥉', 'bronze', 'time_streak'),
('month-master', 'Month Master', 'Met your weekly learning target for 4 consecutive weeks', '🥈', 'silver', 'time_streak'), 
('gold-learner', 'Gold Learner', 'Met your weekly learning target for 8 consecutive weeks', '🥇', 'gold', 'time_streak'),
('platinum-scholar', 'Platinum Scholar', 'Met your weekly learning target for 16 consecutive weeks', '💎', 'platinum', 'time_streak'),
-- Learning milestone badges  
('first-step', 'First Step', 'Completed your very first learning module', '👶', 'bronze', 'module_complete'),
('quiz-ace', 'Quiz Ace', 'Scored a perfect 100% on a quiz', '🎯', 'bronze', 'quiz_ace'),
('speed-learner', 'Speed Learner', 'Completed a module in under 10 minutes', '⚡', 'bronze', 'speed_learner'),
('early-bird', 'Early Bird', 'Started a learning session before 8 AM', '🌅', 'bronze', 'early_bird')
ON CONFLICT (slug) DO NOTHING;

-- Skill-specific badges (auto-generated from courses table)
INSERT INTO incentive_badges (slug, label, description, icon_emoji, tier, badge_type)
SELECT 
  LOWER(skill_tag) || '-expert' as slug,
  INITCAP(skill_tag) || ' Expert' as label,
  'Completed all modules in the ' || INITCAP(skill_tag) || ' learning track' as description,
  CASE 
    WHEN LOWER(skill_tag) = 'react' THEN '⚛️'
    WHEN LOWER(skill_tag) = 'git' THEN '📚'
    WHEN LOWER(skill_tag) = 'node' THEN '💚'
    WHEN LOWER(skill_tag) = 'sql' THEN '🗃️'
    WHEN LOWER(skill_tag) = 'python' THEN '🐍'
    WHEN LOWER(skill_tag) = 'javascript' THEN '🟨'
    WHEN LOWER(skill_tag) = 'typescript' THEN '🔷'
    WHEN LOWER(skill_tag) = 'docker' THEN '🐳'
    WHEN LOWER(skill_tag) = 'kubernetes' THEN '☸️'
    WHEN LOWER(skill_tag) = 'aws' THEN '☁️'
    ELSE '🎓'
  END as icon_emoji,
  'silver' as tier,
  'course_complete' as badge_type
FROM courses 
WHERE archived_at IS NULL AND skill_tag IS NOT NULL
GROUP BY skill_tag
ON CONFLICT (slug) DO NOTHING;

-- Grant permissions
GRANT SELECT ON cron_logs TO authenticated;
GRANT INSERT ON cron_logs TO service_role;