import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
} from "date-fns";

export default function TimesheetPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timesheetData, setTimesheetData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate week boundaries
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch timesheet data for current week
  useEffect(() => {
    const fetchTimesheetData = async () => {
      if (!user?.id) return;

      setLoading(true);

      try {
        // Get summary data
        const { data: summaryData, error: summaryError } = await supabase.rpc(
          "get_user_time_summary",
          {
            p_user_id: user.id,
            p_from_date: format(weekStart, "yyyy-MM-dd"),
            p_to_date: format(weekEnd, "yyyy-MM-dd"),
          },
        );

        if (summaryError) {
          console.error("Failed to fetch timesheet summary:", summaryError);
          return;
        }

        // Get individual sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("timesheet_sessions")
          .select("*")
          .eq("user_id", user.id)
          .gte("session_date", format(weekStart, "yyyy-MM-dd"))
          .lte("session_date", format(weekEnd, "yyyy-MM-dd"))
          .is("ended_at", false, { negate: true }) // Only completed sessions
          .eq("is_valid", true)
          .order("started_at", { ascending: false });

        if (sessionsError) {
          console.error("Failed to fetch sessions:", sessionsError);
          return;
        }

        setTimesheetData(summaryData);
        setSessions(sessionsData || []);
      } catch (error) {
        console.error("Error fetching timesheet data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimesheetData();
  }, [user?.id, currentWeek]);

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentWeek((prev) => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek((prev) => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeek(new Date());

  // Prepare chart data
  const chartData = weekDays.map((day) => {
    const dayString = format(day, "yyyy-MM-dd");
    const dayData =
      timesheetData?.daily_totals?.find((d) => d.date === dayString) || {};

    return {
      day: format(day, "EEE"), // Mon, Tue, etc.
      date: format(day, "MMM d"), // Jan 1, etc.
      hours: dayData.hours || 0,
      sessions: dayData.session_count || 0,
    };
  });

  // Format time duration
  const formatDuration = (seconds) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const weeklyTotal = timesheetData?.weekly_total || 0;
  const targetHours = timesheetData?.target_hours || 5;
  const targetMet = timesheetData?.target_met_this_week || false;
  const streak = timesheetData?.streak || { current_streak: 0 };
  const averageDaily = weeklyTotal / 7;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
              <h1 className="text-2xl font-bold">My Timesheet</h1>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{profile?.full_name || user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Week Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="text-center">
                <h2 className="text-lg font-semibold">
                  {format(weekStart, "MMM d")} -{" "}
                  {format(weekEnd, "MMM d, yyyy")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Week {format(weekStart, "I")} of {format(weekStart, "yyyy")}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="secondary" size="sm" onClick={goToCurrentWeek}>
              Current Week
            </Button>
          </motion.div>

          {/* Week Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{weeklyTotal.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Total This Week</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{averageDaily.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Daily Average</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{targetHours}h</p>
                <p className="text-sm text-muted-foreground">Weekly Target</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
                  <Badge
                    variant={targetMet ? "default" : "secondary"}
                    className="text-xs px-2 py-1"
                  >
                    {targetMet ? "✓ Met" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Target Status</p>
                {streak.current_streak > 0 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    🔥 {streak.current_streak} week streak
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Hours Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Daily Learning Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        className="text-xs"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        className="text-xs"
                        label={{
                          value: "Hours",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                                <p className="font-medium">
                                  {label} ({data.date})
                                </p>
                                <p className="text-indigo-600 dark:text-indigo-400">
                                  {data.hours.toFixed(1)} hours
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {data.sessions} session
                                  {data.sessions !== 1 ? "s" : ""}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="hours"
                        fill="currentColor"
                        className="text-indigo-500"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Session Log */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Learning Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length > 0 ? (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          <div>
                            <p className="font-medium">
                              {format(
                                new Date(session.session_date),
                                "EEE, MMM d",
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(session.started_at), "HH:mm")} -{" "}
                              {format(new Date(session.ended_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatDuration(session.duration_seconds)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.is_valid ? "Valid" : "Too short"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No learning sessions recorded for this week
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sessions are automatically tracked when you use the
                      platform
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
