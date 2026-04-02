import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/hooks/useProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { VideoPlayer } from "@/components/VideoPlayer";
import CodeChallenge from "@/components/CodeChallenge";
import { ANIMATION_CONFIG } from "@/lib/animations";
import {
  ParticleBurst,
  CompletionCheckmark,
  QuizPassConfetti,
  SkeletonFade,
  ProgressBarFill,
} from "@/components/animations/index";
import { RippleButton } from "@/components/animations/interactive";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  BookOpen,
  Code,
  Video,
  Target,
  Send,
  Eye,
} from "lucide-react";

// Code block component for markdown
function CodeBlock({ children, className, ...props }) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      className="rounded-lg !my-4 !text-sm"
      showLineNumbers
      {...props}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
}

// Markdown components configuration
const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    if (inline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <CodeBlock className={className} {...props}>
        {children}
      </CodeBlock>
    );
  },
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold mt-8 mb-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-semibold mt-6 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-medium mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-4 leading-7 text-slate-700 dark:text-slate-300">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 ml-6 list-disc space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-6 list-decimal space-y-2">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-indigo-500 pl-4 italic text-slate-600 dark:text-slate-400">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 dark:text-indigo-400 hover:underline"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-sm font-semibold bg-slate-100 dark:bg-slate-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-sm border-t border-slate-200 dark:border-slate-700">
      {children}
    </td>
  ),
};

