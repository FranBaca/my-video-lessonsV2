// Main export file for all animations
// Import and re-export all animation variants

// Common animations
export * from './common';

// Dashboard-specific animations
export * from './dashboard';

// Modal animations
export * from './modals';

// Re-export commonly used animations with shorter names
export { fadeIn as fade } from './common';
export { slideInRight as slideIn } from './common';
export { scaleIn as scale } from './common';
export { hoverLift as lift } from './common';
export { buttonHover as button } from './common';
