import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Timeline component - 36 slots representing monthly learning milestones
 * Responsive: horizontal on desktop, vertical cards on mobile
 * @param {Array} progressList - Array of progress objects (alternative to modules)
 * @param {Array} modules - Array of module objects with progress status
 * @param {string} currentModuleId - The currently active module ID
 * @param {number} totalSlots - Total number of slots to display (default: 36)
 * @param {boolean} readOnly - If true, slots are not clickable (default: false)
 */
export function Timeline({
  modules = [],
  progressList = [],
  currentModuleId,
  totalSlots = 36,
  className,
  readOnly = false,
}) {
  const navigate = useNavigate();

  // Use progressList if provided, otherwise use modules
  const moduleData = progressList.length > 0 ? progressList : modules;

  // Build slots array - fill with actual modules or empty slots
  const slots = Array.from({ length: totalSlots }, (_, index) => {
    const module = moduleData[index] || null;
    return {
      index: index + 1,
      module,
      status: module?.status || "locked",
      completed: module?.completed || false,
      id: module?.id || module?.module_id || null,
      title: module?.title || module?.module_title || `Month ${index + 1}`,
    };
  });

  const getSlotStatus = (slot) => {
    if (slot.completed || slot.status === "completed") return "completed";
    if (slot.id === currentModuleId || slot.status === "in_progress")
      return "current";
    return "locked";
  };

  const handleSlotClick = (slot) => {
    if (readOnly) return; // Don't navigate if read-only
    const status = getSlotStatus(slot);
    if ((status === "completed" || status === "current") && slot.id) {
      navigate(`/module/${slot.id}`);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Timeline header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          36-Month Learning Journey
        </h3>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500/30 ring-2 ring-indigo-500 ring-offset-2" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>Locked</span>
          </div>
        </div>
      </div>

      {/* Desktop: Horizontal scrollable timeline */}
      <div className="hidden sm:block relative overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex items-center gap-2 min-w-max">
          {slots.map((slot, index) => {
            const status = getSlotStatus(slot);
            const isClickable = status === "completed" || status === "current";

            return (
              <motion.div
                key={slot.index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02, duration: 0.3 }}
                className="relative group"
              >
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute right-full top-1/2 -translate-y-1/2 w-2 h-0.5",
                      status === "completed" || slots[index - 1]?.completed
                        ? "bg-indigo-500"
                        : "bg-slate-300 dark:bg-slate-600",
                    )}
                  />
                )}

                {/* Slot circle */}
                <button
                  onClick={() => handleSlotClick(slot)}
                  disabled={!isClickable || readOnly}
                  className={cn(
                    "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                    !readOnly &&
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                    {
                      // Completed state
                      "bg-indigo-500 text-white cursor-pointer":
                        status === "completed" && !readOnly,
                      "bg-indigo-500 text-white":
                        status === "completed" && readOnly,
                      "hover:bg-indigo-600":
                        status === "completed" && !readOnly,
                      // Current state with pulsing ring
                      "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500 cursor-pointer":
                        status === "current" && !readOnly,
                      "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500":
                        status === "current" && readOnly,
                      // Locked state
                      "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed":
                        status === "locked",
                    },
                  )}
                >
                  {status === "completed" ? (
                    <Check className="w-4 h-4" />
                  ) : status === "locked" ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <span className="text-xs font-semibold">{slot.index}</span>
                  )}

                  {/* Pulsing animation for current */}
                  {status === "current" && (
                    <span className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
                  )}
                </button>

                {/* Tooltip on hover */}
                <div
                  className={cn(
                    "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap",
                    "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
                    "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10",
                  )}
                >
                  {slot.title}
                  <div
                    className={cn(
                      "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent",
                      "border-t-slate-900 dark:border-t-white",
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Scroll hint gradient */}
        <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* Mobile: Vertical card layout */}
      <div className="sm:hidden">
        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
          {slots.map((slot, index) => {
            const status = getSlotStatus(slot);
            const isClickable = status === "completed" || status === "current";

            return (
              <motion.button
                key={slot.index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.01, duration: 0.3 }}
                onClick={() => handleSlotClick(slot)}
                disabled={!isClickable || readOnly}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                  {
                    // Completed state
                    "bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100 cursor-pointer":
                      status === "completed" && !readOnly,
                    "bg-indigo-50 border-2 border-indigo-200":
                      status === "completed" && readOnly,
                    // Current state
                    "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-2 border-indigo-300 cursor-pointer":
                      status === "current" && !readOnly,
                    "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-2 border-indigo-300":
                      status === "current" && readOnly,
                    // Locked state
                    "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed":
                      status === "locked",
                  },
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      {
                        "bg-indigo-500 text-white": status === "completed",
                        "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500":
                          status === "current",
                        "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500":
                          status === "locked",
                      },
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="w-4 h-4" />
                    ) : status === "locked" ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <span className="text-xs font-semibold">
                        {slot.index}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        status === "locked"
                          ? "text-slate-400"
                          : "text-slate-900 dark:text-slate-100",
                      )}
                    >
                      {slot.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {status === "completed" && "✓ Completed"}
                      {status === "current" && "📍 Current"}
                      {status === "locked" && "🔒 Locked"}
                    </p>
                  </div>
                </div>

                {/* Pulsing indicator for current */}
                {status === "current" && (
                  <div className="absolute inset-0 rounded-lg bg-indigo-500/10 animate-pulse pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Progress indicator below timeline */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {modules.filter((m) => m?.completed).length} of {totalSlots} modules
          completed
        </span>
        <span className="font-medium text-indigo-600 dark:text-indigo-400">
          {Math.round(
            (modules.filter((m) => m?.completed).length / totalSlots) * 100,
          )}
          %
        </span>
      </div>
    </div>
  );
}

export default Timeline;
