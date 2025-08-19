// Common animation variants that can be reused across components

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
  transition: { duration: 0.25 }
};

export const slideInRight = {
  initial: { opacity: 0, x: 15 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -15 },
  transition: { duration: 0.2 }
};

export const slideInLeft = {
  initial: { opacity: 0, x: -15 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 15 },
  transition: { duration: 0.2 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2 }
};

export const scaleInUp = {
  initial: { opacity: 0, scale: 0.98, y: 15 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -15 },
  transition: { duration: 0.25 }
};

export const hoverLift = {
  whileHover: { y: -1 },
  transition: { duration: 0.15 }
};

export const hoverScale = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15 }
};

export const hoverScaleSmall = {
  whileHover: { scale: 1.01 },
  transition: { duration: 0.15 }
};

export const buttonHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.15 }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.03
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
  transition: { duration: 0.2 }
};
