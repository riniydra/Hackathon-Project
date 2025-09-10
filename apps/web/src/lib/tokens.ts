// Design Token Types and Utilities

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

export type SemanticColors = {
  canvas: string;
  surface: string;
  'surface-elevated': string;
  'surface-overlay': string;
  'surface-overlay-blur': string;
  primary: string;
  'primary-hover': string;
  'primary-active': string;
  secondary: string;
  'secondary-hover': string;
  accent: string;
  game: string;
};

export type TextColors = {
  primary: string;
  secondary: string;
  tertiary: string;
  inverse: string;
  'on-primary': string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

export type BorderColors = {
  primary: string;
  secondary: string;
  focus: string;
  error: string;
  subtle: string;
};

export type FontSizes = {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
};

export type FontWeights = {
  thin: number;
  extralight: number;
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold: number;
  black: number;
};

export type LineHeights = {
  none: number;
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
};

export type Spacing = {
  0: string;
  px: string;
  '0.5': string;
  1: string;
  '1.5': string;
  2: string;
  '2.5': string;
  3: string;
  '3.5': string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
};

export type BorderRadius = {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
};

export type Shadows = {
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
};

export type ZIndex = {
  hide: number;
  auto: string;
  base: number;
  docked: number;
  dropdown: number;
  sticky: number;
  banner: number;
  overlay: number;
  modal: number;
  popover: number;
  skiplink: number;
  toast: number;
  tooltip: number;
};

export type Transitions = {
  fast: string;
  base: string;
  slow: string;
  slower: string;
};

export type DesignTokens = {
  colors: {
    primary: ColorScale;
    neutral: ColorScale;
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    info: ColorScale;
  };
  semantic: {
    bg: SemanticColors;
    text: TextColors;
    border: BorderColors;
  };
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: FontSizes;
    fontWeight: FontWeights;
    lineHeight: LineHeights;
  };
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
  zIndex: ZIndex;
  transitions: Transitions;
  blur: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
};

// Utility function to get CSS variable value
export function getCSSVar(variable: string): string {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(variable);
  }
  return '';
}

// Utility function to set CSS variable
export function setCSSVar(variable: string, value: string): void {
  if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty(variable, value);
  }
}

// Token access utilities
export const tokens = {
  // Colors
  color: {
    primary: (shade: keyof ColorScale) => `var(--color-primary-${shade})`,
    neutral: (shade: keyof ColorScale) => `var(--color-neutral-${shade})`,
    success: (shade: keyof ColorScale) => `var(--color-success-${shade})`,
    warning: (shade: keyof ColorScale) => `var(--color-warning-${shade})`,
    error: (shade: keyof ColorScale) => `var(--color-error-${shade})`,
    info: (shade: keyof ColorScale) => `var(--color-info-${shade})`,
  },

  // Semantic tokens
  bg: {
    canvas: 'var(--bg-canvas)',
    surface: 'var(--bg-surface)',
    surfaceElevated: 'var(--bg-surface-elevated)',
    surfaceOverlay: 'var(--bg-surface-overlay)',
    surfaceOverlayBlur: 'var(--bg-surface-overlay-blur)',
    primary: 'var(--bg-primary)',
    primaryHover: 'var(--bg-primary-hover)',
    primaryActive: 'var(--bg-primary-active)',
    secondary: 'var(--bg-secondary)',
    secondaryHover: 'var(--bg-secondary-hover)',
    accent: 'var(--bg-accent)',
    game: 'var(--bg-game)',
  },

  text: {
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    tertiary: 'var(--text-tertiary)',
    inverse: 'var(--text-inverse)',
    onPrimary: 'var(--text-on-primary)',
    success: 'var(--text-success)',
    warning: 'var(--text-warning)',
    error: 'var(--text-error)',
    info: 'var(--text-info)',
  },

  border: {
    primary: 'var(--border-primary)',
    secondary: 'var(--border-secondary)',
    focus: 'var(--border-focus)',
    error: 'var(--border-error)',
    subtle: 'var(--border-subtle)',
  },

  // Typography
  font: {
    family: {
      sans: 'var(--font-family-sans)',
      mono: 'var(--font-family-mono)',
    },
    size: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      lg: 'var(--font-size-lg)',
      xl: 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
      '4xl': 'var(--font-size-4xl)',
      '5xl': 'var(--font-size-5xl)',
      '6xl': 'var(--font-size-6xl)',
    },
    weight: {
      thin: 'var(--font-weight-thin)',
      extralight: 'var(--font-weight-extralight)',
      light: 'var(--font-weight-light)',
      normal: 'var(--font-weight-normal)',
      medium: 'var(--font-weight-medium)',
      semibold: 'var(--font-weight-semibold)',
      bold: 'var(--font-weight-bold)',
      extrabold: 'var(--font-weight-extrabold)',
      black: 'var(--font-weight-black)',
    },
    lineHeight: {
      none: 'var(--line-height-none)',
      tight: 'var(--line-height-tight)',
      snug: 'var(--line-height-snug)',
      normal: 'var(--line-height-normal)',
      relaxed: 'var(--line-height-relaxed)',
      loose: 'var(--line-height-loose)',
    },
  },

  // Spacing
  space: (size: keyof Spacing) => `var(--space-${size})`,

  // Border radius
  radius: {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    base: 'var(--radius-base)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    '3xl': 'var(--radius-3xl)',
    full: 'var(--radius-full)',
  },

  // Shadows
  shadow: {
    sm: 'var(--shadow-sm)',
    base: 'var(--shadow-base)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },

  // Z-index
  z: {
    hide: 'var(--z-hide)',
    auto: 'var(--z-auto)',
    base: 'var(--z-base)',
    docked: 'var(--z-docked)',
    dropdown: 'var(--z-dropdown)',
    sticky: 'var(--z-sticky)',
    banner: 'var(--z-banner)',
    overlay: 'var(--z-overlay)',
    modal: 'var(--z-modal)',
    popover: 'var(--z-popover)',
    skiplink: 'var(--z-skiplink)',
    toast: 'var(--z-toast)',
    tooltip: 'var(--z-tooltip)',
  },

  // Transitions
  transition: {
    fast: 'var(--transition-fast)',
    base: 'var(--transition-base)',
    slow: 'var(--transition-slow)',
    slower: 'var(--transition-slower)',
  },

  // Blur
  blur: {
    none: 'var(--blur-none)',
    sm: 'var(--blur-sm)',
    base: 'var(--blur-base)',
    md: 'var(--blur-md)',
    lg: 'var(--blur-lg)',
    xl: 'var(--blur-xl)',
    '2xl': 'var(--blur-2xl)',
    '3xl': 'var(--blur-3xl)',
  },
} as const;

