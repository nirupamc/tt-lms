import React, { memo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRipple } from "@/hooks/useAnimations";
import { ANIMATION_CONFIG } from "@/lib/animations";

// #6 - Button Ripple Effect
export const RippleButton = memo(
  ({ children, onClick, className = "", ...props }) => {
    const { addRipple, ripples } = useRipple();

    const handleClick = useCallback(
      (e) => {
        addRipple(e);
        onClick?.(e);
      },
      [addRipple, onClick],
    );

    return (
      <motion.button
        className={`ripple-effect relative overflow-hidden ${className}`}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: ANIMATION_CONFIG.durations.micro }}
        {...props}
      >
        {children}

        {/* Ripple effects */}
        {ripples.map(({ key, x, y, size }) => (
          <span
            key={key}
            className="ripple"
            style={{
              left: x,
              top: y,
              width: size,
              height: size,
            }}
          />
        ))}
      </motion.button>
    );
  },
);

RippleButton.displayName = "RippleButton";

// #8 - Badge Toast (for use with Sonner)
export const BadgeToast = memo(({ badge }) => (
  <div className="flex items-center gap-3 p-2">
    <div className="relative">
      <span className="text-2xl">{badge.icon_emoji}</span>
      <div className="shimmer absolute inset-0 rounded-full" />
    </div>
    <div>
      <p className="font-semibold text-sm">{badge.label}</p>
      <p className="text-xs text-muted-foreground">Badge earned!</p>
    </div>
  </div>
));

BadgeToast.displayName = "BadgeToast";

// #10 - Sidebar Accordion
export const SidebarAccordion = memo(
  ({ children, isExpanded, className = "" }) => {
    return (
      <motion.div
        className={className}
        variants={ANIMATION_CONFIG.staggerContainer}
        initial="initial"
        animate={isExpanded ? "animate" : "initial"}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              variants={{
                initial: { opacity: 0, height: 0 },
                animate: {
                  opacity: 1,
                  height: "auto",
                  transition: {
                    height: {
                      duration: ANIMATION_CONFIG.durations.standard,
                      ease: "easeOut",
                    },
                    opacity: {
                      duration: ANIMATION_CONFIG.durations.fast,
                      delay: 0.1,
                    },
                  },
                },
                exit: {
                  opacity: 0,
                  height: 0,
                  transition: {
                    opacity: { duration: ANIMATION_CONFIG.durations.fast },
                    height: {
                      duration: ANIMATION_CONFIG.durations.standard,
                      delay: 0.1,
                      ease: "easeOut",
                    },
                  },
                },
              }}
              className="overflow-hidden"
            >
              <motion.div
                variants={{
                  animate: {
                    transition: {
                      staggerChildren: ANIMATION_CONFIG.stagger.standard,
                    },
                  },
                }}
              >
                {React.Children.map(children, (child, index) => (
                  <motion.div
                    key={index}
                    variants={ANIMATION_CONFIG.staggerItem}
                    className="will-change-transform"
                  >
                    {child}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

SidebarAccordion.displayName = "SidebarAccordion";

// #12 - Code Success Flash
export const CodeSuccessFlash = memo(
  ({ children, isSuccess, onSuccessComplete }) => {
    return (
      <motion.div
        className="relative border-2 rounded-lg transition-colors duration-200"
        animate={{
          borderColor: isSuccess
            ? ["rgb(34 197 94)", "rgb(34 197 94)", "rgb(156 163 175)"]
            : "rgb(156 163 175)",
        }}
        transition={{
          duration: isSuccess ? 1.5 : 0.2,
          times: isSuccess ? [0, 0.3, 1] : undefined,
        }}
        onAnimationComplete={onSuccessComplete}
      >
        {children}
      </motion.div>
    );
  },
);

CodeSuccessFlash.displayName = "CodeSuccessFlash";

// #12 - Run Button with Success State
export const RunButton = memo(({ isSuccess, isLoading, onClick, children }) => {
  return (
    <AnimatePresence mode="wait">
      {isSuccess ? (
        <motion.button
          key="success"
          className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={ANIMATION_CONFIG.easings.spring}
          disabled
        >
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pathLength: 1 }}
            />
          </motion.svg>
          Success
        </motion.button>
      ) : (
        <motion.button
          key="run"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          initial={{ scale: 1, opacity: 1 }}
          animate={{
            scale: isLoading ? [1, 1.05, 1] : 1,
            opacity: isLoading ? 0.8 : 1,
          }}
          transition={{
            scale: { repeat: isLoading ? Infinity : 0, duration: 1 },
            opacity: { duration: 0.2 },
          }}
          onClick={onClick}
          disabled={isLoading}
        >
          {isLoading ? "Running..." : children}
        </motion.button>
      )}
    </AnimatePresence>
  );
});

RunButton.displayName = "RunButton";

// #12 - Success Message
export const SuccessMessage = memo(({ isVisible, message, className = "" }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className={`text-green-600 dark:text-green-400 font-medium ${className}`}
        initial={{ y: 20, opacity: 0 }}
        animate={{
          y: 0,
          opacity: 1,
          transition: {
            duration: ANIMATION_CONFIG.durations.standard,
            ease: "easeOut",
          },
        }}
        exit={{ y: -20, opacity: 0 }}
      >
        {message}
      </motion.div>
    )}
  </AnimatePresence>
));

SuccessMessage.displayName = "SuccessMessage";

// #14 - Enroll Button Morph
export const EnrollButton = memo(({ isEnrolled, onClick, className = "" }) => {
  return (
    <motion.button
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isEnrolled
          ? "bg-green-500 text-white"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      } ${className}`}
      onClick={onClick}
      whileHover={{ scale: isEnrolled ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={ANIMATION_CONFIG.easings.spring}
      disabled={isEnrolled}
    >
      <AnimatePresence mode="wait">
        {isEnrolled ? (
          <motion.div
            key="enrolled"
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <motion.path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="30"
                strokeDashoffset="30"
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
            </motion.svg>
            Enrolled
          </motion.div>
        ) : (
          <motion.div
            key="enroll"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
          >
            Enroll Now
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

EnrollButton.displayName = "EnrollButton";

// #15 - Navigation Indicator
export const NavIndicator = memo(({ className = "" }) => (
  <motion.div
    layoutId="activeNav"
    className={`absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full ${className}`}
    transition={{
      type: "spring",
      stiffness: 380,
      damping: 30,
    }}
  />
));

NavIndicator.displayName = "NavIndicator";

// #16 - Chart Draw-on Animation
export const AnimatedBar = memo(
  ({ animationBegin = 0, animationDuration = 600, ...props }) => {
    return (
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          duration: animationDuration / 1000,
          delay: animationBegin / 1000,
          ease: "easeOut",
          originY: 1,
        }}
        style={{ transformOrigin: "bottom" }}
        {...props}
      />
    );
  },
);

AnimatedBar.displayName = "AnimatedBar";

// #17 - Floating Label Input
export const FloatingLabelInput = memo(
  ({ label, id, className = "", ...props }) => (
    <div className={`float-label-container ${className}`}>
      <motion.input
        id={id}
        className="w-full p-3 border border-muted rounded-lg bg-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        placeholder=" " // Required for CSS-only solution
        whileFocus={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        {...props}
      />
      <label htmlFor={id} className="text-muted-foreground">
        {label}
      </label>
    </div>
  ),
);

FloatingLabelInput.displayName = "FloatingLabelInput";
