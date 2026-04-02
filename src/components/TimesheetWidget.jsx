import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Timesheet Widget - Compact progress ring with streak counter
 * Shows weekly progress toward target hours with animations
 */
export function TimesheetWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timesheetData, setTimesheetData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch timesheet summary
  useEffect(() => {
    const fetchTimesheetData = async () => {
      if (!user?.id) return;

      try {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        const { data, error } = await supabase.rpc("get_user_time_summary", {
          p_user_id: user.id,
          p_from_date: weekAgo.toISOString().split("T")[0],
          p_to_date: today.toISOString().split("T")[0],
        });

        if (error) {
          console.error("Failed to fetch timesheet data:", error);
          return;
        }

        setTimesheetData(data);
      } catch (error) {
        console.error("Error fetching timesheet data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimesheetData();
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2 w-24"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32"></div>
            </div>
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timesheetData) {
    return null;
  }

  const weeklyHours = timesheetData.weekly_total || 0;
  const targetHours = timesheetData.target_hours || 5;
  const progressPercent = Math.min((weeklyHours / targetHours) * 100, 100);
  const targetMet = timesheetData.target_met_this_week;
  const streak = timesheetData.streak || { current_streak: 0 };

  // Format time display
  const hours = Math.floor(weeklyHours);
  const minutes = Math.round((weeklyHours - hours) * 60);

  // SVG circle properties
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  return (
    <motion.div
      onClick={() => navigate("/my-timesheet")}
      className="cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        className={`border-0 shadow-md transition-all duration-200 hover:shadow-lg ${
          targetMet
            ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
            : ""
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">
                  This Week
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {hours}h {minutes}m
                </p>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-3 h-3" />
                  <span>Target: {targetHours}h</span>
                  {targetMet && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✓ Complete
                    </span>
                  )}
                </div>

                {/* Streak Counter with Animation */}
                {streak.current_streak > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <motion.span
                      className="text-orange-500"
                      animate={
                        streak.current_streak >= 3 ? { scale: [1, 1.2, 1] } : {}
                      }
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        repeatDelay: 1,
                      }}
                    >
                      🔥
                    </motion.span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      {streak.current_streak} week streak
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                {/* Background circle */}
                <circle
                  cx="28"
                  cy="28"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  className="text-slate-200 dark:text-slate-700"
                />

                {/* Progress circle with animation */}
                <motion.circle
                  cx="28"
                  cy="28"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-1000 ${
                    targetMet
                      ? "text-amber-500 drop-shadow-md"
                      : "text-indigo-500"
                  }`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{
                    filter: targetMet
                      ? "drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))"
                      : "none",
                  }}
                />
              </svg>

              {/* Center percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-xs font-semibold ${
                    targetMet
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {Math.round(progressPercent)}%
                </span>
              </div>

              {/* Pulsing ring animation when target is met */}
              {targetMet && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    repeatDelay: 1,
                  }}
                  style={{
                    background:
                      "radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)",
                  }}
                />
              )}
            </div>
          </div>

          {/* View Details Link */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {targetMet
                  ? "🎉 Target achieved!"
                  : `${(targetHours - weeklyHours).toFixed(1)}h remaining`}
              </span>
              <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                <TrendingUp className="w-3 h-3" />
                <span className="font-medium">View Details</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
