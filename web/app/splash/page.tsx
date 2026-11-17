'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BusIllustration } from '@/components/booking/BusIllustration';
import { LogoMark } from '@/components/layout/Logo';
import { SPLASH_SEEN_KEY } from '@/components/Providers';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => router.replace('/'), 2800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden gradient-brand px-6 text-white">
      {/* floating blobs */}
      <motion.div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 6 }}
        aria-hidden
      />
      <motion.div
        className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl"
        animate={{ scale: [1.1, 0.9, 1.1] }}
        transition={{ repeat: Infinity, duration: 7 }}
        aria-hidden
      />

      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }}>
        <div className="glass-dark rounded-3xl p-3">
          <LogoMark className="h-16 w-16" />
        </div>
      </motion.div>

      <motion.h1
        className="mt-6 text-center text-4xl font-extrabold tracking-tight sm:text-5xl"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        Select Your Destiny
      </motion.h1>
      <motion.p className="mt-2 text-lg text-white/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        Book Smart. Travel Comfortably.
      </motion.p>

      <motion.div
        className="mt-8 w-full max-w-xl"
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 60, damping: 14 }}
      >
        <BusIllustration className="h-auto w-full drop-shadow-2xl" />
      </motion.div>

      <div className="mt-8 w-56" role="progressbar" aria-label="Loading Select Your Destiny" aria-valuemin={0} aria-valuemax={100}>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <motion.div className="h-full rounded-full bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2.6, ease: 'easeInOut' }} />
        </div>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-white"
              animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => router.replace('/')}
        className="absolute bottom-8 min-h-[44px] rounded-2xl px-5 text-sm font-semibold text-white/85 underline-offset-4 hover:underline"
      >
        Skip
      </button>
    </div>
  );
}
