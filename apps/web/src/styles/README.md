# Design Tokens System

This directory contains the design tokens system for the Calm Garden application. Design tokens provide a centralized way to manage design decisions like colors, typography, spacing, and other visual properties.

## Overview

The design tokens system consists of:

- **CSS Custom Properties** (`tokens.css`) - The source of truth for all design values
- **TypeScript Types** (`../lib/tokens.ts`) - Type definitions and utility functions
- **Theme Provider** (`../lib/theme.tsx`) - React context for theme management

## Features

### ✨ Comprehensive Token Categories

- **Colors**: Primary, neutral, semantic color scales
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scale from 2px to 384px
- **Border Radius**: Rounded corner variants
- **Shadows**: Elevation system with multiple shadow levels
- **Z-Index**: Layering system for UI components
- **Transitions**: Consistent animation timing
- **Blur**: Backdrop blur effects

### 🌙 Light/Dark Theme Support

- Automatic system preference detection
- Manual theme switching (light/dark/system)
- Semantic color tokens that adapt to theme
- CSS custom properties for efficient theme switching

### 🎨 Semantic Color System

Colors are organized into semantic categories:

```css
/* Background colors adapt to theme */
--bg-canvas: /* Main background */
--bg-surface: /* Card/panel backgrounds */
--bg-surface-elevated: /* Elevated surfaces */
--bg-primary: /* Primary action backgrounds */

/* Text colors adapt to theme */
--text-primary: /* Main text */
--text-secondary: /* Secondary text */
--text-tertiary: /* Muted text */
```

### 📐 Consistent Spacing Scale

Based on a 4px baseline grid:

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
/* ... up to 384px */
```

## Usage

### In CSS

```css
.my-component {
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

### In React Components

```tsx
import { tokens, styles } from '@/lib/tokens';

function MyComponent() {
  return (
    <div style={{
      backgroundColor: tokens.bg.surface,
      color: tokens.text.primary,
      padding: tokens.space(4),
      borderRadius: tokens.radius.lg,
      boxShadow: tokens.shadow.md
    }}>
      Content
    </div>
  );
}
```

### Using Pre-built Style Objects

```tsx
import { styles } from '@/lib/tokens';

function MyButton() {
  return (
    <button style={styles.button.primary}>
      Click me
    </button>
  );
}
```

### Theme Management

```tsx
import { useTheme, ThemeToggle } from '@/lib/theme';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <ThemeToggle />
    </div>
  );
}
```

## Token Categories

### Colors

#### Brand Colors
- **Primary**: Teal/cyan scale for primary actions and branding
- **Neutral**: Gray scale for text, borders, and backgrounds

#### Semantic Colors
- **Success**: Green scale for success states
- **Warning**: Amber scale for warning states
- **Error**: Red scale for error states
- **Info**: Blue scale for informational states

### Typography

#### Font Families
- **Sans**: System font stack optimized for readability
- **Mono**: Monospace fonts for code and data

#### Font Sizes
- Scales from `xs` (12px) to `6xl` (60px)
- Based on consistent type scale ratios

#### Font Weights
- From `thin` (100) to `black` (900)
- Semantic names for better readability

### Spacing

Based on a 4px baseline grid with t-shirt sizing:
- `0` through `96` for precise control
- Fractional values like `0.5`, `1.5` for fine-tuning

### Border Radius

- `none`: Sharp corners
- `sm` through `3xl`: Increasingly rounded
- `full`: Fully rounded (pills/circles)

### Shadows

Elevation system with 5 levels:
- `sm`: Subtle elevation
- `base`: Standard cards
- `md`: Elevated panels
- `lg`: Modals and overlays
- `xl`: Maximum elevation

### Z-Index

Layering system to prevent z-index conflicts:
- `base`: Normal document flow
- `dropdown`: Dropdown menus
- `modal`: Modal overlays
- `toast`: Notifications
- `tooltip`: Tooltips (highest)

## Best Practices

### 1. Use Semantic Tokens

❌ **Don't use raw color values:**
```css
background: var(--color-neutral-100);
```

✅ **Use semantic tokens:**
```css
background: var(--bg-surface);
```

### 2. Consistent Spacing

❌ **Don't use arbitrary values:**
```css
margin: 13px;
```

✅ **Use token values:**
```css
margin: var(--space-3); /* 12px */
```

### 3. Theme-Aware Colors

❌ **Don't hardcode colors:**
```css
color: #111;
```

✅ **Use theme-aware tokens:**
```css
color: var(--text-primary);
```

### 4. TypeScript Utilities

❌ **Don't concatenate strings:**
```tsx
style={{ padding: "var(--space-" + size + ")" }}
```

✅ **Use utility functions:**
```tsx
style={{ padding: tokens.space(size) }}
```

## Customization

### Adding New Tokens

1. Add CSS custom properties to `tokens.css`
2. Add TypeScript types to `tokens.ts`
3. Add utility functions if needed
4. Update theme variants (light/dark)

### Extending Color Scales

```css
/* Add new semantic colors */
:root {
  --color-brand-500: #your-color;
  --bg-brand: var(--color-brand-500);
}

[data-theme="dark"] {
  --bg-brand: var(--color-brand-400);
}
```

### Custom Spacing Values

```css
/* Add project-specific spacing */
:root {
  --space-header: 4rem;
  --space-sidebar: 16rem;
}
```

## Migration Guide

### From Inline Styles

❌ **Before:**
```tsx
<div style={{
  background: "rgba(255,255,255,.85)",
  padding: "12px",
  borderRadius: "8px"
}}>
```

✅ **After:**
```tsx
<div style={{
  background: tokens.bg.surfaceOverlay,
  padding: tokens.space(3),
  borderRadius: tokens.radius.lg
}}>
```

### From Hardcoded Values

❌ **Before:**
```css
.card {
  background: #f5f5f5;
  border: 1px solid #e5e5e5;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

✅ **After:**
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-base);
}
```

## Development

### Testing Themes

The design tokens demo is available in the app:
1. Open the hamburger menu
2. Click the "Design" tab
3. Use the theme toggle to test light/dark modes

### Token Validation

Use TypeScript to catch token usage errors:
```tsx
// TypeScript will catch invalid token keys
const spacing = tokens.space('invalid'); // ❌ Error
const spacing = tokens.space(4);         // ✅ Valid
```

## Performance

- CSS custom properties enable efficient theme switching
- No JavaScript required for color calculations
- Minimal runtime overhead
- Automatic browser optimization

## Browser Support

- Modern browsers with CSS custom property support
- Graceful fallback values provided
- Progressive enhancement approach

## Contributing

When adding new design tokens:

1. Follow existing naming conventions
2. Add both light and dark theme variants
3. Include TypeScript types
4. Update utility functions
5. Add documentation examples
6. Test with theme switching