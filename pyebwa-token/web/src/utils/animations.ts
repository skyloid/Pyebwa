import { keyframes } from '@emotion/react';

// Fade animations
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const fadeInDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Scale animations
export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

// Slide animations
export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

// Tree growth animation
export const treeGrow = keyframes`
  0% {
    transform: scaleY(0);
    transform-origin: bottom;
  }
  50% {
    transform: scaleY(1.1);
    transform-origin: bottom;
  }
  100% {
    transform: scaleY(1);
    transform-origin: bottom;
  }
`;

// Shimmer effect for loading
export const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

// Bounce animation
export const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  60% {
    transform: translateY(-15px);
  }
`;

// Rotate animation
export const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Progress fill animation
export const progressFill = keyframes`
  from {
    width: 0%;
  }
  to {
    width: var(--progress, 100%);
  }
`;

// Animation timing functions
export const timings = {
  fast: '200ms',
  normal: '300ms',
  slow: '500ms',
  verySlow: '800ms',
};

export const easings = {
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// Animation variants for framer-motion
export const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  },
  
  slideInLeft: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
  },
  
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
};

// Transition presets
export const transitions = {
  fast: {
    duration: 0.2,
    ease: easings.easeOut,
  },
  
  normal: {
    duration: 0.3,
    ease: easings.easeOut,
  },
  
  slow: {
    duration: 0.5,
    ease: easings.easeOut,
  },
  
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  
  bounce: {
    type: 'spring',
    stiffness: 400,
    damping: 10,
  },
};

// Hover effects
export const hoverEffects = {
  lift: {
    y: -4,
    transition: transitions.fast,
  },
  
  scale: {
    scale: 1.05,
    transition: transitions.fast,
  },
  
  brightness: {
    filter: 'brightness(1.1)',
    transition: transitions.fast,
  },
  
  shadow: {
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    transition: transitions.fast,
  },
};

// Page transition wrapper
export const pageTransition = {
  initial: 'initial',
  animate: 'animate',
  exit: 'exit',
  variants: animationVariants.fadeIn,
  transition: transitions.normal,
};

// Stagger children animation
export const staggerContainer = {
  initial: 'initial',
  animate: 'animate',
  variants: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  },
};

export const staggerItem = {
  variants: animationVariants.fadeInUp,
  transition: transitions.normal,
};

// Utility function to create custom animations
export const createAnimation = (
  from: Record<string, any>,
  to: Record<string, any>,
  options: {
    duration?: number;
    ease?: string;
    delay?: number;
  } = {}
) => {
  return {
    initial: from,
    animate: to,
    transition: {
      duration: options.duration || 0.3,
      ease: options.ease || easings.easeOut,
      delay: options.delay || 0,
    },
  };
};

// Scroll-triggered animations
export const scrollAnimation = (threshold = 0.1) => ({
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: threshold },
  transition: transitions.normal,
});

// Loading skeleton animation
export const skeletonAnimation = {
  background: `linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.5) 60%,
    rgba(255, 255, 255, 0)
  )`,
  animation: `${shimmer} 2s infinite`,
  backgroundSize: '1000px 100%',
};