/**
 * Agentvault landing page animation variants
 * Reusable Framer Motion animation presets for consistent motion design
 */

// ═══════════════════════════════════════════
// ENTRANCE ANIMATIONS
// ═══════════════════════════════════════════

export const fadeInUp = {
  initial: { 
    opacity: 0, 
    y: 40 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1] // ease-out
    }
  }
};

export const fadeInDown = {
  initial: { 
    opacity: 0, 
    y: -40 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const fadeInLeft = {
  initial: { 
    opacity: 0, 
    x: -40 
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const fadeInRight = {
  initial: { 
    opacity: 0, 
    x: 40 
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const scaleIn = {
  initial: { 
    opacity: 0, 
    scale: 0.9 
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const rotateIn = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    rotate: -10
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.7,
      ease: [0.34, 1.56, 0.64, 1] // spring
    }
  }
};

// ═══════════════════════════════════════════
// STAGGER CONTAINERS
// ═══════════════════════════════════════════

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerContainerFast = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

export const staggerContainerSlow = {
  animate: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2
    }
  }
};

// ═══════════════════════════════════════════
// HOVER ANIMATIONS
// ═══════════════════════════════════════════

export const hoverScale = {
  rest: { 
    scale: 1 
  },
  hover: { 
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export const hoverLift = {
  rest: { 
    y: 0,
    scale: 1
  },
  hover: { 
    y: -8,
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const hoverGlow = {
  rest: { 
    boxShadow: '0 0 0 rgba(86, 217, 181, 0)'
  },
  hover: { 
    boxShadow: '0 0 40px rgba(86, 217, 181, 0.32)',
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

export const hoverRotate = {
  rest: { 
    rotate: 0 
  },
  hover: { 
    rotate: 360,
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  }
};

// ═══════════════════════════════════════════
// BUTTON ANIMATIONS
// ═══════════════════════════════════════════

export const buttonPrimary = {
  rest: { 
    y: 0,
    boxShadow: '0 4px 16px rgba(86, 217, 181, 0.24)'
  },
  hover: { 
    y: -3,
    boxShadow: '0 8px 32px rgba(86, 217, 181, 0.32)',
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: { 
    y: -1,
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
};

export const buttonSecondary = {
  rest: { 
    borderColor: 'rgba(86, 217, 181, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  hover: { 
    borderColor: 'rgba(86, 217, 181, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    boxShadow: '0 0 20px rgba(86, 217, 181, 0.16)',
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: { 
    scale: 0.97,
    transition: {
      duration: 0.1
    }
  }
};

// ═══════════════════════════════════════════
// CARD ANIMATIONS
// ═══════════════════════════════════════════

export const cardHover = {
  rest: { 
    y: 0,
    scale: 1,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
  },
  hover: { 
    y: -8,
    scale: 1.02,
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 0 60px rgba(86, 217, 181, 0.3)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const cardFloat = {
  animate: {
    y: [-5, 5, -5],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// ═══════════════════════════════════════════
// SCROLL REVEAL ANIMATIONS
// ═══════════════════════════════════════════

export const scrollReveal = {
  hidden: { 
    opacity: 0, 
    y: 50 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const scrollRevealScale = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const scrollRevealLeft = {
  hidden: { 
    opacity: 0, 
    x: -100 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const scrollRevealRight = {
  hidden: { 
    opacity: 0, 
    x: 100 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// ═══════════════════════════════════════════
// TEXT ANIMATIONS
// ═══════════════════════════════════════════

export const textReveal = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export const letterReveal = {
  hidden: { 
    opacity: 0, 
    y: 50 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const gradientShift = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// ═══════════════════════════════════════════
// 3D & PARALLAX EFFECTS
// ═══════════════════════════════════════════

export const parallaxSlow = {
  animate: (mousePos) => ({
    x: mousePos.x * 0.02,
    y: mousePos.y * 0.02,
    transition: {
      type: "spring",
      stiffness: 50,
      damping: 15
    }
  })
};

export const parallaxMedium = {
  animate: (mousePos) => ({
    x: mousePos.x * 0.05,
    y: mousePos.y * 0.05,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  })
};

export const parallaxFast = {
  animate: (mousePos) => ({
    x: mousePos.x * 0.1,
    y: mousePos.y * 0.1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 25
    }
  })
};

export const rotate3D = {
  animate: (mousePos) => ({
    rotateY: mousePos.x * 0.02,
    rotateX: -mousePos.y * 0.02,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  })
};

// ═══════════════════════════════════════════
// LOADING & PROGRESS ANIMATIONS
// ═══════════════════════════════════════════

export const pulseGlow = {
  animate: {
    opacity: [0.6, 1, 0.6],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const spin = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export const orbit = {
  animate: {
    rotate: 360,
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// ═══════════════════════════════════════════
// PAGE TRANSITIONS
// ═══════════════════════════════════════════

export const pageTransition = {
  initial: { 
    opacity: 0, 
    y: 20 
  },
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
      ease: "easeIn"
    }
  }
};

export const modalTransition = {
  initial: { 
    opacity: 0, 
    scale: 0.95 
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  }
};

// ═══════════════════════════════════════════
// PRESET COMBINATIONS
// ═══════════════════════════════════════════

export const heroSection = {
  container: staggerContainer,
  heading: fadeInUp,
  subheading: {
    ...fadeInUp,
    animate: {
      ...fadeInUp.animate,
      transition: {
        ...fadeInUp.animate.transition,
        delay: 0.1
      }
    }
  },
  cta: {
    ...fadeInUp,
    animate: {
      ...fadeInUp.animate,
      transition: {
        ...fadeInUp.animate.transition,
        delay: 0.2
      }
    }
  }
};

export const featureCard = {
  container: cardHover,
  icon: hoverRotate,
  text: textReveal
};

// ═══════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Create stagger delay for child elements
 * @param {number} index - Child index
 * @param {number} delayMultiplier - Delay between children (default: 0.1)
 */
export const staggerDelay = (index, delayMultiplier = 0.1) => ({
  transition: {
    delay: index * delayMultiplier
  }
});

/**
 * Reduce motion for accessibility
 * @param {Object} animation - Animation variant
 */
export const reduceMotion = (animation) => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.1 } }
    };
  }
  return animation;
};

/**
 * Viewport animation trigger options
 */
export const viewportOptions = {
  once: true,
  amount: 0.3,
  margin: "-100px"
};

export const viewportOptionsImmediate = {
  once: true,
  amount: 0.1,
  margin: "0px"
};
