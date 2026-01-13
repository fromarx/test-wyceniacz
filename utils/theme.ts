// Turbo Professional Design System - Executive Navy Edition

export const Colors = {
  light: {
    // Brand Colors
    primary: '#0F172A',     // Slate 900 - Main Brand / Headers
    accent: '#2563EB',      // Blue 600 - Actions / Links / Highlights
    accentDark: '#1D4ED8',  // Blue 700
    accentLight: '#EFF6FF', // Blue 50 - Background tints

    // Semantic
    success: '#059669',     // Emerald 600
    successBg: '#ECFDF5',   // Emerald 50
    danger: '#DC2626',      // Red 600
    dangerBg: '#FEF2F2',    // Red 50
    warning: '#D97706',     // Amber 600
    warningBg: '#FFFBEB',   // Amber 50
    info: '#2563EB',        // Blue 600

    // Backgrounds
    background: '#F8FAFC',  // Slate 50
    surface: '#FFFFFF',     // White
    surfaceSubtle: '#F1F5F9', // Slate 100

    // Text
    text: '#0F172A',        // Slate 900
    textSecondary: '#475569', // Slate 600
    textMuted: '#94A3B8',   // Slate 400
    textInverted: '#FFFFFF',

    // Borders
    border: '#E2E8F0',      // Slate 200
    borderStrong: '#CBD5E1', // Slate 300
    
    // UI
    shadow: '#64748B',
  },
  dark: {
    // Brand Colors
    primary: '#F8FAFC',     // Slate 50 - Inverted for Dark
    accent: '#3B82F6',      // Blue 500
    accentDark: '#2563EB',  // Blue 600
    accentLight: '#1E293B', // Slate 800 - Background tints

    // Semantic
    success: '#34D399',     // Emerald 400
    successBg: '#064E3B',   // Emerald 900
    danger: '#F87171',      // Red 400
    dangerBg: '#7F1D1D',    // Red 900
    warning: '#FBBF24',     // Amber 400
    warningBg: '#78350F',   // Amber 900
    info: '#60A5FA',        // Blue 400

    // Backgrounds
    background: '#020617',  // Slate 950
    surface: '#0F172A',     // Slate 900
    surfaceSubtle: '#1E293B', // Slate 800

    // Text
    text: '#F8FAFC',        // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B',   // Slate 500
    textInverted: '#0F172A',

    // Borders
    border: '#1E293B',      // Slate 800
    borderStrong: '#334155', // Slate 700
    
    // UI
    shadow: '#000000',
  }
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  h1: { fontSize: 34, fontWeight: '900' as '900', letterSpacing: -1.5 },
  h2: { fontSize: 26, fontWeight: '800' as '800', letterSpacing: -1 },
  h3: { fontSize: 22, fontWeight: '700' as '700' },
  body: { fontSize: 17, fontWeight: '500' as '500', lineHeight: 26 },
  small: { fontSize: 15, fontWeight: '400' as '400' },
  caption: { fontSize: 13, fontWeight: '600' as '600', letterSpacing: 0.5 },
  button: { fontSize: 15, fontWeight: '800' as '800', letterSpacing: 1.2, textTransform: 'uppercase' as 'uppercase' }
};

export const BorderRadius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const Shadows = {
  light: {
    sm: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
      elevation: 10,
    }
  },
  dark: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 3,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 12,
    }
  }
};

export const getThemeColors = (darkMode: boolean) => darkMode ? Colors.dark : Colors.light;
export const getShadows = (darkMode: boolean) => darkMode ? Shadows.dark : Shadows.light;
