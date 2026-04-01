-- 001_enums.sql
-- Create custom enum types for the tantech-upskill-project

-- User roles
CREATE TYPE user_role AS ENUM ('employee', 'admin');

-- Content/Progress status
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');

-- Submission status for milestones
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected', 'resubmit');

-- Badge tiers for incentive system
CREATE TYPE badge_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Badge types for different achievements
CREATE TYPE badge_type AS ENUM (
  'time_streak',
  'module_complete',
  'course_complete',
  'quiz_ace',
  'speed_learner',
  'early_bird'
);
