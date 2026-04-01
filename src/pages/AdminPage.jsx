import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  Settings,
  BarChart3,
  LogOut,
  ArrowLeft,
  Clock,
  Award,
} from "lucide-react";

export default function AdminPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const adminModules = [
    {
      title: "User Management",
      description: "Manage employees, roles, and permissions",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Course Management",
      description: "Create and manage learning courses",
      icon: BookOpen,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Time Targets",
      description: "Set global and per-user weekly learning targets",
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Badge Management",
      description: "Configure incentive badges and awards",
      icon: Award,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Analytics",
      description: "View platform usage and learning metrics",
      icon: BarChart3,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "Settings",
      description: "Platform configuration and preferences",
      icon: Settings,
      color: "text-slate-500",
      bgColor: "bg-slate-500/10",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <span className="text-lg font-bold text-white">TT</span>
              </div>
              <div>
                <span className="font-semibold text-lg">Admin Panel</span>
                <span className="text-xs text-muted-foreground block">
                  TanTech Upskill
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium hidden sm:block">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Page Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold tracking-tight">
              Administration Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your organization's learning platform
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { label: "Total Users", value: "156" },
              { label: "Active Courses", value: "12" },
              { label: "Avg Weekly Hours", value: "4.2" },
              { label: "Badges Awarded", value: "487" },
            ].map((stat) => (
              <Card key={stat.label} className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Admin Modules Grid */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-4">Management Modules</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminModules.map((module) => (
                <motion.div
                  key={module.title}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${module.bgColor}`}>
                          <module.icon className={`w-6 h-6 ${module.color}`} />
                        </div>
                        <CardTitle className="text-lg">
                          {module.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Placeholder for additional content */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Recent platform activity and user engagement metrics will be
                  displayed here.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
