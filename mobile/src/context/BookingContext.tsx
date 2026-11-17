// Booking flow state shared across Search → Seats → Passengers → Summary → Checkout → Success.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking, FareBreakdown, PassengerInput, Point, SearchQuery, Seat, Trip } from '../types';
import { today } from '../api/client';

const RECENT_KEY = 'syd_recent_searches';

export interface ContactInfo {
  mobile: string; email: string; emergencyContact?: string; gstNumber?: string; gstCompany?: string;
}

interface BookingState {
  query: SearchQuery;
  setQuery: (q: Partial<SearchQuery>) => void;
  recent: SearchQuery[];
  addRecent: (q: SearchQuery) => void;
  trip: Trip | null;
  setTrip: (t: Trip | null) => void;
  selectedSeats: Seat[];
  setSelectedSeats: (s: Seat[]) => void;
  boarding: Point | null;
  setBoarding: (p: Point | null) => void;
  dropping: Point | null;
  setDropping: (p: Point | null) => void;
  passengers: PassengerInput[];
  setPassengers: (p: PassengerInput[]) => void;
  contact: ContactInfo;
  setContact: (c: ContactInfo) => void;
  couponCode?: string;
  couponDiscount: number;
  setCoupon: (code?: string, discount?: number) => void;
  fare: FareBreakdown | null;
  setFare: (f: FareBreakdown | null) => void;
  booking: Booking | null;
  setBooking: (b: Booking | null) => void;
  resetFlow: () => void;
}

const BookingContext = createContext<BookingState | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [query, setQ] = useState<SearchQuery>({ from: 'Bengaluru', to: 'Chennai', date: today(1), passengers: 1 });
  const [recent, setRecent] = useState<SearchQuery[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [boarding, setBoarding] = useState<Point | null>(null);
  const [dropping, setDropping] = useState<Point | null>(null);
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [contact, setContact] = useState<ContactInfo>({ mobile: '', email: '' });
  const [couponCode, setCouponCode] = useState<string | undefined>();
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [fare, setFare] = useState<FareBreakdown | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((v) => v && setRecent(JSON.parse(v))).catch(() => undefined);
  }, []);

  const setQuery = useCallback((q: Partial<SearchQuery>) => setQ((p) => ({ ...p, ...q })), []);

  const addRecent = useCallback((q: SearchQuery) => {
    setRecent((prev) => {
      const next = [q, ...prev.filter((r) => !(r.from === q.from && r.to === q.to))].slice(0, 5);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const setCoupon = useCallback((code?: string, discount = 0) => { setCouponCode(code); setCouponDiscount(discount); }, []);

  const resetFlow = useCallback(() => {
    setTrip(null); setSelectedSeats([]); setBoarding(null); setDropping(null);
    setPassengers([]); setCoupon(undefined, 0); setFare(null); setBooking(null);
  }, [setCoupon]);

  const value = useMemo<BookingState>(() => ({
    query, setQuery, recent, addRecent, trip, setTrip, selectedSeats, setSelectedSeats,
    boarding, setBoarding, dropping, setDropping, passengers, setPassengers, contact, setContact,
    couponCode, couponDiscount, setCoupon, fare, setFare, booking, setBooking, resetFlow,
  }), [query, setQuery, recent, addRecent, trip, selectedSeats, boarding, dropping, passengers, contact,
    couponCode, couponDiscount, setCoupon, fare, booking, resetFlow]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider');
  return ctx;
}
