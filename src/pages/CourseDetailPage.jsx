import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ANIMATION_CONFIG } from "@/lib/animations";
import {
  ProgressBarFill,
  SkeletonFade,
  ParticleBurst,
  CompletionCheckmark,
} from "@/components/animations/index";
import {
  SidebarAccordion,
  EnrollButton,
  NavIndicator,
} from "@/components/animations/interactive";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  Play,
  FileText,
  Code,
  CheckCircle,
  Lock,
  ChevronRight,
  Trophy,
  GraduationCap,
} from "lucide-react";

// Module Type Icons
const moduleIcons = {
  video: Play,
  text: FileText,
  quiz: Trophy,
  code: Code,
};

// Module Item Component
function ModuleItem({ module, isActive, isUnlocked, isCompleted, onClick }) {
  const Icon = moduleIcons[module.type] || FileText;

  return (
    <motion.button
      onClick={() => isUnlocked && onClick(module)}
      disabled={!isUnlocked}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
        isActive
          ? "bg-primary/10 text-primary"
          : isUnlocked
            ? "hover:bg-slate-100 dark:hover:bg-slate-800"
            : "opacity-50 cursor-not-allowed"
      }`}
      whileHover={isUnlocked ? { x: 4 } : undefined}
      transition={{ type: "tween", duration: 0.15 }}
    >
      {/* Active indicator with layout animation (#15) */}
      {isActive && (
        <NavIndicator layoutId="activeModule" className="left-0 h-full w-1" />
      )}

      <div
        className={`p-2 rounded-lg ${
          isCompleted
            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            : isActive
              ? "bg-primary/20 text-primary"
              : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
        }`}
      >
        {isCompleted ? (
          <CheckCircle className="w-4 h-4" />
        ) : !isUnlocked ? (
          <Lock className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm truncate ${isCompleted ? "text-green-600 dark:text-green-400" : ""}`}
        >
          {module.title}
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          {module.type}
        </p>
      </div>

      {isUnlocked && !isCompleted && (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </motion.button>
  );
}

