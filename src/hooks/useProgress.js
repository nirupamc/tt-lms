import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * useProgress hook - fetches and manages user learning progress
 * @param {string} userId - The user's UUID
 * @returns {Object} Progress data including overall percentage and current module
 */
export function useProgress(userId) {
  const [progressData, setProgressData] = useState([]);
  const [totalModules, setTotalModules] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch progress data
  const fetchProgress = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all progress records for the user with module details
      const { data: progress, error: progressError } = await supabase
        .from("progress")
        .select(
          `
          id,
          module_id,
          status,
          completed,
          completed_at,
          progress_percent,
          time_spent_seconds,
          modules (
            id,
            title,
            description,
            module_type,
            is_milestone,
            sort_order,
            section_id,
            sections (
              id,
              title,
              sort_order,
              course_id
            )
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (progressError) throw progressError;

      // Count total modules across all enrolled courses
      const courseIds = [
        ...new Set(
          progress
            ?.map((p) => p.modules?.sections?.course_id)
            .filter(Boolean) || [],
        ),
      ];

      let total = 0;
      if (courseIds.length > 0) {
        const { count, error: countError } = await supabase
          .from("modules")
          .select("id, sections!inner(course_id)", {
            count: "exact",
            head: true,
          })
          .in("sections.course_id", courseIds);

        if (!countError) {
          total = count || 0;
        }
      }

      setProgressData(progress || []);
      setTotalModules(total);
    } catch (err) {
      console.error("Error fetching progress:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Memoized computed values
  const computed = useMemo(() => {
    const completedModules = progressData.filter(
      (p) => p.completed === true || p.status === "completed",
    );

    const completedCount = completedModules.length;
    const overallPercent =
      totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

    // Find current module (in_progress status)
    const currentProgress = progressData.find(
      (p) => p.status === "in_progress",
    );
    const currentModuleId = currentProgress?.module_id || null;
    const currentModule = currentProgress?.modules || null;

    // Calculate total time spent (in hours)
    const totalTimeSpentSeconds = progressData.reduce(
      (acc, p) => acc + (p.time_spent_seconds || 0),
      0,
    );
    const totalTimeSpentHours =
      Math.round((totalTimeSpentSeconds / 3600) * 10) / 10;

    // Group progress by course
    const progressByCourse = progressData.reduce((acc, p) => {
      const courseId = p.modules?.sections?.course_id;
      if (courseId) {
        if (!acc[courseId]) {
          acc[courseId] = [];
        }
        acc[courseId].push(p);
      }
      return acc;
    }, {});

    return {
      completedCount,
      totalModules,
      overallPercent,
      currentModuleId,
      currentModule,
      totalTimeSpentHours,
      progressByCourse,
      progressList: progressData,
    };
  }, [progressData, totalModules]);

  // Mark module complete via RPC
  const markModuleComplete = useCallback(
    async (moduleId) => {
      try {
        const { data, error } = await supabase.rpc("mark_module_complete", {
          p_user_id: userId,
          p_module_id: moduleId,
          p_unlock_next: true,
        });

        if (error) throw error;

        // Refetch progress after completion
        await fetchProgress();

        return { data, error: null };
      } catch (err) {
        console.error("Error marking module complete:", err);
        return { data: null, error: err };
      }
    },
    [userId, fetchProgress],
  );

  // Unlock next module via RPC
  const unlockNextModule = useCallback(
    async (moduleId) => {
      try {
        const { data, error } = await supabase.rpc("unlock_next_module", {
          p_user_id: userId,
          p_module_id: moduleId,
        });

        if (error) throw error;

        // Refetch progress
        await fetchProgress();

        return { data, error: null };
      } catch (err) {
        console.error("Error unlocking next module:", err);
        return { data: null, error: err };
      }
    },
    [userId, fetchProgress],
  );

  return {
    ...computed,
    loading,
    error,
    refetch: fetchProgress,
    markModuleComplete,
    unlockNextModule,
  };
}

export default useProgress;
