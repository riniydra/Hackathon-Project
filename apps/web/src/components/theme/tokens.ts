// Theme tokens for consistent styling across components
export const colors = {
  // Risk levels
  riskHigh: '#dc2626',
  riskWarn: '#ea580c', 
  riskLow: '#16a34a',
  riskDefault: '#6b7280',
  
  // UI colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  background: '#ffffff',
  backgroundMuted: '#f9fafb',
  backgroundError: '#fef2f2',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textError: '#dc2626',
  
  // Interactive elements
  buttonBorder: '#d1d5db',
  buttonBackground: '#f9fafb',
  buttonHover: '#f3f4f6',
  
  // Tab colors
  tabActive: '#eff6ff',
  tabActiveBorder: '#93c5fd',
  tabInactive: '#ffffff',
  tabInactiveBorder: '#e5e7eb',
  
  // Overlay
  overlayBackground: 'rgba(255,255,255,0.96)',
  overlayBackdrop: 'rgba(0,0,0,0.1)',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
} as const;

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '-8px 0 24px rgba(0,0,0,0.1)',
} as const;

export const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
} as const;