// Section Skeleton
function SectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="pl-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState({});
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(null);
  const [completedModules, setCompletedModules] = useState(new Set());
  const [showBurst, setShowBurst] = useState(false);

  // Fetch course details and progress
  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch sections with modules
        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select(
            `
            *,
            modules:modules(*)
          `,
          )
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });

        if (sectionsError) throw sectionsError;

        // Sort modules within each section
        const sortedSections = (sectionsData || []).map((section) => ({
          ...section,
          modules: (section.modules || []).sort(
            (a, b) => a.sort_order - b.sort_order,
          ),
        }));
        setSections(sortedSections);

        // Fetch user's enrollment
        if (user?.id) {
          const { data: enrollmentData } = await supabase
            .from("enrollments")
            .select("*")
            .eq("user_id", user.id)
            .eq("course_id", courseId)
            .single();

          setEnrollment(enrollmentData);

          // Fetch progress if enrolled
          if (enrollmentData) {
            const { data: progressData } = await supabase
              .from("progress")
              .select("module_id, status")
              .eq("user_id", user.id);

            const progressMap = {};
            const completedSet = new Set();
            (progressData || []).forEach((p) => {
              progressMap[p.module_id] = p.status;
              if (p.status === "completed") {
                completedSet.add(p.module_id);
              }
            });
            setProgress(progressMap);
            setCompletedModules(completedSet);
          }
        }
      } catch (error) {
        console.error("Error fetching course:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load course details.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, user?.id, toast]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const allModules = sections.flatMap((s) => s.modules);
    if (allModules.length === 0) return 0;
    return Math.round((completedModules.size / allModules.length) * 100);
  }, [sections, completedModules]);

  // Check if module is unlocked (sequential unlock logic)
  const isModuleUnlocked = useCallback(
    (sectionIndex, moduleIndex) => {
      // First module of first section is always unlocked
      if (sectionIndex === 0 && moduleIndex === 0) return true;

      // Check if previous module in this section is completed
      if (moduleIndex > 0) {
        const prevModule = sections[sectionIndex].modules[moduleIndex - 1];
        return completedModules.has(prevModule.id);
      }

      // Check if last module of previous section is completed
      if (sectionIndex > 0) {
        const prevSection = sections[sectionIndex - 1];
        const lastModule = prevSection.modules[prevSection.modules.length - 1];
        return completedModules.has(lastModule?.id);
      }

      return false;
    },
    [sections, completedModules],
  );

  // Handle module click
  const handleModuleClick = (module) => {
    setActiveModule(module);
    navigate(`/learn/${courseId}/module/${module.id}`);
  };

  // Handle enrollment
  const handleEnroll = async () => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to enroll in courses.",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: courseId })
        .select()
        .single();

      if (error) throw error;

      setEnrollment(data);
      toast({
        variant: "success",
        title: "Enrolled!",
        description: `You're now enrolled in ${course?.title}`,
      });
    } catch (error) {
      console.error("Enrollment error:", error);
      toast({
        variant: "destructive",
        title: "Enrollment failed",
        description: error.message,
      });
    }
  };

  // Start course (navigate to first module)
  const handleStartCourse = () => {
    const firstModule = sections[0]?.modules[0];
    if (firstModule) {
      handleModuleClick(firstModule);
    }
  };

  // Continue learning (navigate to first incomplete module)
  const handleContinue = () => {
    for (const section of sections) {
      for (const module of section.modules) {
        if (!completedModules.has(module.id)) {
          handleModuleClick(module);
          return;
        }
      }
    }
    // All complete, go to first module
    handleStartCourse();
  };

  // Format sections for SidebarAccordion
  const accordionSections = useMemo(() => {
    return sections.map((section, sectionIndex) => ({
      id: section.id,
      title: section.title,
      badge: `${section.modules.filter((m) => completedModules.has(m.id)).length}/${section.modules.length}`,
      children: section.modules.map((module, moduleIndex) => (
        <ModuleItem
          key={module.id}
          module={module}
          isActive={activeModule?.id === module.id}
          isUnlocked={isModuleUnlocked(sectionIndex, moduleIndex)}
          isCompleted={completedModules.has(module.id)}
          onClick={handleModuleClick}
        />
      )),
    }));
  }, [sections, activeModule, completedModules, isModuleUnlocked]);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      initial={ANIMATION_CONFIG.pageVariants.initial}
      animate={ANIMATION_CONFIG.pageVariants.animate}
      exit={ANIMATION_CONFIG.pageVariants.exit}
      transition={ANIMATION_CONFIG.pageVariants.transition}
    >
      {/* Particle Burst on course completion */}
      <AnimatePresence>
        {showBurst && <ParticleBurst onComplete={() => setShowBurst(false)} />}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/courses")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Courses
              </Button>
              {!loading && course && (
                <>
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                  <h1 className="text-lg font-semibold truncate max-w-md">
                    {course.title}
                  </h1>
                </>
              )}
            </div>

            {enrollment && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {overallProgress}% complete
                </div>
                <div className="w-32">
                  <ProgressBarFill value={overallProgress} maxValue={100} />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <SkeletonFade
          isLoading={loading}
          skeleton={
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SectionSkeleton key={i} />
                ))}
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Course Hero */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <GraduationCap className="w-24 h-24 text-primary/20" />
                    </div>
                    {course?.skill_tag && (
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                        {course.skill_tag}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-3">{course?.title}</h2>
                    <p className="text-muted-foreground mb-6">
                      {course?.description}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>
                          {sections.reduce(
                            (sum, s) => sum + s.modules.length,
                            0,
                          )}{" "}
                          modules
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{course?.duration_hours || "?"} hours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{course?.enrollment_count || 0} enrolled</span>
                      </div>
                    </div>

                    {/* Enroll or Continue Button */}
                    {!enrollment ? (
                      <EnrollButton
                        isEnrolled={false}
                        onClick={handleEnroll}
                        className="w-full"
                      />
                    ) : overallProgress === 0 ? (
                      <Button
                        onClick={handleStartCourse}
                        className="w-full"
                        size="lg"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Learning
                      </Button>
                    ) : overallProgress < 100 ? (
                      <Button
                        onClick={handleContinue}
                        className="w-full"
                        size="lg"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-3 text-green-600 dark:text-green-400">
                        <CompletionCheckmark size={24} />
                        <span className="font-semibold">Course Completed!</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Course Info Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">What you'll learn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {course?.learning_objectives?.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                          <span>{objective}</span>
                        </li>
                      )) || (
                        <li className="text-muted-foreground">
                          Learning objectives coming soon...
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar - Course Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="sticky top-24">
                <h3 className="font-semibold mb-4">Course Content</h3>
                {enrollment ? (
                  <SidebarAccordion sections={accordionSections} />
                ) : (
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-6 text-center">
                      <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Enroll to access course content
                      </p>
                      <EnrollButton
                        isEnrolled={false}
                        onClick={handleEnroll}
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          </div>
        </SkeletonFade>
      </main>
    </motion.div>
  );
}
