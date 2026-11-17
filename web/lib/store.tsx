'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';
import type { AuthResponse, Booking, BusType, FareBreakdown, PassengerInput, Point, Seat, SeatLockResponse, Trip, User } from './types';

// ============================ Booking ============================

export interface SearchParamsState {
  from: string;
  to: string;
  date: string;
  returnDate?: string;
  passengers: number;
  busType?: BusType | '';
}

export interface ContactInfo {
  mobile: string;
  email: string;
  emergencyContact?: string;
}

export interface GstInfo {
  gstNumber?: string;
  gstCompany?: string;
}

export interface BookingState {
  search: SearchParamsState | null;
  trip: Trip | null;
  seats: Seat[];
  boardingPoint: Point | null;
  droppingPoint: Point | null;
  lock: SeatLockResponse | null;
  passengers: PassengerInput[];
  contact: ContactInfo;
  gst: GstInfo;
  couponCode: string;
  fare: FareBreakdown | null;
  booking: Booking | null;
}

const initialBooking: BookingState = {
  search: null,
  trip: null,
  seats: [],
  boardingPoint: null,
  droppingPoint: null,
  lock: null,
  passengers: [],
  contact: { mobile: '', email: '' },
  gst: {},
  couponCode: '',
  fare: null,
  booking: null,
};

interface BookingCtx extends BookingState {
  hydrated: boolean;
  setSearch: (s: SearchParamsState) => void;
  selectTrip: (t: Trip) => void;
  setSeats: (s: Seat[]) => void;
  setPoints: (boarding: Point | null, dropping: Point | null) => void;
  setLock: (l: SeatLockResponse | null) => void;
  setPassengers: (p: PassengerInput[]) => void;
  setContact: (c: ContactInfo) => void;
  setGst: (g: GstInfo) => void;
  setCoupon: (code: string) => void;
  setFare: (f: FareBreakdown | null) => void;
  setBooking: (b: Booking | null) => void;
  update: (patch: Partial<BookingState>) => void;
  /** Clears everything except the last search. */
  resetBooking: () => void;
}

const BookingContext = createContext<BookingCtx | null>(null);
const BOOKING_KEY = 'syd_booking';

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(initialBooking);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BOOKING_KEY);
      if (raw) setState({ ...initialBooking, ...(JSON.parse(raw) as Partial<BookingState>) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(BOOKING_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<BookingState>) => setState((s) => ({ ...s, ...patch })), []);

  const value = useMemo<BookingCtx>(
    () => ({
      ...state,
      hydrated,
      update,
      setSearch: (search) => update({ search }),
      selectTrip: (trip) =>
        setState((s) => ({
          ...s,
          trip,
          seats: s.trip?.id === trip.id ? s.seats : [],
          boardingPoint: s.trip?.id === trip.id ? s.boardingPoint : null,
          droppingPoint: s.trip?.id === trip.id ? s.droppingPoint : null,
          passengers: s.trip?.id === trip.id ? s.passengers : [],
          fare: null,
          booking: null,
          lock: null,
        })),
      setSeats: (seats) => update({ seats }),
      setPoints: (boardingPoint, droppingPoint) => update({ boardingPoint, droppingPoint }),
      setLock: (lock) => update({ lock }),
      setPassengers: (passengers) => update({ passengers }),
      setContact: (contact) => update({ contact }),
      setGst: (gst) => update({ gst }),
      setCoupon: (couponCode) => update({ couponCode }),
      setFare: (fare) => update({ fare }),
      setBooking: (booking) => update({ booking }),
      resetBooking: () => setState((s) => ({ ...initialBooking, search: s.search })),
    }),
    [state, hydrated, update],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingCtx {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

// ============================ Auth ============================

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Store the result of any api auth call (login/register/otp/social). */
  signIn: (res: AuthResponse, remember?: boolean) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthCtx | null>(null);
const USER_KEY = 'syd_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTok] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistUser = (u: User | null) => {
    try {
      if (u) sessionStorage.setItem(USER_KEY, JSON.stringify(u));
      else sessionStorage.removeItem(USER_KEY);
      if (u && localStorage.getItem(TOKEN_REMEMBER) === '1') localStorage.setItem(USER_KEY, JSON.stringify(u));
      if (!u) localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  };

  const refresh = useCallback(async () => {
    const t = getToken();
    setTok(t);
    if (!t) {
      setUserState(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUserState(me);
      persistUser(me);
    } catch {
      // token invalid
      setToken(null);
      setTok(null);
      setUserState(null);
      persistUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      if (cached && getToken()) {
        setUserState(JSON.parse(cached) as User);
        setTok(getToken());
      }
    } catch {
      /* ignore */
    }
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!user && !!token,
      isAdmin: user?.role === 'ADMIN',
      signIn: (res, remember = true) => {
        setToken(res.token);
        try {
          localStorage.setItem(TOKEN_REMEMBER, remember ? '1' : '0');
        } catch {
          /* ignore */
        }
        setTok(res.token);
        setUserState(res.user);
        persistUser(res.user);
      },
      signOut: () => {
        setToken(null);
        setTok(null);
        setUserState(null);
        persistUser(null);
        try {
          sessionStorage.removeItem(BOOKING_KEY);
        } catch {
          /* ignore */
        }
      },
      refresh,
      setUser: (u) => {
        setUserState(u);
        persistUser(u);
      },
    }),
    [user, token, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const TOKEN_REMEMBER = 'syd_remember';

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
