import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/Timeline";
import { TimesheetWidget } from "@/components/TimesheetWidget";
import { RecentBadges } from "@/components/BadgeShelf";
import { ANIMATION_CONFIG } from "@/lib/animations";
import { 
  ProgressBarFill, 
  SkeletonFade, 
  StreakBounce,
  HoverCard 
} from "@/components/animations/index";
import { RippleButton } from "@/components/animations/interactive";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  LogOut,
  User,
  Flame,
  Award,
  Video,
  X,
  Calendar,
  ExternalLink,
  Code2,
} from "lucide-react";

// Monthly check-in banner component
function MonthlyCheckInBanner({ monthNumber, event, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-4 shadow-lg"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-full">
          <Video className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            🎉 Month {monthNumber} Check-In!
          </h3>
          <p className="text-white/90 text-sm mt-1">
            {event?.title || "It's your monthly learning sync! Join the live session with your mentor."}
          </p>
          {event?.agenda && (
            <p className="text-white/80 text-xs mt-1">
              Agenda: {event.agenda}
            </p>
          )}
        </div>
        {event?.zoom_link && (
          <a
            href={event.zoom_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Join Meeting
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

// Badge display component
function BadgeCard({ badge }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50"
    >
      <span className="text-3xl mb-2">{badge.icon_emoji || "🏆"}</span>
      <span className="text-sm font-medium text-center">{badge.label}</span>
      <span className="text-xs text-muted-foreground capitalize">{badge.tier}</span>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Use progress hook
  const {
    overallPercent,
    completedCount,
    totalModules,
    currentModuleId,
    currentModule,
    totalTimeSpentHours,
    progressList,
    loading: progressLoading,
  } = useProgress(user?.id);

  // State for badges, enrollments, streak, skills, and anniversary
  const [badges, setBadges] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [skills, setSkills] = useState([]);
  const [showCheckInBanner, setShowCheckInBanner] = useState(false);
  const [monthNumber, setMonthNumber] = useState(0);
  const [eventData, setEventData] = useState(null);

  // Fetch user badges, enrollments, skills, and streak data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      // Fetch badges
      const { data: badgesData } = await supabase
        .from("user_badges")
        .select(`
          id,
          awarded_at,
          context_json,
          incentive_badges (
            id,
            slug,
            label,
            description,
            icon_emoji,
            tier,
            badge_type
          )
        `)
        .eq("user_id", user.id)
        .order("awarded_at", { ascending: false })
        .limit(8);

      setBadges(badgesData?.map((b) => b.incentive_badges) || []);

      // Fetch enrollments
      const { data: enrollmentsData } = await supabase
        .from("enrollments")
        .select(`
          id,
          enrolled_at,
          completed_at,
          courses (
            id,
            title,
            thumbnail_url,
            skill_tag
          )
        `)
        .eq("user_id", user.id);

      setEnrollments(enrollmentsData || []);

      // Fetch streak
      const { data: streakData } = await supabase
        .from("weekly_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", user.id)
        .single();

      if (streakData) {
        setStreak({
          current: streakData.current_streak,
          longest: streakData.longest_streak,
        });
      }

      // Fetch skills earned
      const { data: skillsData } = await supabase
        .from("skills_earned")
        .select("skill_tag, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      setSkills(skillsData || []);
    };

    fetchDashboardData();
  }, [user?.id]);

  // Check for monthly check-in (every 30 days since join)
  useEffect(() => {
    const checkAnniversary = async () => {
      if (!profile?.join_date) return;

      const joinDate = new Date(profile.join_date);
      const today = new Date();
      const daysSinceJoin = differenceInDays(today, joinDate);

      // Check if today is a 30-day milestone (exclude day 0)
      if (daysSinceJoin > 0 && daysSinceJoin % 30 === 0) {
        const monthNum = daysSinceJoin / 30;
        setMonthNumber(monthNum);

        // Check localStorage for dismissed banners
        const dismissedKey = `anniversary_dismissed_${profile.id}_${monthNum}`;
        const isDismissed = localStorage.getItem(dismissedKey);

        if (!isDismissed) {
          // Fetch event data for this month
          const { data: event } = await supabase
            .from("events")
            .select("*")
            .eq("month_number", monthNum)
            .single();

          if (event) {
            setEventData(event);
            setShowCheckInBanner(true);
          }
        }
      }
    };

    checkAnniversary();
  }, [profile?.join_date, profile?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleDismissBanner = () => {
    setShowCheckInBanner(false);
    // Store dismissal in localStorage
    if (profile?.id && monthNumber) {
      const dismissedKey = `anniversary_dismissed_${profile.id}_${monthNumber}`;
      localStorage.setItem(dismissedKey, "true");
    }
  };

  // Map skill tags to badge colors
  const getSkillVariant = (skillTag) => {
    const skillMap = {
      git: "git",
      react: "react",
      node: "node",
      sql: "sql",
      python: "python",
      docker: "docker",
      aws: "aws",
      typescript: "typescript",
      javascript: "react", // fallback to react colors
      postgres: "sql",
      mongodb: "node",
    };

    return skillMap[skillTag?.toLowerCase()] || "default";
  };

  // Dynamic stats based on real data
  const stats = useMemo(
    () => [
      {
        title: "Courses Enrolled",
        value: enrollments.length.toString(),
        icon: BookOpen,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        title: "Hours Spent",
        value: totalTimeSpentHours.toString(),
        icon: Clock,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
      },
      {
        title: "Current Streak",
        value: streak.current.toString(),
        icon: Flame,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
      },
      {
        title: "Badges Earned",
        value: badges.length.toString(),
        icon: Trophy,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
      },
    ],
    [enrollments.length, totalTimeSpentHours, streak.current, badges.length]
  );

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
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

  // Build modules array for timeline from progress data
  const timelineModules = useMemo(() => {
    return progressList.map((p) => ({
      id: p.module_id,
      title: p.modules?.title || "Module",
      status: p.status,
      completed: p.completed,
    }));
  }, [progressList]);

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      initial={ANIMATION_CONFIG.pageVariants.initial}
      animate={ANIMATION_CONFIG.pageVariants.animate}
      exit={ANIMATION_CONFIG.pageVariants.exit}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-lg font-bold text-white">TT</span>
            </div>
            <span className="font-semibold text-lg hidden sm:block">
              TanTech Upskill
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="hidden sm:flex"
              >
                Admin Panel
              </Button>
            )}

            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="hidden sm:block font-medium">
                {profile?.full_name || user?.email}
              </span>
            </div>

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
          {/* Monthly Check-In Banner */}
          <AnimatePresence>
            {showCheckInBanner && eventData && (
              <motion.div variants={itemVariants}>
                <MonthlyCheckInBanner
                  monthNumber={monthNumber}
                  event={eventData}
                  onDismiss={handleDismissBanner}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Welcome Section */}
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Learner"}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Continue your learning journey and reach your weekly goals.
            </p>
          </motion.div>

          {/* Recent Badges */}
          <motion.div variants={itemVariants}>
            <RecentBadges className="mb-4" />
          </motion.div>

          {/* Overall Course Progress */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {completedCount} of {totalModules} modules completed
                    </span>
                  </div>
                  <ProgressBarFill value={overallPercent} maxValue={100} className="h-3" />
                </div>

                {currentModule && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Continue where you left off:
                    </p>
                    <Button
                      onClick={() => navigate(`/module/${currentModuleId}`)}
                      className="w-full sm:w-auto"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      {currentModule.title || "Continue Learning"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 36-Month Timeline */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Your Learning Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline
                  modules={timelineModules}
                  currentModuleId={currentModuleId}
                  totalSlots={36}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.title}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Timesheet Widget */}
          <motion.div variants={itemVariants}>
            <TimesheetWidget />
          </motion.div>

          {/* Badges & Courses Grid */}
          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Enrolled Courses */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Continue Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrollments.length > 0 ? (
                  <div className="space-y-3">
                    {enrollments.slice(0, 3).map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate(`/course/${enrollment.courses?.id}`)
                        }
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {enrollment.courses?.title?.charAt(0) || "C"}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {enrollment.courses?.title}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {enrollment.courses?.skill_tag || "General"}
                          </p>
                        </div>
                        {enrollment.completed_at && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No courses enrolled yet. Browse available courses to get started!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Skills Earned */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Skills Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                {skills.length > 0 ? (
                  <motion.div
                    className="flex flex-wrap gap-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                  >
                    {skills.map((skill, index) => (
                      <motion.div
                        key={`${skill.skill_tag}-${index}`}
                        variants={{
                          hidden: { opacity: 0, scale: 0.8 },
                          visible: { opacity: 1, scale: 1 },
                        }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Badge
                          variant={getSkillVariant(skill.skill_tag)}
                          className="text-sm px-3 py-1"
                        >
                          {skill.skill_tag}
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8">
                    <Code2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Complete courses to earn skill badges!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Badges (Incentive Badges) */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {badges.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {badges.slice(0, 8).map((badge) => (
                      <BadgeCard key={badge?.id} badge={badge} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Earn badges by completing modules and meeting your learning goals!
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Streak highlight if active */}
          {streak.current >= 2 && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-md bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <StreakBounce 
                      streak={streak.current} 
                      emoji="🔥" 
                      className="text-4xl"
                    />
                    <div>
                      <p className="font-semibold text-lg">
                        You're on a {streak.current}-week streak!
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Keep meeting your weekly target to maintain your streak.
                        Longest streak: {streak.longest} weeks.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>
    </motion.div>
  );
}
