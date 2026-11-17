import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Bookings: undefined;
  Offers: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  SearchResults: undefined;
  SeatSelection: { rescheduleBookingId?: number } | undefined;
  PassengerDetails: undefined;
  BookingSummary: undefined;
  Checkout: undefined;
  PaymentSuccess: undefined;
  LiveTracking: { bookingId: number };
  Notifications: undefined;
  Support: undefined;
};

export type RootScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;
export type TabScreenProps<K extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, K>,
  NativeStackScreenProps<RootStackParamList>
>;
