'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, Smartphone, User as UserIcon } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Button, Card, Input, PageTransition, useToast } from '@/components/ui';

function RegisterInner() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const { signIn } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) errs.mobile = 'Enter a valid 10-digit mobile';
    if (form.password.length < 8) errs.password = 'Use at least 8 characters';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match';
    if (!agree) errs.agree = 'Please accept the terms';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const res = await api.register({ name: form.name.trim(), email: form.email, mobile: form.mobile, password: form.password });
      signIn(res);
      toast.success('Account created! Welcome aboard 🎉');
      router.replace(next);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="container-app flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <Card padding="lg" className="w-full max-w-lg">
        <h1 className="text-2xl font-extrabold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Join millions of happy travellers. Get ₹100 welcome bonus in your wallet.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
          <Input containerClassName="sm:col-span-2" label="Full name" required autoComplete="name" leftIcon={<UserIcon className="h-4 w-4" />} value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Email" type="email" required autoComplete="email" leftIcon={<Mail className="h-4 w-4" />} value={form.email} onChange={set('email')} error={errors.email} />
          <Input
            label="Mobile"
            required
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
            leftIcon={<Smartphone className="h-4 w-4" />}
            value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '') }))}
            error={errors.mobile}
          />
          <div>
            <Input label="Password" type="password" required autoComplete="new-password" leftIcon={<Lock className="h-4 w-4" />} value={form.password} onChange={set('password')} error={errors.password} />
            <div className="mt-2 flex gap-1" aria-label={`Password strength ${strength} of 4`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? (strength < 2 ? 'bg-red-400' : strength < 4 ? 'bg-amber-400' : 'bg-green-500') : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
          <Input label="Confirm password" type="password" required autoComplete="new-password" leftIcon={<Lock className="h-4 w-4" />} value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          <div className="sm:col-span-2">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 accent-primary" />
              I agree to the Terms of Service and Privacy Policy
            </label>
            {errors.agree && <p role="alert" className="text-xs font-medium text-red-600">{errors.agree}</p>}
          </div>
          <Button type="submit" size="lg" fullWidth loading={loading} className="sm:col-span-2">
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </PageTransition>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}
