// Nowoczesna paleta kolorów dla aplikacji
export const Colors = {
  // Light Mode
  light: {
    primary: '#6366f1', // Indigo - bardziej żywy niż niebieski
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',
    secondary: '#ec4899', // Pink
    accent: '#10b981', // Green
    danger: '#ef4444', // Red
    warning: '#f59e0b', // Amber
    
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    card: '#ffffff',
    
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Dark Mode
  dark: {
    primary: '#818cf8', // Jasniejszy indigo dla dark mode
    primaryDark: '#6366f1',
    primaryLight: '#a5b4fc',
    secondary: '#f472b6', // Jasniejszy pink
    accent: '#34d399', // Jasniejszy green
    danger: '#f87171', // Jasniejszy red
    warning: '#fbbf24', // Jasniejszy amber
    
    background: '#0a0e27', // Bardziej nasycony ciemny
    surface: '#0f172a',
    surfaceElevated: '#1e293b',
    card: '#1e293b',
    
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    
    border: '#334155',
    borderLight: '#1e293b',
    
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
};

export const getThemeColors = (darkMode: boolean) => darkMode ? Colors.dark : Colors.light;

// Animacje
export const Animations = {
  fadeIn: {
    opacity: 1,
    duration: 200,
  },
  slideUp: {
    translateY: 0,
    opacity: 1,
    duration: 300,
  },
  scale: {
    scale: 1,
    duration: 200,
  },
};