// Project Submission Form Component
function ProjectSubmissionForm({ moduleId, userId, onSubmitted }) {
  const [githubUrl, setGithubUrl] = useState("");
  const [hostedUrl, setHostedUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!githubUrl.trim()) {
      toast({
        variant: "destructive",
        title: "GitHub URL required",
        description: "Please provide a link to your GitHub repository.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("milestone_submissions").insert({
        user_id: userId,
        module_id: moduleId,
        submission_url: githubUrl.trim(),
        submission_text: hostedUrl.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      // Update progress to pending_review
      await supabase
        .from("progress")
        .update({ status: "pending_review" })
        .eq("user_id", userId)
        .eq("module_id", moduleId);

      toast({
        variant: "success",
        title: "Submission received!",
        description: "Your project is now awaiting admin review.",
      });

      onSubmitted?.();
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Project Submission
        </CardTitle>
        <CardDescription>
          Submit your project for review. Provide links to your GitHub
          repository and optionally a hosted demo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github_url">GitHub Repository URL *</Label>
            <Input
              id="github_url"
              type="url"
              placeholder="https://github.com/username/project"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hosted_url">Hosted Demo URL (optional)</Label>
            <Input
              id="hosted_url"
              type="url"
              placeholder="https://your-project.vercel.app"
              value={hostedUrl}
              onChange={(e) => setHostedUrl(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Pending Review Banner
function PendingReviewBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3"
    >
      <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Awaiting Admin Review
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Your submission has been received. You'll be notified once it's
          reviewed.
        </p>
      </div>
    </motion.div>
  );
}

// Module type icon helper
function getModuleIcon(type) {
  switch (type) {
    case "video":
      return Video;
    case "reading":
      return BookOpen;
    case "code_challenge":
      return Code;
    case "milestone":
      return Target;
    default:
      return FileText;
  }
}

export default function ModuleViewerPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    progressList,
    currentModuleId,
    markModuleComplete,
    refetch: refetchProgress,
  } = useProgress(user?.id);

  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [showCompletionBurst, setShowCompletionBurst] = useState(false);

  // Scroll tracking for reading modules (80% scroll gate)
  const [hasScrolledToThreshold, setHasScrolledToThreshold] = useState(false);
  const contentRef = useRef(null);
  const scrollSentinelRef = useRef(null);

  // Get current progress for this module
  const moduleProgress = progressList.find((p) => p.module_id === moduleId);
  const isCompleted =
    moduleProgress?.completed || moduleProgress?.status === "completed";
  const isPendingReview = moduleProgress?.status === "pending_review";
  const isMilestone = module?.is_milestone;
  const isReadingModule =
    module?.module_type === "reading" && !module?.video_local_path;

  // IntersectionObserver for scroll gating
  useEffect(() => {
    if (!scrollSentinelRef.current || isCompleted || !isReadingModule) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasScrolledToThreshold(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(scrollSentinelRef.current);

    return () => observer.disconnect();
  }, [module, isCompleted, isReadingModule]);

  // Fetch module data
  useEffect(() => {
    const fetchModule = async () => {
      if (!moduleId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch module with section info
        const { data: moduleData, error: moduleError } = await supabase
          .from("modules")
          .select(
            `
            *,
            sections (
              id,
              title,
              course_id,
              courses (
                id,
                title
              )
            )
          `,
          )
          .eq("id", moduleId)
          .single();

        if (moduleError) throw moduleError;
        setModule(moduleData);

        // Check for existing submission if milestone
        if (moduleData?.is_milestone && user?.id) {
          const { data: submissionData } = await supabase
            .from("milestone_submissions")
            .select("*")
            .eq("user_id", user.id)
            .eq("module_id", moduleId)
            .order("submitted_at", { ascending: false })
            .limit(1)
            .single();

          setSubmission(submissionData);
        }
      } catch (err) {
        console.error("Error fetching module:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchModule();
  }, [moduleId, user?.id]);

  // Handle mark complete
  const handleMarkComplete = async () => {
    setIsCompleting(true);

    try {
      const { data, error } = await markModuleComplete(moduleId);

      if (error) throw error;

      // Trigger completion burst animation
      setShowCompletionBurst(true);

      toast({
        variant: "success",
        title: "Module completed! 🎉",
        description: data?.next_module?.course_completed
          ? "Congratulations! You've completed the course!"
          : "Great work! Moving to the next module.",
      });

      // Navigate to next module if available
      if (data?.next_module?.next_module_id) {
        setTimeout(() => {
          navigate(`/module/${data.next_module.next_module_id}`);
        }, 1500);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle submission complete
  const handleSubmissionComplete = () => {
    refetchProgress();
    // Refetch submission status
    supabase
      .from("milestone_submissions")
      .select("*")
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setSubmission(data));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Module Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "The requested module could not be found."}
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ModuleIcon = getModuleIcon(module.module_type);

  return (
    <div className="min-h-screen bg-background">
      {/* Completion Particle Burst Animation */}
      <AnimatePresence>
        {showCompletionBurst && (
          <ParticleBurst
            onComplete={() => setShowCompletionBurst(false)}
            color="rgb(34, 197, 94)"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div>
                <p className="text-sm text-muted-foreground">
                  {module.sections?.courses?.title}
                </p>
                <h1 className="font-semibold">{module.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm">
                <ModuleIcon className="w-4 h-4" />
                <span className="capitalize">
                  {module.module_type?.replace("_", " ")}
                </span>
              </div>

              {isCompleted && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Pending review banner */}
          <AnimatePresence>
            {isPendingReview && <PendingReviewBanner />}
          </AnimatePresence>

          {/* Module description */}
          {module.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-muted-foreground"
            >
              {module.description}
            </motion.p>
          )}

          {/* PDF attachment download */}
          {module.attachment_url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <a
                href={module.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Resource</span>
              </a>
            </motion.div>
          )}

          {/* Video player */}
          {module.video_local_path && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <VideoPlayer
                moduleId={moduleId}
                videoLocalPath={module.video_local_path}
              />
            </motion.div>
          )}

          {/* Code Challenge Block */}
          {module.module_type === "code_challenge" && module.content_json && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CodeChallenge
                moduleId={moduleId}
                contentJson={module.content_json}
                onComplete={handleMarkComplete}
                isCompleted={isCompleted}
              />
            </motion.div>
          )}

          {/* Markdown content */}
          {module.content_body && (
            <motion.article
              ref={contentRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="prose prose-slate dark:prose-invert max-w-none relative"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {module.content_body}
              </ReactMarkdown>

              {/* Scroll sentinel placed at 80% of content - for reading modules only */}
              {isReadingModule && !isCompleted && (
                <div
                  ref={scrollSentinelRef}
                  className="absolute bottom-[20%] h-1 w-full pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </motion.article>
          )}

          {/* Duration info */}
          {module.duration_minutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Estimated duration: {module.duration_minutes} minutes</span>
            </div>
          )}

          {/* Action section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pt-8 border-t"
          >
            {isMilestone && !isCompleted && !isPendingReview ? (
              // Milestone submission form
              <ProjectSubmissionForm
                moduleId={moduleId}
                userId={user?.id}
                onSubmitted={handleSubmissionComplete}
              />
            ) : isPendingReview ? (
              // Already submitted, waiting for review
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Your submission is being reviewed. Please wait for admin
                  feedback.
                </p>
              </div>
            ) : module?.module_type === "code_challenge" && !isCompleted ? (
              // Code challenge - completion handled by CodeChallenge component
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Complete the code challenge above to mark this module as done.
                </p>
              </div>
            ) : !isCompleted ? (
              // Regular module - Mark Complete button (gated for reading modules)
              <div className="flex items-center justify-between">
                {isReadingModule && !hasScrolledToThreshold ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">
                      Scroll to 80% of the content to unlock
                    </span>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Ready to continue? Mark this module as complete.
                  </p>
                )}
                <Button
                  size="lg"
                  onClick={handleMarkComplete}
                  disabled={
                    isCompleting || (isReadingModule && !hasScrolledToThreshold)
                  }
                  className="group"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Mark Complete
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Already completed
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CompletionCheckmark size={20} />
                  <span className="font-medium">Module Completed</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Back to Dashboard
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
