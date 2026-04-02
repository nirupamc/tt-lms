import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Trophy,
  Users,
  Target,
  Award,
  Search,
  Save,
  Crown,
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";

export default function AdminSettingsPage() {
  const [globalTarget, setGlobalTarget] = useState(5.0);
  const [tempGlobalTarget, setTempGlobalTarget] = useState(5.0);
  const [employees, setEmployees] = useState([]);
  const [badgeStats, setBadgeStats] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadGlobalTarget(),
        loadEmployees(),
        loadBadgeStats(),
        loadLeaderboard(),
      ]);
    } catch (error) {
      console.error("Error loading settings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalTarget = async () => {
    try {
      const { data, error } = await supabase
        .from("time_targets")
        .select("weekly_hours_target")
        .is("user_id", null)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const target = data?.weekly_hours_target || 5.0;
      setGlobalTarget(target);
      setTempGlobalTarget(target);
    } catch (error) {
      console.error("Error loading global target:", error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          email,
          time_targets(weekly_hours_target),
          weekly_streaks(current_streak)
        `,
        )
        .eq("role", "employee")
        .order("full_name");

      if (error) throw error;

      setEmployees(
        data.map((emp) => ({
          ...emp,
          custom_target: emp.time_targets?.[0]?.weekly_hours_target || null,
          current_streak: emp.weekly_streaks?.[0]?.current_streak || 0,
        })),
      );
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadBadgeStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_badge_statistics");

      if (error) throw error;

      setBadgeStats(data || []);
    } catch (error) {
      console.error("Error loading badge stats:", error);
      // Create a basic stats query if RPC doesn't exist
      try {
        const { data: badges, error: badgeError } = await supabase
          .from("incentive_badges")
          .select(
            `
            *,
            user_badges(id)
          `,
          )
          .order("tier", { ascending: false });

        if (badgeError) throw badgeError;

        const { data: totalUsers, error: userError } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "employee");

        if (userError) throw userError;

        const totalEmployees = totalUsers.length;

        setBadgeStats(
          badges.map((badge) => ({
            ...badge,
            award_count: badge.user_badges?.length || 0,
            percentage:
              totalEmployees > 0
                ? (
                    ((badge.user_badges?.length || 0) / totalEmployees) *
                    100
                  ).toFixed(1)
                : 0,
          })),
        );
      } catch (fallbackError) {
        console.error("Fallback badge stats failed:", fallbackError);
      }
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc("get_monthly_leaderboard");

      if (error) throw error;

      setLeaderboard(data || []);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      // Create basic leaderboard if RPC doesn't exist
      try {
        const { data, error: basicError } = await supabase
          .from("profiles")
          .select(
            `
            id,
            full_name,
            weekly_streaks(current_streak, longest_streak)
          `,
          )
          .eq("role", "employee")
          .order("full_name");

        if (basicError) throw basicError;

        setLeaderboard(
          data
            .map((emp) => ({
              ...emp,
              current_streak: emp.weekly_streaks?.[0]?.current_streak || 0,
              longest_streak: emp.weekly_streaks?.[0]?.longest_streak || 0,
              monthly_hours: 0, // Would need to calculate from timesheet_sessions
            }))
            .sort((a, b) => b.current_streak - a.current_streak)
            .slice(0, 10),
        );
      } catch (fallbackError) {
        console.error("Fallback leaderboard failed:", fallbackError);
      }
    }
  };

  const updateGlobalTarget = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("time_targets").upsert({
        user_id: null, // null = global default
        weekly_hours_target: tempGlobalTarget,
        created_by: null,
      });

      if (error) throw error;

      setGlobalTarget(tempGlobalTarget);

      toast({
        title: "Success",
        description: "Global weekly target updated successfully",
      });
    } catch (error) {
      console.error("Error updating global target:", error);
      toast({
        title: "Error",
        description: "Failed to update global target",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateEmployeeTarget = async (employeeId, newTarget) => {
    try {
      if (newTarget === null || newTarget === "") {
        // Remove custom target (use global default)
        await supabase.from("time_targets").delete().eq("user_id", employeeId);
      } else {
        // Set custom target
        await supabase.from("time_targets").upsert({
          user_id: employeeId,
          weekly_hours_target: parseFloat(newTarget),
          created_by: null,
        });
      }

      // Reload employees data
      await loadEmployees();

      toast({
        title: "Success",
        description: "Employee target updated successfully",
      });
    } catch (error) {
      console.error("Error updating employee target:", error);
      toast({
        title: "Error",
        description: "Failed to update employee target",
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const tierColors = {
    bronze: "bg-amber-100 text-amber-800",
    silver: "bg-slate-100 text-slate-800",
    gold: "bg-yellow-100 text-yellow-800",
    platinum: "bg-slate-200 text-slate-800",
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Incentive Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Configure learning targets, view badge statistics, and monitor
            leaderboards
          </p>
        </div>

        <Tabs defaultValue="targets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="targets" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Targets
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Targets Tab */}
          <TabsContent value="targets" className="space-y-6">
            {/* Global Target */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Global Weekly Target
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={tempGlobalTarget}
                      onChange={(e) =>
                        setTempGlobalTarget(parseFloat(e.target.value) || 0)
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      hours per week
                    </span>
                  </div>
                  <Button
                    onClick={updateGlobalTarget}
                    disabled={saving || tempGlobalTarget === globalTarget}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This target applies to all employees who don't have a custom
                  target set.
                </p>
              </CardContent>
            </Card>

            {/* Employee Targets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Target Overrides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Current Streak</TableHead>
                      <TableHead>Weekly Target</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <EmployeeTargetRow
                        key={employee.id}
                        employee={employee}
                        globalTarget={globalTarget}
                        onUpdateTarget={updateEmployeeTarget}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Badge Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Awards</TableHead>
                      <TableHead>% of Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {badgeStats.map((badge) => (
                      <TableRow key={badge.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{badge.icon_emoji}</span>
                            <div>
                              <p className="font-medium">{badge.label}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {badge.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={tierColors[badge.tier]}>
                            {badge.tier.charAt(0).toUpperCase() +
                              badge.tier.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {badge.award_count || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600 dark:text-slate-400">
                            {badge.percentage || 0}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0
                              ? "bg-yellow-500 text-white"
                              : index === 1
                                ? "bg-slate-400 text-white"
                                : index === 2
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {user.monthly_hours}h this month
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            🔥 {user.current_streak}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Current
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            🏆 {user.longest_streak}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Best
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

// Employee target row component with inline editing
function EmployeeTargetRow({ employee, globalTarget, onUpdateTarget }) {
  const [editing, setEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState("");

  const startEdit = () => {
    setTempTarget(employee.custom_target?.toString() || "");
    setEditing(true);
  };

  const saveTarget = () => {
    const newTarget = tempTarget === "" ? null : parseFloat(tempTarget);
    onUpdateTarget(employee.id, newTarget);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setTempTarget("");
  };

  const effectiveTarget = employee.custom_target || globalTarget;

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{employee.full_name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {employee.email}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          🔥 <span className="font-medium">{employee.current_streak}</span>
        </div>
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              value={tempTarget}
              onChange={(e) => setTempTarget(e.target.value)}
              placeholder={globalTarget.toString()}
              className="w-20"
            />
            <span className="text-sm">h</span>
          </div>
        ) : (
          <div className="text-sm">
            <span className="font-medium">{effectiveTarget}h</span>
            {!employee.custom_target && (
              <span className="text-slate-500 ml-1">(global)</span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex gap-1">
            <Button size="sm" onClick={saveTarget}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={startEdit}>
            Edit
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
