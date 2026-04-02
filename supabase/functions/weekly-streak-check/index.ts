import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Weekly streak check cron job - runs every Monday at 00:00 UTC
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate last week's date range (Monday to Sunday)
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setUTCDate(now.getUTCDate() - now.getUTCDay() - 6); // Last Monday
    lastMonday.setUTCHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6); // Last Sunday
    lastSunday.setUTCHours(23, 59, 59, 999);

    // Current ISO week string for idempotency
    const currentISOWeek = getISOWeek(now);

    console.log(
      `Processing weekly streaks for week ending ${lastSunday.toISOString()}`,
    );
    console.log(`Current ISO week: ${currentISOWeek}`);

    // Get all employees with their targets and current streak info
    const { data: employees, error: employeesError } = await supabase.rpc(
      "get_employees_for_streak_check",
    );

    if (employeesError) {
      throw new Error(`Failed to get employees: ${employeesError.message}`);
    }

    const results = [];

    for (const employee of employees) {
      try {
        // Skip if already processed this week (idempotency)
        if (employee.last_target_met_week === currentISOWeek) {
          console.log(
            `Skipping ${employee.full_name} - already processed for week ${currentISOWeek}`,
          );
          continue;
        }

        // Calculate total learning hours for last week
        const { data: weekSummary, error: summaryError } = await supabase.rpc(
          "get_user_time_summary",
          {
            p_user_id: employee.user_id,
            p_from: lastMonday.toISOString().split("T")[0],
            p_to: lastSunday.toISOString().split("T")[0],
          },
        );

        if (summaryError) {
          throw new Error(
            `Failed to get time summary for ${employee.full_name}: ${summaryError.message}`,
          );
        }

        const weeklyHours = (weekSummary.weekly_total || 0) / 3600;
        const targetHours = employee.target_hours || 5.0;
        const targetMet = weeklyHours >= targetHours;

        console.log(
          `${employee.full_name}: ${weeklyHours.toFixed(2)}h / ${targetHours}h - ${targetMet ? "TARGET MET" : "target not met"}`,
        );

        if (targetMet) {
          // Increment streak
          const newStreak = (employee.current_streak || 0) + 1;
          const newLongestStreak = Math.max(
            newStreak,
            employee.longest_streak || 0,
          );

          // Update weekly_streaks table
          await supabase.from("weekly_streaks").upsert({
            user_id: employee.user_id,
            current_streak: newStreak,
            longest_streak: newLongestStreak,
            last_target_met_week: currentISOWeek,
          });

          // Award streak badge based on milestone
          const badgeAwarded = await awardStreakBadge(
            supabase,
            employee.user_id,
            newStreak,
          );

          results.push({
            user_id: employee.user_id,
            full_name: employee.full_name,
            status: "success",
            streak: newStreak,
            hours: weeklyHours,
            target: targetHours,
            badge_awarded: badgeAwarded,
          });
        } else {
          // Reset streak to 0
          await supabase.from("weekly_streaks").upsert({
            user_id: employee.user_id,
            current_streak: 0,
            longest_streak: employee.longest_streak || 0,
            last_target_met_week: null,
          });

          results.push({
            user_id: employee.user_id,
            full_name: employee.full_name,
            status: "streak_reset",
            streak: 0,
            hours: weeklyHours,
            target: targetHours,
            badge_awarded: null,
          });
        }
      } catch (error) {
        console.error(`Error processing ${employee.full_name}:`, error);
        results.push({
          user_id: employee.user_id,
          full_name: employee.full_name,
          status: "error",
          error: error.message,
        });
      }
    }

    // Log execution summary
    await logCronExecution(supabase, "weekly-streak-check", results);

    console.log(`Processed ${results.length} employees`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Weekly streak cron error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

// Award streak badge based on milestone
async function awardStreakBadge(
  supabase: any,
  userId: string,
  streakWeeks: number,
): Promise<string | null> {
  let badgeSlug = null;

  // Determine which badge to award based on streak milestone
  if (streakWeeks === 1) {
    badgeSlug = "week-warrior";
  } else if (streekWeeks === 4) {
    badgeSlug = "month-master";
  } else if (streakWeeks === 8) {
    badgeSlug = "gold-learner";
  } else if (streakWeeks === 16) {
    badgeSlug = "platinum-scholar";
  }

  if (badgeSlug) {
    try {
      await supabase.rpc("award_badge_to_user", {
        p_user_id: userId,
        p_badge_slug: badgeSlug,
        p_context_json: { streak_weeks: streakWeeks },
      });
      console.log(
        `Awarded ${badgeSlug} badge to user ${userId} for ${streakWeeks} week streak`,
      );
      return badgeSlug;
    } catch (error) {
      console.error(`Failed to award ${badgeSlug} badge:`, error);
    }
  }

  return null;
}

// Log cron execution
async function logCronExecution(
  supabase: any,
  jobName: string,
  results: any[],
) {
  const successCount = results.filter(
    (r) => r.status === "success" || r.status === "streak_reset",
  ).length;
  const errorCount = results.filter((r) => r.status === "error").length;

  await supabase.from("cron_logs").insert({
    job_name: jobName,
    status: errorCount > 0 ? "partial_success" : "success",
    message: `Processed ${results.length} employees: ${successCount} successful, ${errorCount} errors`,
    execution_time: new Date().toISOString(),
  });
}

// Calculate ISO week string (e.g., '2025-W03')
function getISOWeek(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const startOfYearWeekday = startOfYear.getDay() || 7; // Monday = 1

  // Calculate the first Monday of the year
  const firstMonday = new Date(year, 0, 1 + ((8 - startOfYearWeekday) % 7));

  // Calculate week number
  const weekNumber =
    Math.floor(
      (date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    ) + 1;

  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}
