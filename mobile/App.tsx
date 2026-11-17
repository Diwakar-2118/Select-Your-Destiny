// Select Your Destiny — "Book Smart. Travel Comfortably."
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { BookingProvider } from './src/context/BookingContext';
import RootNavigator from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BookingProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </BookingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
