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
  HoverCard,
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
  ChevronRight,
  Play,
  Target,
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
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-center gap-4">
        <Calendar className="w-8 h-8" />
        <div>
          <h3 className="font-semibold text-lg">
            🎉 Month {monthNumber} Check-in!
          </h3>
          <p className="text-white/90 text-sm mb-2">{event.description}</p>
          
          {event.video_url && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={() => window.open(event.video_url, '_blank')}
            >
              <Video className="w-4 h-4 mr-2" />
              Watch Anniversary Video
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DashboardPage() {
  const { profile, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [showCheckInBanner, setShowCheckInBanner] = useState(false);
  
  // Fetch user data
  const {
    progress,
    completedCount,
    totalModules,
    currentModuleId,
    overallPercent,
    loading: progressLoading,
  } = useProgress(profile?.id || session?.user?.id);

  const [enrollments, setEnrollments] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [skills, setSkills] = useState([]);
  const [badges, setBadges] = useState([]);
  const [totalTimeSpentHours, setTotalTimeSpentHours] = useState(0);

  // Find current module for continue button
  const currentModule = useMemo(() => {
    if (!currentModuleId || !enrollments || !Array.isArray(enrollments) || !enrollments.length) return null;
    
    for (const enrollment of enrollments) {
      if (!enrollment?.courses?.sections) continue;
      
      for (const section of enrollment.courses.sections) {
        if (!section?.modules) continue;
        
        const module = section.modules.find(m => m.id === currentModuleId);
        if (module) return module;
      }
    }
    return null;
  }, [currentModuleId, enrollments]);

  // Build timeline modules
  const timelineModules = useMemo(() => {
    if (!enrollments || !Array.isArray(enrollments) || !enrollments.length) return [];
    
    const modules = [];
    enrollments.forEach(enrollment => {
      if (!enrollment?.courses?.sections) return;
      
      enrollment.courses.sections.forEach(section => {
        if (!section?.modules) return;
        
        section.modules.forEach(module => {
          const moduleProgress = progress?.find?.(p => p.module_id === module.id);
          modules.push({
            ...module,
            completed: moduleProgress?.completed || false,
            courseTitle: enrollment.courses.title,
            sectionTitle: section.title,
          });
        });
      });
    });
    
    return modules.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [enrollments, progress]);

  // Animation variants
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
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  // Fetch additional data
  useEffect(() => {
    const userId = profile?.id || session?.user?.id;
    if (!userId) return;

    const fetchData = async () => {
      try {
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
              description,
              skill_tag,
              sections (
                id,
                title,
                sort_order,
                modules (
                  id,
                  title,
                  sort_order,
                  module_type,
                  duration_minutes
                )
              )
            )
          `)
          .eq("user_id", userId)
          .order("enrolled_at", { ascending: false });
        
        if (enrollmentsData) setEnrollments(enrollmentsData);

        // Fetch streak data
        const { data: streakData } = await supabase
          .from("weekly_streaks")
          .select("current_streak, longest_streak")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (streakData) setStreak(streakData);
        
        // Fetch skills
        const { data: skillsData } = await supabase
          .from("skills_earned")
          .select("skill_tag")
          .eq("user_id", userId);
        
        if (skillsData) setSkills(skillsData);

        // Fetch badges
        const { data: badgesData } = await supabase
          .from("user_badges")
          .select(`
            id,
            awarded_at,
            context_json,
            incentive_badges (
              slug,
              label,
              description,
              icon_emoji,
              tier
            )
          `)
          .eq("user_id", userId)
          .order("awarded_at", { ascending: false });
        
        if (badgesData) setBadges(badgesData);

        // Fetch time spent
        const { data: timeData } = await supabase
          .rpc("get_user_time_summary", {
            p_user_id: userId,
            p_period: "all_time"
          });
        
        if (timeData?.[0]?.total_hours) {
          setTotalTimeSpentHours(Math.round(timeData[0].total_hours));
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, [profile?.id, session?.user?.id]);

  // Anniversary event check
  useEffect(() => {
    const userCreatedAt = profile?.created_at || session?.user?.created_at;
    if (!userCreatedAt) return;

    const checkAnniversaryEvent = async () => {
      try {
        const createdDate = new Date(userCreatedAt);
        const currentDate = new Date();
        const daysSinceJoining = differenceInDays(currentDate, createdDate);
        const monthsSinceJoining = Math.floor(daysSinceJoining / 30);
        
        if (monthsSinceJoining > 0 && daysSinceJoining % 30 < 7) {
          const { data: event } = await supabase
            .from("events")
            .select("*")
            .eq("event_type", "anniversary")
            .eq("month_number", monthsSinceJoining)
            .single();
          
          if (event) {
            setEventData(event);
            setShowCheckInBanner(true);
          }
        }
      } catch (error) {
        console.error("Error checking anniversary event:", error);
      }
    };

    checkAnniversaryEvent();
  }, [profile?.created_at, session?.user?.created_at]);

  const monthNumber = useMemo(() => {
    const userCreatedAt = profile?.created_at || session?.user?.created_at;
    if (!userCreatedAt) return 0;
    const createdDate = new Date(userCreatedAt);
    const currentDate = new Date();
    return Math.floor(differenceInDays(currentDate, createdDate) / 30);
  }, [profile?.created_at, session?.user?.created_at]);

  const handleDismissBanner = () => {
    setShowCheckInBanner(false);
  };

  const getSkillVariant = (skillTag) => {
    const variants = ["default", "secondary", "outline"];
    const hash = skillTag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return variants[hash % variants.length];
  };

  if (authLoading || progressLoading) {
    return <SkeletonFade className="min-h-screen" />;
  }

  // Use either profile name or email as fallback
  const displayName = profile?.full_name?.split(" ")[0] || 
                     session?.user?.email?.split("@")[0] || 
                     "Learner";

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Profile
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
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

          {/* Hero Section - Welcome + Primary Action */}
          <motion.div variants={itemVariants}>
            <div className="text-center py-8">
              <h1 className="text-4xl font-bold tracking-tight mb-3">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
                Continue your learning journey and reach your goals.
              </p>
              
              {/* Primary Progress Card */}
              <Card className="max-w-2xl mx-auto border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Your Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        {completedCount} of {totalModules} modules completed
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{overallPercent}%</div>
                    </div>
                  </div>
                  
                  <ProgressBarFill
                    value={overallPercent}
                    maxValue={100}
                    className="h-3 mb-4"
                  />

                  {currentModule ? (
                    <Button
                      onClick={() => navigate(`/module/${currentModuleId}`)}
                      className="w-full"
                      size="lg"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continue: {currentModule.title || "Next Module"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate("/courses")}
                      className="w-full"
                      size="lg"
                      variant="outline"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Browse Courses
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Key Stats - Simplified */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="text-center">
                <CardContent className="p-4">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{totalTimeSpentHours}h</div>
                  <div className="text-sm text-muted-foreground">Time Spent</div>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-4">
                  <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{streak?.current || 0}</div>
                  <div className="text-sm text-muted-foreground">Week Streak</div>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-4">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{badges?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Badges</div>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-4">
                  <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{enrollments?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Courses</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Column - Learning Path */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Learning Journey - Condensed Timeline */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <span>Your Learning Journey</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {completedCount}/{totalModules} modules
                      </span>
                    </CardTitle>
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

              {/* Continue Learning - Course List */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Your Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {enrollments && enrollments.length > 0 ? (
                      <div className="space-y-3">
                        {enrollments.slice(0, 4).map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                            onClick={() =>
                              navigate(`/course/${enrollment.courses?.id}`)
                            }
                          >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                              {enrollment.courses?.title?.charAt(0) || "C"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">
                                {enrollment.courses?.title}
                              </p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {enrollment.courses?.skill_tag || "General"}
                              </p>
                            </div>
                            {enrollment.completed_at ? (
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                  Completed
                                </span>
                              </div>
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                          </div>
                        ))}
                        
                        {enrollments.length > 4 && (
                          <Button 
                            variant="ghost" 
                            className="w-full mt-4"
                            onClick={() => navigate("/courses")}
                          >
                            View All Courses
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No courses enrolled yet
                        </p>
                        <Button onClick={() => navigate("/courses")}>
                          Browse Courses
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Quick Info */}
            <div className="space-y-6">
              
              {/* Recent Badges */}
              <motion.div variants={itemVariants}>
                <RecentBadges className="mb-0" />
              </motion.div>

              {/* Weekly Time Tracking */}
              <motion.div variants={itemVariants}>
                <TimesheetWidget />
              </motion.div>

              {/* Skills Summary */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code2 className="w-5 h-5" />
                      Skills Earned
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {skills && skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 8).map((skill, index) => (
                          <Badge
                            key={`${skill.skill_tag}-${index}`}
                            variant={getSkillVariant(skill.skill_tag)}
                            className="text-xs"
                          >
                            {skill.skill_tag}
                          </Badge>
                        ))}
                        {skills.length > 8 && (
                          <Badge variant="outline" className="text-xs">
                            +{skills.length - 8} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Code2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Complete courses to earn skill badges!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Streak highlight if active */}
              {streak?.current >= 2 && (
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
            </div>
          </div>
        </motion.div>
      </main>
    </motion.div>
  );
}

export default DashboardPage;