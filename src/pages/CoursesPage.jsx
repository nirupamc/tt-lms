import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ANIMATION_CONFIG } from "@/lib/animations";
import { HoverCard, ProgressBarFill, SkeletonFade } from "@/components/animations/index";
import { EnrollButton } from "@/components/animations/interactive";
import {
  BookOpen,
  Clock,
  Users,
  Search,
  Filter,
  GraduationCap,
  ArrowLeft,
  Star,
  TrendingUp,
} from "lucide-react";

// Course Card with animations (#7 HoverCard, #14 EnrollButton, #4 ProgressBar)
function CourseCard({ course, enrollment, onEnroll }) {
  const navigate = useNavigate();
  const isEnrolled = !!enrollment;
  const progress = enrollment?.progress_percent || 0;

  const skillColors = {
    react: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    git: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    javascript: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    typescript: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    python: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    sql: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    node: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    docker: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  };

  const handleCardClick = () => {
    if (isEnrolled) {
      navigate(`/courses/${course.id}`);
    }
  };

  return (
    <HoverCard className="h-full">
      <Card 
        className={`h-full border-0 shadow-md overflow-hidden ${isEnrolled ? 'cursor-pointer' : ''}`}
        onClick={isEnrolled ? handleCardClick : undefined}
      >
        {/* Course Image/Banner */}
        <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-16 h-16 text-slate-300 dark:text-slate-600" />
          </div>
          {course.skill_tag && (
            <Badge 
              className={`absolute top-3 left-3 ${skillColors[course.skill_tag.toLowerCase()] || 'bg-slate-100 text-slate-700'}`}
            >
              {course.skill_tag}
            </Badge>
          )}
          {course.featured && (
            <Badge className="absolute top-3 right-3 bg-amber-500 text-white">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>

        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 mb-2">{course.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          </div>

          {/* Course Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{course.module_count || 0} modules</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration_hours || '?'}h</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.enrollment_count || 0}</span>
            </div>
          </div>

          {/* Progress Bar (if enrolled) */}
          {isEnrolled && (
            <ProgressBarFill value={progress} maxValue={100} className="pt-2" />
          )}

          {/* Enroll Button with morph animation (#14) */}
          <div onClick={(e) => e.stopPropagation()}>
            <EnrollButton
              isEnrolled={isEnrolled}
              onClick={() => !isEnrolled && onEnroll(course.id)}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </HoverCard>
  );
}

// Course Card Skeleton
function CourseCardSkeleton() {
  return (
    <Card className="h-full border-0 shadow-md overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSkill, setFilterSkill] = useState("all");
  const [enrolling, setEnrolling] = useState(null);

  // Fetch courses and enrollments
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch published courses with counts
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            modules:modules(count),
            enrollments:enrollments(count)
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (coursesError) throw coursesError;

        // Transform data
        const transformedCourses = (coursesData || []).map(course => ({
          ...course,
          module_count: course.modules?.[0]?.count || 0,
          enrollment_count: course.enrollments?.[0]?.count || 0,
        }));

        setCourses(transformedCourses);

        // Fetch user's enrollments with progress
        if (user?.id) {
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('course_id, enrolled_at')
            .eq('user_id', user.id);

          if (enrollmentsError) throw enrollmentsError;

          // Get progress for each enrollment
          const enrollmentsWithProgress = await Promise.all(
            (enrollmentsData || []).map(async (enrollment) => {
              const { data: progressData } = await supabase
                .rpc('get_course_progress', { 
                  p_user_id: user.id, 
                  p_course_id: enrollment.course_id 
                });
              
              return {
                ...enrollment,
                progress_percent: progressData?.progress_percent || 0,
              };
            })
          );

          setEnrollments(enrollmentsWithProgress);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load courses. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, toast]);

  // Handle enrollment
  const handleEnroll = async (courseId) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to enroll in courses.",
      });
      return;
    }

    setEnrolling(courseId);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({ user_id: user.id, course_id: courseId });

      if (error) throw error;

      // Update local state
      setEnrollments(prev => [...prev, { course_id: courseId, enrolled_at: new Date().toISOString(), progress_percent: 0 }]);

      toast({
        variant: "success",
        title: "Enrolled successfully!",
        description: "You can now start learning.",
      });
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({
        variant: "destructive",
        title: "Enrollment failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setEnrolling(null);
    }
  };

  // Get unique skill tags
  const skillTags = [...new Set(courses.map(c => c.skill_tag).filter(Boolean))];

  // Filter courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = filterSkill === "all" || course.skill_tag === filterSkill;
    return matchesSearch && matchesSkill;
  });

  // Get enrollment for a course
  const getEnrollment = (courseId) => enrollments.find(e => e.course_id === courseId);

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      initial={ANIMATION_CONFIG.pageVariants.initial}
      animate={ANIMATION_CONFIG.pageVariants.animate}
      exit={ANIMATION_CONFIG.pageVariants.exit}
      transition={ANIMATION_CONFIG.pageVariants.transition}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
              <h1 className="text-2xl font-bold">Course Catalog</h1>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>{enrollments.length} enrolled</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterSkill === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSkill("all")}
            >
              All
            </Button>
            {skillTags.map(skill => (
              <Button
                key={skill}
                variant={filterSkill === skill ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterSkill(skill)}
              >
                {skill}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Course Grid with Skeleton Fade (#11) */}
        <SkeletonFade
          isLoading={loading}
          skeleton={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          {filteredCourses.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={{
                animate: {
                  transition: { staggerChildren: ANIMATION_CONFIG.stagger.standard }
                }
              }}
              initial="initial"
              animate="animate"
            >
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  variants={ANIMATION_CONFIG.staggerItem}
                >
                  <CourseCard
                    course={course}
                    enrollment={getEnrollment(course.id)}
                    onEnroll={handleEnroll}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterSkill !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "No courses are available yet"}
              </p>
            </motion.div>
          )}
        </SkeletonFade>
      </main>
    </motion.div>
  );
}
