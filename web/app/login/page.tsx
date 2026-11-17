'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, Lock, Mail, Smartphone } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Button, Card, Input, Modal, PageTransition, Tabs, TabPanel, useToast } from '@/components/ui';
import { BusIllustration } from '@/components/booking/BusIllustration';
import type { AuthResponse } from '@/lib/types';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1S8.7 5.8 12 5.8c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.4 1-4.3 2.6-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.6-1-2.6-4.2zM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const { signIn, isAuthenticated } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('mobile');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const done = (res: AuthResponse) => {
    signIn(res, remember);
    toast.success(`Welcome, ${res.user.name.split(' ')[0]}!`);
    router.replace(res.user.role === 'ADMIN' && next === '/' ? '/admin' : next);
  };

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) return setErrors({ mobile: 'Enter a valid 10-digit mobile number' });
    setErrors({});
    setLoading('otp-send');
    try {
      await api.sendOtp(mobile);
      setOtpSent(true);
      setTimer(30);
      toast.info('OTP sent! (Demo OTP: 123456)');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) return sendOtp();
    if (!/^\d{6}$/.test(otp)) return setErrors({ otp: 'Enter the 6-digit OTP' });
    setLoading('otp');
    try {
      done(await api.verifyOtp(mobile, otp));
    } catch (err) {
      setErrors({ otp: errorMessage(err) });
    } finally {
      setLoading(null);
    }
  };

  const emailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading('email');
    try {
      done(await api.login(email, password));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const social = async (provider: 'GOOGLE' | 'APPLE') => {
    setLoading(provider);
    try {
      done(await api.socialLogin(provider, `dev-${provider.toLowerCase()}-token`));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const forgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail)) return toast.error('Enter a valid email');
    setLoading('forgot');
    try {
      await api.forgotPassword(forgotEmail);
      toast.success('Password reset link sent to your email');
      setForgotOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <PageTransition className="container-app grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-3xl gradient-brand p-10 text-white lg:block">
        <h2 className="text-4xl font-extrabold leading-tight">Your next journey starts here.</h2>
        <p className="mt-3 max-w-md text-white/85">Log in to manage bookings, unlock exclusive offers and travel with live tracking.</p>
        <BusIllustration className="mt-10 w-full" />
      </div>

      <Card variant="white" padding="lg" className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-extrabold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Login to continue booking your trip</p>

        <Tabs
          className="mt-6"
          idBase="login"
          fullWidth
          ariaLabel="Login method"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setErrors({});
          }}
          tabs={[
            { id: 'mobile', label: 'Mobile OTP', icon: <Smartphone className="h-4 w-4" /> },
            { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
          ]}
        />

        <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="mt-5">
          {tab === 'mobile' ? (
            <TabPanel idBase="login" id="mobile">
              <form onSubmit={verifyOtp} className="space-y-4" noValidate>
                <Input
                  label="Mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="98765 43210"
                  leftIcon={<span className="text-sm font-semibold text-ink">+91</span>}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  error={errors.mobile}
                  disabled={otpSent}
                  rightSlot={
                    otpSent ? (
                      <button type="button" className="min-h-[40px] px-2 text-xs font-semibold text-primary" onClick={() => { setOtpSent(false); setOtp(''); }}>
                        Change
                      </button>
                    ) : undefined
                  }
                />
                {otpSent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <Input
                      label="Enter OTP"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6-digit OTP"
                      leftIcon={<KeyRound className="h-4 w-4" />}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      error={errors.otp}
                      hint="Demo OTP: 123456"
                      className="tracking-[0.4em]"
                    />
                    <div className="mt-2 text-right text-sm">
                      {timer > 0 ? (
                        <span className="text-muted">Resend OTP in {timer}s</span>
                      ) : (
                        <button type="button" onClick={sendOtp} className="min-h-[44px] font-semibold text-primary">
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
                <RememberRow remember={remember} setRemember={setRemember} onForgot={() => setForgotOpen(true)} />
                <Button type="submit" fullWidth size="lg" loading={loading === 'otp' || loading === 'otp-send'}>
                  {otpSent ? 'Verify & Login' : 'Get OTP'}
                </Button>
              </form>
            </TabPanel>
          ) : (
            <TabPanel idBase="login" id="email">
              <form onSubmit={emailLogin} className="space-y-4" noValidate>
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  hint="Demo: demo@destiny.com / Demo@123"
                />
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-card"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <RememberRow remember={remember} setRemember={setRemember} onForgot={() => setForgotOpen(true)} />
                <Button type="submit" fullWidth size="lg" loading={loading === 'email'}>
                  Login
                </Button>
              </form>
            </TabPanel>
          )}
        </motion.div>

        <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted">
          <span className="h-px flex-1 bg-gray-200" /> OR CONTINUE WITH <span className="h-px flex-1 bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="white" leftIcon={<GoogleIcon />} loading={loading === 'GOOGLE'} onClick={() => social('GOOGLE')}>
            Google
          </Button>
          <Button variant="white" className="!bg-black !text-white hover:!bg-slate-800" leftIcon={<AppleIcon />} loading={loading === 'APPLE'} onClick={() => social('APPLE')}>
            Apple
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          New to Select Your Destiny?{' '}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
            Create account
          </Link>
        </p>
      </Card>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Forgot password?"
        description="We'll email you a link to reset your password."
        size="sm"
      >
        <form onSubmit={forgot} className="space-y-4">
          <Input label="Email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" leftIcon={<Mail className="h-4 w-4" />} />
          <Button type="submit" fullWidth loading={loading === 'forgot'}>
            Send reset link
          </Button>
        </form>
      </Modal>
    </PageTransition>
  );
}

function RememberRow({ remember, setRemember, onForgot }: { remember: boolean; setRemember: (v: boolean) => void; onForgot: () => void }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-ink">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 rounded accent-primary" />
        Remember me
      </label>
      <button type="button" onClick={onForgot} className="min-h-[44px] font-semibold text-primary hover:underline">
        Forgot password?
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
