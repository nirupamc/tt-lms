import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Loader2,
  BookOpen,
  FileText,
  Video,
  HelpCircle,
  Code2,
  Flag,
} from "lucide-react";
import QuizBuilder from "@/components/admin/QuizBuilder";
import CodeChallengeBuilder from "@/components/admin/CodeChallengeBuilder";

const MODULE_TYPES = [
  { value: 'reading', label: 'Reading', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle },
  { value: 'code_challenge', label: 'Code Challenge', icon: Code2 },
  { value: 'milestone', label: 'Milestone Project', icon: Flag },
];

export default function CourseBuilderPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  
  // Course dialog state
  const [courseDialog, setCourseDialog] = useState({ open: false, mode: "create", data: null });
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    skill_tag: "",
    is_published: true,
  });

  // Module dialog state
  const [moduleDialog, setModuleDialog] = useState({ open: false, mode: "create", data: null, courseId: null });
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    module_type: "reading",
    content_body: "",
    video_local_path: "",
    duration_minutes: 15,
    is_milestone: false,
    // Quiz-specific fields
    quiz_questions: [],
    pass_threshold: 70,
    // Code challenge-specific fields
    code_challenge_config: {},
  });

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, id: null, title: "" });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          sections (
            id,
            title,
            sequence_number,
            modules (
              id,
              title,
              module_type,
              sort_order,
              is_milestone
            )
          )
        `)
        .order("sequence_number");

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load courses",
      });
    } finally {
      setLoading(false);
    }
  };

  // Course CRUD operations
  const openCourseDialog = (mode, course = null) => {
    if (mode === "edit" && course) {
      setCourseForm({
        title: course.title || "",
        description: course.description || "",
        skill_tag: course.skill_tag || "",
        is_published: course.is_published !== false,
      });
      setCourseDialog({ open: true, mode, data: course });
    } else {
      setCourseForm({ title: "", description: "", skill_tag: "", is_published: true });
      setCourseDialog({ open: true, mode, data: null });
    }
  };

  const handleCourseSave = async () => {
    try {
      if (courseDialog.mode === "create") {
        const { error } = await supabase.from("courses").insert([
          {
            ...courseForm,
            sequence_number: courses.length + 1,
          },
        ]);
        if (error) throw error;
        toast({ title: "Course created successfully" });
      } else {
        const { error } = await supabase
          .from("courses")
          .update(courseForm)
          .eq("id", courseDialog.data.id);
        if (error) throw error;
        toast({ title: "Course updated successfully" });
      }
      setCourseDialog({ open: false, mode: "create", data: null });
      fetchCourses();
    } catch (err) {
      console.error("Error saving course:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  };

  const handleCourseDelete = async (courseId, hard = false) => {
    try {
      if (hard) {
        const { error } = await supabase.from("courses").delete().eq("id", courseId);
        if (error) throw error;
        toast({ title: "Course deleted permanently" });
      } else {
        const { error } = await supabase
          .from("courses")
          .update({ is_published: false })
          .eq("id", courseId);
        if (error) throw error;
        toast({ title: "Course unpublished" });
      }
      setDeleteDialog({ open: false, type: null, id: null, title: "" });
      fetchCourses();
    } catch (err) {
      console.error("Error deleting course:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  };

  // Module CRUD operations
  const openModuleDialog = (mode, courseId, module = null) => {
    if (mode === "edit" && module) {
      // Parse content_json for quiz or code challenge
      const contentJson = module.content_json || {};
      setModuleForm({
        title: module.title || "",
        description: module.description || "",
        module_type: module.module_type || "reading",
        content_body: module.content_body || "",
        video_local_path: module.video_local_path || "",
        duration_minutes: module.duration_minutes || 15,
        is_milestone: module.is_milestone || false,
        quiz_questions: contentJson.questions || [],
        pass_threshold: contentJson.pass_threshold || 70,
        code_challenge_config: contentJson.language ? contentJson : {},
      });
      setModuleDialog({ open: true, mode, data: module, courseId });
    } else {
      setModuleForm({
        title: "",
        description: "",
        module_type: "reading",
        content_body: "",
        video_local_path: "",
        duration_minutes: 15,
        is_milestone: false,
        quiz_questions: [],
        pass_threshold: 70,
        code_challenge_config: {},
      });
      setModuleDialog({ open: true, mode, data: null, courseId });
    }
  };

  const handleModuleSave = async () => {
    try {
      // Get or create first section for this course
      let sectionId;
      const course = courses.find((c) => c.id === moduleDialog.courseId);
      if (course.sections && course.sections.length > 0) {
        sectionId = course.sections[0].id;
      } else {
        const { data: section, error: sectionError } = await supabase
          .from("sections")
          .insert([
            {
              course_id: moduleDialog.courseId,
              title: "Main Section",
              sequence_number: 1,
            },
          ])
          .select()
          .single();
        if (sectionError) throw sectionError;
        sectionId = section.id;
      }

      // Build the module data based on type
      const moduleData = {
        title: moduleForm.title,
        description: moduleForm.description,
        module_type: moduleForm.module_type,
        content_body: moduleForm.content_body,
        video_local_path: moduleForm.video_local_path,
        duration_minutes: moduleForm.duration_minutes,
        is_milestone: moduleForm.module_type === 'milestone',
      };

      // Build content_json based on module type
      if (moduleForm.module_type === 'quiz') {
        moduleData.content_json = {
          questions: moduleForm.quiz_questions,
          pass_threshold: moduleForm.pass_threshold,
        };
      } else if (moduleForm.module_type === 'code_challenge') {
        moduleData.content_json = moduleForm.code_challenge_config;
      }

      if (moduleDialog.mode === "create") {
        const { error } = await supabase.from("modules").insert([
          {
            ...moduleData,
            section_id: sectionId,
            sort_order: 1,
          },
        ]);
        if (error) throw error;
        toast({ title: "Module created successfully" });
      } else {
        const { error } = await supabase
          .from("modules")
          .update(moduleData)
          .eq("id", moduleDialog.data.id);
        if (error) throw error;
        toast({ title: "Module updated successfully" });
      }
      setModuleDialog({ open: false, mode: "create", data: null, courseId: null });
      fetchCourses();
    } catch (err) {
      console.error("Error saving module:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  };

  const handleModuleDelete = async (moduleId) => {
    try {
      const { error } = await supabase.from("modules").delete().eq("id", moduleId);
      if (error) throw error;
      toast({ title: "Module deleted" });
      setDeleteDialog({ open: false, type: null, id: null, title: "" });
      fetchCourses();
    } catch (err) {
      console.error("Error deleting module:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Course Builder</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage courses and modules
            </p>
          </div>
          <Button onClick={() => openCourseDialog("create")}>
            <Plus className="w-4 h-4 mr-2" />
            New Course
          </Button>
        </div>
      </motion.div>

      {/* Courses List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No courses yet. Create your first course!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((course, index) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() =>
                      setExpandedCourse(expandedCourse === course.id ? null : course.id)
                    }
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {expandedCourse === course.id ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <div>
                      <CardTitle className="text-xl">{course.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {course.description} • {course.sections?.[0]?.modules?.length || 0} modules
                        {!course.is_published && (
                          <span className="ml-2 text-amber-600">(Unpublished)</span>
                        )}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openCourseDialog("edit", course)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDeleteDialog({
                          open: true,
                          type: "course",
                          id: course.id,
                          title: course.title,
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded: Show Modules */}
              {expandedCourse === course.id && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Modules</h4>
                      <Button
                        size="sm"
                        onClick={() => openModuleDialog("create", course.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Module
                      </Button>
                    </div>

                    {course.sections?.[0]?.modules?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No modules yet. Add your first module!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {course.sections[0].modules.map((module) => (
                          <div
                            key={module.id}
                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                          >
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{module.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {module.module_type}
                                {module.is_milestone && " • Milestone Project"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openModuleDialog("edit", course.id, module)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  type: "module",
                                  id: module.id,
                                  title: module.title,
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Course Dialog */}
      <Dialog
        open={courseDialog.open}
        onOpenChange={(open) =>
          setCourseDialog({ ...courseDialog, open })
        }
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {courseDialog.mode === "create" ? "Create New Course" : "Edit Course"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="course-title">Title *</Label>
              <Input
                id="course-title"
                value={courseForm.title}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, title: e.target.value })
                }
                placeholder="Git & GitHub Mastery"
              />
            </div>
            <div>
              <Label htmlFor="course-desc">Description</Label>
              <Textarea
                id="course-desc"
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, description: e.target.value })
                }
                placeholder="Learn version control from scratch"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="skill-tag">Skill Tag</Label>
              <Input
                id="skill-tag"
                value={courseForm.skill_tag}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, skill_tag: e.target.value })
                }
                placeholder="git"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-published"
                checked={courseForm.is_published}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, is_published: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="is-published">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCourseDialog({ open: false, mode: "create", data: null })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleCourseSave}>
              {courseDialog.mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Dialog */}
      <Dialog
        open={moduleDialog.open}
        onOpenChange={(open) =>
          setModuleDialog({ ...moduleDialog, open })
        }
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {moduleDialog.mode === "create" ? "Create New Module" : "Edit Module"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Module Type Selector */}
            <div>
              <Label>Module Type *</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {MODULE_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = moduleForm.module_type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setModuleForm({
                          ...moduleForm,
                          module_type: type.value,
                          is_milestone: type.value === 'milestone',
                        })
                      }
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="module-title">Title *</Label>
              <Input
                id="module-title"
                value={moduleForm.title}
                onChange={(e) =>
                  setModuleForm({ ...moduleForm, title: e.target.value })
                }
                placeholder="Introduction to Git"
              />
            </div>
            <div>
              <Label htmlFor="module-desc">Description</Label>
              <Textarea
                id="module-desc"
                value={moduleForm.description}
                onChange={(e) =>
                  setModuleForm({ ...moduleForm, description: e.target.value })
                }
                placeholder="Learn the basics of version control"
                rows={2}
              />
            </div>

            {/* Conditional content based on module type */}
            {moduleForm.module_type === 'reading' && (
              <div>
                <Label htmlFor="content-body">Content (Markdown)</Label>
                <Textarea
                  id="content-body"
                  value={moduleForm.content_body}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, content_body: e.target.value })
                  }
                  placeholder="# What is Git?&#10;&#10;Git is a version control system..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {moduleForm.module_type === 'video' && (
              <>
                <div>
                  <Label htmlFor="video-path">Video Path *</Label>
                  <Input
                    id="video-path"
                    value={moduleForm.video_local_path}
                    onChange={(e) =>
                      setModuleForm({ ...moduleForm, video_local_path: e.target.value })
                    }
                    placeholder="git/intro.mp4"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Relative to ASSETS_BASE_PATH
                  </p>
                </div>
                <div>
                  <Label htmlFor="content-body">Video Description (Markdown)</Label>
                  <Textarea
                    id="content-body"
                    value={moduleForm.content_body}
                    onChange={(e) =>
                      setModuleForm({ ...moduleForm, content_body: e.target.value })
                    }
                    placeholder="In this video, you'll learn..."
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}

            {moduleForm.module_type === 'quiz' && (
              <QuizBuilder
                questions={moduleForm.quiz_questions}
                onChange={(questions) =>
                  setModuleForm({ ...moduleForm, quiz_questions: questions })
                }
                passThreshold={moduleForm.pass_threshold}
                onPassThresholdChange={(threshold) =>
                  setModuleForm({ ...moduleForm, pass_threshold: threshold })
                }
              />
            )}

            {moduleForm.module_type === 'code_challenge' && (
              <>
                <div>
                  <Label htmlFor="content-body">Instructions (Markdown)</Label>
                  <Textarea
                    id="content-body"
                    value={moduleForm.content_body}
                    onChange={(e) =>
                      setModuleForm({ ...moduleForm, content_body: e.target.value })
                    }
                    placeholder="# Challenge&#10;&#10;Write a function that..."
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
                <CodeChallengeBuilder
                  contentJson={moduleForm.code_challenge_config}
                  onChange={(config) =>
                    setModuleForm({ ...moduleForm, code_challenge_config: config })
                  }
                />
              </>
            )}

            {moduleForm.module_type === 'milestone' && (
              <div>
                <Label htmlFor="content-body">Project Brief (Markdown)</Label>
                <Textarea
                  id="content-body"
                  value={moduleForm.content_body}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, content_body: e.target.value })
                  }
                  placeholder="# Milestone Project&#10;&#10;Build a complete application that..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={moduleForm.duration_minutes}
                onChange={(e) =>
                  setModuleForm({
                    ...moduleForm,
                    duration_minutes: parseInt(e.target.value) || 15,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setModuleDialog({ open: false, mode: "create", data: null, courseId: null })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleModuleSave}>
              {moduleDialog.mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ ...deleteDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDialog.type === "course" ? "Course" : "Module"}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.title}"?
              {deleteDialog.type === "course" &&
                " You can choose to soft-delete (unpublish) or permanently delete."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, type: null, id: null, title: "" })
              }
            >
              Cancel
            </Button>
            {deleteDialog.type === "course" && (
              <Button
                variant="outline"
                onClick={() => handleCourseDelete(deleteDialog.id, false)}
              >
                Unpublish
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() =>
                deleteDialog.type === "course"
                  ? handleCourseDelete(deleteDialog.id, true)
                  : handleModuleDelete(deleteDialog.id)
              }
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
