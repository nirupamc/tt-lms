import { useState, useEffect, useRef } from 'react';
import { useMotionValue, useSpring, animate } from 'framer-motion';

// Hook for counting up numbers with animation
export function useCountUp(target, duration = 0.6, start = 0) {
  const [current, setCurrent] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (target === start) return;

    setIsAnimating(true);
    const controls = animate(start, target, {
      duration,
      ease: "easeOut",
      onUpdate: (value) => setCurrent(Math.round(value)),
      onComplete: () => setIsAnimating(false)
    });

    return controls.stop;
  }, [target, duration, start]);

  return { current, isAnimating };
}

// Hook for button ripple effects
export function useRipple() {
  const [ripples, setRipples] = useState([]);
  const nextKey = useRef(0);

  const addRipple = (event) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const newRipple = {
      key: nextKey.current++,
      x,
      y,
      size
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.key !== newRipple.key));
    }, 600);
  };

  return { addRipple, ripples };
}

// Hook for spring-based motion values
export function useSpringValue(initialValue = 0) {
  const motionValue = useMotionValue(initialValue);
  const spring = useSpring(motionValue, {
    stiffness: 300,
    damping: 30
  });

  return { motionValue, spring };
}

// Hook for intersection observer with reduced motion support
export function useInView(threshold = 0.1) {
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!ref.current || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setHasAnimated(true);
        }
      },
      { threshold }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, hasAnimated]);

  return { ref, isInView };
}

// Hook for managing multiple animations performance
export function useAnimationQueue(maxConcurrent = 3) {
  const [activeAnimations, setActiveAnimations] = useState(0);
  const queue = useRef([]);

  const canAnimate = activeAnimations < maxConcurrent;

  const startAnimation = (animationFn) => {
    if (canAnimate) {
      setActiveAnimations(prev => prev + 1);
      return animationFn().finally(() => {
        setActiveAnimations(prev => prev - 1);
      });
    } else {
      // Queue for later
      queue.current.push(animationFn);
    }
  };

  useEffect(() => {
    if (canAnimate && queue.current.length > 0) {
      const nextAnimation = queue.current.shift();
      startAnimation(nextAnimation);
    }
  }, [activeAnimations, canAnimate]);

  return { startAnimation, canAnimate, activeCount: activeAnimations };
}