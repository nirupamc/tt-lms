---
name: cron-automation
description: Logic for scheduling recurring tasks, monthly anniversary triggers, and time-based automation for the 36-month LMS. Use this when the user asks to setup emails, calculate join-date milestones, or schedule background jobs.
---

# Cron & Automation Skill

This skill provides the logical framework for managing a 36-month upskilling timeline and automated communication.

## 1. Anniversary Trigger Logic

When calculating a user's monthly "Check-in" or "Zoom link" date, always use the `join_date` as the anchor.

- **Formula:** `(Current_Date - join_date) / 30 days`.
- **Logic:** If the remainder is 0, trigger the "Monthly Live Sync" notification.
- **Validation:** Account for varying month lengths (28, 30, 31 days) by using a robust date library like `date-fns` or `dayjs`.

## 2. Cron Job Scheduling

For background automation (e.g., daily checks for who hits a milestone today):

- **Schedule:** Run daily at 00:00 UTC.
- **Task:** Query the `profiles` table for users where `EXTRACT(DAY FROM join_date) = EXTRACT(DAY FROM NOW())`.
- **Edge Case:** For users who joined on the 29th, 30th, or 31st, ensure they are triggered on the last day of shorter months (e.g., Feb 28th).

## 3. Automation Stack

When writing code for this skill, prioritize:

- **Server-side:** Node-Cron or GitHub Actions for scheduled execution.
- **Database:** Supabase Edge Functions or PostgreSQL Cron (`pg_cron`) for database-level tasks.
- **Communication:** Integration with email APIs (Resend, Nodemailer) to send the "Month X" content.

## 4. Security & Error Handling

- **Idempotency:** Ensure an anniversary email is only sent ONCE per month. Check a `last_notified_month` column before sending.
- **Retries:** If a meeting link generation fails, log the error to `findings.md` and retry 3 times with exponential backoff.
