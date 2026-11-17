'use client';
// Defensive wrapper around the shared `api` client.
// - Resolves methods by dotted name (e.g. "admin.list") so shape drift in lib/api never breaks the build.
// - Unwraps the `{ success, data, message }` envelope if a method returns it raw.
// - Falls back to local mock data when the method is missing or the request fails.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as apiModule from '@/lib/api';

type AnyFn = (...args: unknown[]) => unknown;

/** Locate the shared api object regardless of named/default export. */
function getApiRoot(): Record<string, unknown> | undefined {
  const mod = apiModule as unknown as Record<string, unknown>;
  return (mod.api ?? mod.default ?? mod) as Record<string, unknown> | undefined;
}

function resolve(path: string): AnyFn | undefined {
  const parts = path.split('.');
  let ctx: unknown = undefined;
  let cur: unknown = getApiRoot();
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    ctx = cur;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'function' ? (cur as AnyFn).bind(ctx) : undefined;
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'success' in (res as object) && 'data' in (res as object)) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/** Call an api method by name; returns fallback on any failure. */
export async function callApi<T>(path: string, args: unknown[] = [], fallback?: T | (() => T)): Promise<T> {
  const fb = () => (typeof fallback === 'function' ? (fallback as () => T)() : (fallback as T));
  const fn = resolve(path);
  if (!fn) {
    if (fallback === undefined) throw new Error(`api.${path} is not available`);
    return fb();
  }
  try {
    const res = unwrap<T>(await fn(...args));
    if ((res === undefined || res === null) && fallback !== undefined) return fb();
    return res;
  } catch (e) {
    if (fallback === undefined) throw e;
    return fb();
  }
}

export interface ApiState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/** React hook: loads `api.<path>(...args)` with loading / error / data state. */
export function useApi<T>(path: string, args: unknown[] = [], fallback?: T | (() => T), opts?: { pollMs?: number; enabled?: boolean }): ApiState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(args);
  const fbRef = useRef(fallback);
  fbRef.current = fallback;
  const enabled = opts?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const run = (silent: boolean) => {
      if (!silent) setLoading(true);
      callApi<T>(path, JSON.parse(key), fbRef.current)
        .then(d => { if (alive) { setData(d); setError(null); } })
        .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Something went wrong'); })
        .finally(() => { if (alive) setLoading(false); });
    };
    run(false);
    const id = opts?.pollMs ? setInterval(() => run(true), opts.pollMs) : undefined;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [path, key, tick, enabled, opts?.pollMs]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, reload, setData };
}

/** Base URL for direct links (ticket PDF etc). */
export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

export const inr = (n: number | undefined | null) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const fmtDate = (s: string | undefined) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
