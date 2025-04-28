import React from 'react';
import 'react-native-gesture-handler';
import AppNavigator from './app/navigation/AppNavigator';
import { UserProvider } from './app/contexts/UserContext';

export default function App() {
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
}
