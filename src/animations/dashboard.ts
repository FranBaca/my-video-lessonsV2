// Dashboard-specific animations for ProfessorDashboard component

import { staggerContainer, staggerItem, slideInRight, scaleInUp, hoverLift } from './common';

export const dashboardAnimations = {
  // Tab content transitions
  tabContent: slideInRight,
  
  // Overview tab - stats cards
  overview: {
    container: {
      initial: { opacity: 0, y: 15 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3 }
    },
    statsCard: {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      whileHover: { y: -2 },
      transition: { duration: 0.2 }
    }
  },
  
  // Subjects tab
  subjects: {
    container: slideInRight,
    grid: {
      ...staggerContainer,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.05
      }
    },
    card: {
      ...staggerItem,
      transition: { duration: 0.2 }
    }
  },
  
  // Videos tab
  videos: {
    container: slideInRight,
    list: {
      ...staggerContainer,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.02
      }
    },
    item: {
      ...staggerItem,
      transition: { duration: 0.15 }
    }
  },
  
  // Students tab
  students: {
    container: slideInRight,
    list: {
      ...staggerContainer,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.02
      }
    },
    item: {
      ...staggerItem,
      transition: { duration: 0.15 }
    }
  },
  
  // Search and action buttons
  buttons: {
    primary: {
      whileHover: { scale: 1.02, y: -1 },
      whileTap: { scale: 0.98 },
      transition: { duration: 0.15 }
    },
    secondary: {
      whileHover: { scale: 1.01 },
      whileTap: { scale: 0.99 },
      transition: { duration: 0.15 }
    }
  },
  
  // Status badges
  badges: {
    whileHover: { scale: 1.02 },
    transition: { duration: 0.15 }
  },
  
  // Action buttons (edit, delete)
  actionButtons: {
    edit: {
      whileHover: { scale: 1.02, x: -1 },
      whileTap: { scale: 0.98 },
      transition: { duration: 0.15 }
    },
    delete: {
      whileHover: { scale: 1.02, x: 1 },
      whileTap: { scale: 0.98 },
      transition: { duration: 0.15 }
    }
  }
};

// Specific animation variants for different parts
export const statsCardVariants = {
  container: dashboardAnimations.overview.container,
  card: dashboardAnimations.overview.statsCard
};

export const tabContentVariants = {
  overview: dashboardAnimations.overview.container,
  subjects: dashboardAnimations.subjects.container,
  videos: dashboardAnimations.videos.container,
  students: dashboardAnimations.students.container
};

export const listVariants = {
  subjects: dashboardAnimations.subjects,
  videos: dashboardAnimations.videos,
  students: dashboardAnimations.students
};
