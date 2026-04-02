import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  Award,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalCourses: 0,
    pendingReviews: 0,
    avgProgress: 0,
    activeThisWeek: 0,
    badgesAwarded: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch employee count and progress
      const { data: employees } = await supabase.rpc(
        "get_all_employee_progress",
      );

      // Fetch course count
      const { count: courseCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true });

      // Fetch pending reviews
      const { data: pending } = await supabase.rpc("get_pending_reviews");

      // Fetch badges awarded
      const { count: badgeCount } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true });

      const totalEmployees = employees?.length || 0;
      const avgProgress =
        totalEmployees > 0
          ? Math.round(
              employees.reduce((sum, e) => sum + (e.percent_complete || 0), 0) /
                totalEmployees,
            )
          : 0;

      const activeThisWeek =
        employees?.filter((e) => {
          if (!e.last_seen_at) return false;
          const lastSeen = new Date(e.last_seen_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return lastSeen > weekAgo;
        }).length || 0;

      setStats({
        totalEmployees,
        totalCourses: courseCount || 0,
        pendingReviews: pending?.length || 0,
        avgProgress,
        activeThisWeek,
        badgesAwarded: badgeCount || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const quickLinks = [
    {
      title: "Employee Monitor",
      description: "View employee progress and activity",
      icon: Users,
      href: "/admin/employees",
      color: "indigo",
    },
    {
      title: "Course Builder",
      description: "Create and manage courses",
      icon: BookOpen,
      href: "/admin/courses",
      color: "green",
    },
    {
      title: "Review Queue",
      description: `${stats.pendingReviews} submissions pending`,
      icon: ClipboardCheck,
      href: "/admin/review",
      color: "amber",
      badge: stats.pendingReviews,
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to the TanTech Upskill platform administration
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeThisWeek} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Courses
            </CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Published and active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Progress
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProgress}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Badges Awarded
            </CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.badgesAwarded}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total achievements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Week
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div
                      className={`p-2 rounded-lg bg-${link.color}-100 dark:bg-${link.color}-900/20`}
                    >
                      <link.icon className={`w-6 h-6 text-${link.color}-600`} />
                    </div>
                    {link.badge > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-4">{link.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {link.description}
                  </p>
                  <Button variant="ghost" size="sm" className="p-0">
                    View <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
