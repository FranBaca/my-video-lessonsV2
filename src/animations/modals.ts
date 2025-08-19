// Modal animations for various modal components

import { scaleIn, fadeIn, slideInRight } from './common';

export const modalAnimations = {
  // Backdrop fade in/out
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { 
      duration: 0.2,
      ease: "easeInOut"
    }
  },

  // Modal content slide in from top with subtle scale
  content: {
    initial: { 
      opacity: 0, 
      y: -15, 
      scale: 0.98
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1
    },
    exit: { 
      opacity: 0, 
      y: -15, 
      scale: 0.98
    },
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },

  // Modal content slide in from right with subtle scale
  contentRight: {
    initial: { 
      opacity: 0, 
      x: 20, 
      scale: 0.98
    },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1
    },
    exit: { 
      opacity: 0, 
      x: 20, 
      scale: 0.98
    },
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },

  // Modal content slide in from bottom with subtle scale
  contentBottom: {
    initial: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1
    },
    exit: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98
    },
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },

  // Quick scale in/out for simple modals
  quickScale: {
    initial: { 
      opacity: 0, 
      scale: 0.98
    },
    animate: { 
      opacity: 1, 
      scale: 1
    },
    exit: { 
      opacity: 0, 
      scale: 0.98
    },
    transition: { 
      duration: 0.15,
      ease: "easeInOut"
    }
  },

  // Form field animations
  formField: {
    initial: { opacity: 0, x: -15 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 15 },
    transition: { duration: 0.2 }
  },

  // Button animations within modals
  button: {
    whileHover: { scale: 1.02, y: -1 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.15 }
  }
};

// Specific modal variants
export const createSubjectModal = {
  backdrop: modalAnimations.backdrop,
  content: modalAnimations.content
};

export const createStudentModal = {
  backdrop: modalAnimations.backdrop,
  content: modalAnimations.quickScale
};

export const editStudentModal = {
  backdrop: modalAnimations.backdrop,
  content: modalAnimations.contentRight
};

export const videoUploadModal = {
  backdrop: modalAnimations.backdrop,
  content: modalAnimations.contentBottom
};
