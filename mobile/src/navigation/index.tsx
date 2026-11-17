// Root native-stack + bottom tabs (Home, Bookings, Offers, Profile).
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { RootStackParamList, TabParamList } from './types';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import SeatSelectionScreen from '../screens/SeatSelectionScreen';
import PassengerDetailsScreen from '../screens/PassengerDetailsScreen';
import BookingSummaryScreen from '../screens/BookingSummaryScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OffersScreen from '../screens/OffersScreen';
import SupportScreen from '../screens/SupportScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const tabIcons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Bookings: ['ticket', 'ticket-outline'],
  Offers: ['pricetags', 'pricetags-outline'],
  Profile: ['person', 'person-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { minHeight: 60, paddingBottom: 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={tabIcons[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
        tabBarAccessibilityLabel: `${route.name} tab`,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} />
      <Tab.Screen name="Offers" component={OffersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background } };

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={Tabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
        <Stack.Screen name="PassengerDetails" component={PassengerDetailsScreen} />
        <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