// Style object builders for common patterns
export const styles = {
  // Button variants
  button: {
    primary: {
      backgroundColor: tokens.bg.primary,
      color: tokens.text.onPrimary,
      border: `1px solid ${tokens.bg.primary}`,
      borderRadius: tokens.radius.lg,
      padding: `${tokens.space(3)} ${tokens.space(6)}`,
      fontSize: tokens.font.size.sm,
      fontWeight: tokens.font.weight.medium,
      cursor: 'pointer',
      transition: tokens.transition.fast,
      boxShadow: tokens.shadow.sm,
    },
    secondary: {
      backgroundColor: tokens.bg.secondary,
      color: tokens.text.primary,
      border: `1px solid ${tokens.border.primary}`,
      borderRadius: tokens.radius.lg,
      padding: `${tokens.space(3)} ${tokens.space(6)}`,
      fontSize: tokens.font.size.sm,
      fontWeight: tokens.font.weight.medium,
      cursor: 'pointer',
      transition: tokens.transition.fast,
      boxShadow: tokens.shadow.sm,
    },
  },

  // Card styles
  card: {
    base: {
      backgroundColor: tokens.bg.surface,
      border: `1px solid ${tokens.border.primary}`,
      borderRadius: tokens.radius.xl,
      padding: tokens.space(6),
      boxShadow: tokens.shadow.base,
    },
    elevated: {
      backgroundColor: tokens.bg.surfaceElevated,
      border: `1px solid ${tokens.border.primary}`,
      borderRadius: tokens.radius.xl,
      padding: tokens.space(6),
      boxShadow: tokens.shadow.lg,
    },
  },

  // Input styles
  input: {
    base: {
      backgroundColor: tokens.bg.surface,
      color: tokens.text.primary,
      border: `1px solid ${tokens.border.primary}`,
      borderRadius: tokens.radius.lg,
      padding: `${tokens.space(3)} ${tokens.space(4)}`,
      fontSize: tokens.font.size.sm,
      transition: tokens.transition.fast,
    },
  },

  // Overlay styles
  overlay: {
    backdrop: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: `blur(${tokens.blur.sm})`,
      zIndex: tokens.z.overlay,
    },
    panel: {
      backgroundColor: tokens.bg.surfaceOverlayBlur,
      backdropFilter: `blur(${tokens.blur.md})`,
      border: `1px solid ${tokens.border.subtle}`,
      borderRadius: tokens.radius.xl,
      boxShadow: tokens.shadow.xl,
    },
  },
} as const;