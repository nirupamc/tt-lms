// Animation constants following the established design language
export const ANIMATION_CONFIG = {
  // Easings
  easings: {
    spring: { type: "spring", stiffness: 300, damping: 30 },
    springBouncy: { type: "spring", stiffness: 400, damping: 20 },
    easeOut: { type: "tween", ease: "easeOut" },
    easeInOut: { type: "tween", ease: "easeInOut" },
  },

  // Durations
  durations: {
    micro: 0.2,      // hover/press
    standard: 0.4,   // state changes
    celebratory: 1.2, // completions/badges
    fast: 0.15,
    slow: 0.6
  },

  // Stagger
  stagger: {
    fast: 0.04,
    standard: 0.05,
    slow: 0.06
  },

  // Common animation variants
  pageVariants: {
    initial: { opacity: 0, x: 20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      x: -20,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  },

  slideUpVariants: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  },

  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: -8 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  }
};

// Reduced motion support
export const useReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Performance-optimized motion values
export const createPerformantVariants = (reducedMotion = false) => {
  if (reducedMotion) {
    return {
      initial: {},
      animate: {},
      exit: {},
      transition: { duration: 0.001 }
    };
  }
  return ANIMATION_CONFIG;
};