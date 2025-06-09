import React from 'react';
import { PaperProvider } from 'react-native-paper';
import HaitianTheme from './src/theme/HaitianTheme';
import './src/services/i18n'; // Initialize i18n
import './src/services/firebase'; // Initialize Firebase
import LoginScreen from './src/screens/LoginScreen';
// Import navigation setup here when ready

export default function App() {
  return (
    <PaperProvider theme={HaitianTheme}>
      <LoginScreen />
    </PaperProvider>
  );
}