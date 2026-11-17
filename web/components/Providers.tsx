'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, BookingProvider } from '@/lib/store';
import { ToastProvider } from '@/components/ui/Toast';

export const SPLASH_SEEN_KEY = 'syd_splash_seen';

/** Redirects first-time visitors of the home page to /splash. */
function SplashGate() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname !== '/') return;
    try {
      if (!localStorage.getItem(SPLASH_SEEN_KEY)) router.replace('/splash');
    } catch {
      /* ignore */
    }
  }, [pathname, router]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <BookingProvider>
          <SplashGate />
          {children}
        </BookingProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
