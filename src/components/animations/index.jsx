import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ANIMATION_CONFIG } from "@/lib/animations";
import { useCountUp } from "@/hooks/useAnimations";

// #2 - Module Completion Burst Component
export const ParticleBurst = memo(({ isVisible, onComplete }) => {
  const particles = Array.from({ length: 12 }, (_, i) => i);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-indigo-500 rounded-full"
              initial={{
                x: "50%",
                y: "50%",
                scale: 0,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: `${50 + (Math.random() - 0.5) * 200}%`,
                y: `${50 + (Math.random() - 0.5) * 200}%`,
                scale: [0, 1.5, 0],
                opacity: [1, 0.7, 0],
                rotate: Math.random() * 360,
              }}
              exit={{
                scale: 0,
                opacity: 0,
              }}
              transition={{
                duration: ANIMATION_CONFIG.durations.celebratory,
                ease: "easeOut",
              }}
              style={{
                left: "50%",
                top: "50%",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
});

ParticleBurst.displayName = "ParticleBurst";

// #2 - Checkmark with spring animation
export const CompletionCheckmark = memo(({ isVisible, className = "" }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className={`text-green-500 ${className}`}
        initial={{ scale: 0 }}
        animate={{
          scale: [0, 1.2, 1.0],
          transition: ANIMATION_CONFIG.easings.springBouncy,
        }}
        exit={{ scale: 0 }}
      >
        ✓
      </motion.div>
    )}
  </AnimatePresence>
));

CompletionCheckmark.displayName = "CompletionCheckmark";

// #2 - Sidebar fill animation
export const SidebarFillAnimation = memo(
  ({ isActive, children, className = "" }) => (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-lg"
        initial={{ width: "0%" }}
        animate={{
          width: isActive ? "100%" : "0%",
          transition: {
            duration: ANIMATION_CONFIG.durations.standard,
            ease: "easeOut",
          },
        }}
        style={{ originX: 0 }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  ),
);

SidebarFillAnimation.displayName = "SidebarFillAnimation";

// #3 - Quiz Pass Confetti
export const QuizPassConfetti = () => {
  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#4F46E5", "#7C3AED", "#EC4899", "#F59E0B"],
    });
  };

  return { triggerConfetti };
};

// #3 - Score Counter with useCountUp
export const ScoreCounter = memo(
  ({ target, duration = 0.8, prefix = "", suffix = "" }) => {
    const { current } = useCountUp(target, duration);

    return (
      <motion.span
        key={target} // Re-trigger animation on target change
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {prefix}
        {current}
        {suffix}
      </motion.span>
    );
  },
);

ScoreCounter.displayName = "ScoreCounter";

// #4 - Progress Bar Fill Animation
export const ProgressBarFill = memo(
  ({ value, maxValue = 100, showPercentage = true, className = "" }) => {
    const percentage = Math.round((value / maxValue) * 100);
    const { current: animatedPercentage } = useCountUp(
      percentage,
      ANIMATION_CONFIG.durations.standard,
    );

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Progress</span>
          {showPercentage && (
            <span className="text-sm text-muted-foreground">
              {animatedPercentage}%
            </span>
          )}
        </div>
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{
              width: `${percentage}%`,
              transition: {
                duration: ANIMATION_CONFIG.durations.standard,
                ease: "easeOut",
              },
            }}
            style={{ originX: 0 }}
          />
        </div>
      </div>
    );
  },
);

ProgressBarFill.displayName = "ProgressBarFill";

// #5 - Streak Bounce Animation
export const StreakBounce = memo(({ streak, className = "" }) => {
  const shouldPulse = streak >= 3;

  return (
    <motion.div
      className={`flex items-center gap-1 ${className}`}
      whileInView={{
        scale: [1, 1.1, 1],
        transition: ANIMATION_CONFIG.easings.spring,
      }}
      viewport={{ once: true }}
    >
      <span className={shouldPulse ? "pulse-flame" : ""}>🔥</span>
      <motion.span
        key={streak} // Re-trigger on streak change
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={ANIMATION_CONFIG.easings.spring}
        className="font-semibold"
      >
        {streak}
      </motion.span>
    </motion.div>
  );
});

StreakBounce.displayName = "StreakBounce";

// #7 - Card Hover Lift
export const HoverCard = memo(({ children, className = "", ...props }) => (
  <motion.div
    className={`will-change-transform ${className}`}
    whileHover={{
      y: -4,
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      transition: { type: "tween", duration: 0.2 },
    }}
    {...props}
  >
    {children}
  </motion.div>
));

HoverCard.displayName = "HoverCard";

// #9 - Time Ring Pulse
export const TimeRingPulse = memo(
  ({ percentage, targetMet = false, size = 120 }) => {
    const radius = size / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className={`relative ${targetMet ? "animate-pulse" : ""}`}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />

          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={targetMet ? "text-yellow-500" : "text-primary"}
            style={{
              strokeDasharray: circumference,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: offset,
              transition: {
                duration: ANIMATION_CONFIG.durations.standard,
                ease: "easeOut",
              },
            }}
          />
        </svg>

        {targetMet && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ boxShadow: "0 0 0 0 rgba(251, 191, 36, 0.7)" }}
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(251, 191, 36, 0.7)",
                "0 0 0 20px rgba(251, 191, 36, 0)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    );
  },
);

TimeRingPulse.displayName = "TimeRingPulse";

// #11 - Skeleton Fade
export const SkeletonFade = memo(({ children, isLoading, skeleton }) => (
  <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div
        key="skeleton"
        initial={{ opacity: 1 }}
        exit={{
          opacity: 0,
          transition: { duration: 0.3 },
        }}
      >
        {skeleton}
      </motion.div>
    ) : (
      <motion.div
        key="content"
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { duration: 0.3 },
        }}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
));

SkeletonFade.displayName = "SkeletonFade";

// #13 - Quiz Shake Animation
export const QuizShake = memo(({ children, isShaking, onShakeComplete }) => (
  <motion.div
    animate={isShaking ? "shake" : "idle"}
    variants={{
      idle: { x: 0 },
      shake: {
        x: [0, 10, -10, 10, -10, 0],
        transition: { duration: 0.4 },
      },
    }}
    onAnimationComplete={onShakeComplete}
  >
    {children}
  </motion.div>
));

QuizShake.displayName = "QuizShake";

// #18 - Achievement Modal
export const AchievementModal = memo(({ isVisible, badge, onClose }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 0.7,
            transition: { duration: 0.3 },
          }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              duration: 0.4,
              ease: "easeOut",
            },
          }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
        >
          {/* Badge with rotation */}
          <motion.div
            className="text-8xl mb-4"
            initial={{ rotateY: 0 }}
            animate={{
              rotateY: 360,
              transition: {
                duration: 1.2,
                ease: "easeInOut",
              },
            }}
          >
            {badge?.icon_emoji}
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">{badge?.label}</h2>
          <p className="text-muted-foreground mb-6">{badge?.description}</p>

          <motion.button
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
          >
            Awesome!
          </motion.button>

          {/* Particle burst after rotation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { delay: 1.2 },
            }}
          >
            <ParticleBurst isVisible={true} />
          </motion.div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
));

AchievementModal.displayName = "AchievementModal";
