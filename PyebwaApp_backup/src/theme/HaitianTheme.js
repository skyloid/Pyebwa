import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const HaitianTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#D41125',        // Haitian Flag Red
    primaryContainer: '#FFCDD2',
    secondary: '#00217D',      // Haitian Flag Blue
    secondaryContainer: '#C5CAE9',
    tertiary: '#FFC72C',       // Vibrant Yellow for highlights
    tertiaryContainer: '#FFF3CD',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    error: '#B00020',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    onError: '#FFFFFF',
    elevation: {
      level0: 'transparent',
      level1: '#F5F5F5',
      level2: '#EEEEEE',
      level3: '#E0E0E0',
      level4: '#BDBDBD',
      level5: '#9E9E9E',
    },
  },
  roundness: 8,
  fonts: {
    ...DefaultTheme.fonts,
  },
};

export default HaitianTheme;