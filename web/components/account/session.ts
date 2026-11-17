'use client';
// Thin adapter over the shared `useAuth()` store (lib/store.tsx) so account/admin pages tolerate shape drift
// and still render (as guest) when no AuthProvider is mounted.
import * as storeModule from '@/lib/store';
import type { UserLite } from './types';

export interface Session { user: UserLite | null; token: string | null; isAdmin: boolean; loading: boolean; logout: () => void }

type RawAuth = Partial<{ user: UserLite | null; token: string | null; isAdmin: boolean; loading: boolean; logout: () => void; signOut: () => void }>;
const mod = storeModule as unknown as Record<string, unknown>;
// Resolved once at module load, so hook-call order stays stable between renders.
const useAuthImpl = (typeof mod.useAuth === 'function' ? mod.useAuth : () => ({})) as () => RawAuth;

export function useSession(): Session {
  let raw: RawAuth = {};
  try { raw = useAuthImpl() ?? {}; } catch { /* no AuthProvider mounted */ }
  let token = raw.token ?? null;
  if (!token && typeof window !== 'undefined') {
    try { token = localStorage.getItem('syd_token') || sessionStorage.getItem('syd_token'); } catch { /* storage blocked */ }
  }
  const user = raw.user ?? null;
  const out = raw.logout ?? raw.signOut;
  return {
    user,
    token,
    loading: !!raw.loading,
    isAdmin: raw.isAdmin ?? user?.role === 'ADMIN',
    logout: () => {
      if (typeof out === 'function') out();
      else { try { localStorage.removeItem('syd_token'); } catch { /* ignore */ } }
      if (typeof window !== 'undefined') window.location.href = '/';
    },
  };
}
