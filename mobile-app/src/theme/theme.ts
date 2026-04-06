import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const pyebwaColors = {
  primary: '#1B4332',
  primaryContainer: '#D1E4FF',
  secondary: '#2D6A4F',
  secondaryContainer: '#FFCDD2',
  tertiary: '#22C55E',
  tertiaryContainer: '#C8E6C9',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  background: '#F9FAFB',
  error: '#DC2626',
  errorContainer: '#FECACA',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#001B3D',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#590009',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#00251C',
  onSurface: '#1F2937',
  onSurfaceVariant: '#6B7280',
  onBackground: '#1F2937',
  onError: '#FFFFFF',
  onErrorContainer: '#7F1D1D',
  outline: '#E5E7EB',
  outlineVariant: '#D1D5DB',
  inverseSurface: '#374151',
  inverseOnSurface: '#F9FAFB',
  inversePrimary: '#A1C4FF',
  shadow: '#000000',
  scrim: '#000000',
  surfaceDisabled: '#F3F4F6',
  onSurfaceDisabled: '#9CA3AF',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const borderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 24,
};

const typography = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontWeight: '400' as const,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '400' as const,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '400' as const,
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '400' as const,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400' as const,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as const,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400' as const,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...pyebwaColors,
  },
  spacing,
  borderRadius,
  typography,
  // Custom additions
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 6.27,
      elevation: 10,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.2,
      shadowRadius: 10.32,
      elevation: 15,
    },
  },
  animation: {
    scale: 0.95,
    duration: 200,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A1C4FF',
    primaryContainer: '#002C5B',
    secondary: '#F48FB1',
    secondaryContainer: '#8E0012',
    tertiary: '#81C784',
    tertiaryContainer: '#004D3A',
    surface: '#121212',
    surfaceVariant: '#1F2937',
    background: '#0F0F0F',
    error: '#F87171',
    errorContainer: '#7F1D1D',
    onPrimary: '#001B3D',
    onPrimaryContainer: '#D1E4FF',
    onSecondary: '#590009',
    onSecondaryContainer: '#FFCDD2',
    onTertiary: '#00251C',
    onTertiaryContainer: '#C8E6C9',
    onSurface: '#F9FAFB',
    onSurfaceVariant: '#9CA3AF',
    onBackground: '#F9FAFB',
    onError: '#7F1D1D',
    onErrorContainer: '#FECACA',
    outline: '#374151',
    outlineVariant: '#4B5563',
    inverseSurface: '#F9FAFB',
    inverseOnSurface: '#374151',
    inversePrimary: '#1B4332',
  },
  spacing,
  borderRadius,
  typography,
};

export type Theme = typeof theme;