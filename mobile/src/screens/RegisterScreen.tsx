// Create account with inline validation.
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Card, GradientButton, GradientHeader, Input } from '../components';
import { colors } from '../theme';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';
import { isEmail, isMobile } from '../utils';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name';
    if (!isEmail(form.email)) e.email = 'Enter a valid email';
    if (!isMobile(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile';
    if (form.password.length < 8 || !/\d/.test(form.password)) e.password = 'Min 8 characters incl. a number';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true); setApiError('');
    try {
      const res = await api.register({ name: form.name.trim(), email: form.email.trim(), mobile: form.mobile, password: form.password });
      await signIn(res, true);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientHeader title="Create account" subtitle="Join Select Your Destiny" />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Input label="Full name" icon="person-outline" value={form.name} onChangeText={set('name')} error={errors.name} autoComplete="name" />
          <Input label="Email" icon="mail-outline" value={form.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
          <Input label="Mobile" icon="call-outline" value={form.mobile} onChangeText={set('mobile')} error={errors.mobile} keyboardType="phone-pad" maxLength={10} />
          <Input label="Password" icon="lock-closed-outline" secure value={form.password} onChangeText={set('password')} error={errors.password} />
          <Input label="Confirm password" icon="lock-closed-outline" secure value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} />
          {!!apiError && <Text style={{ color: colors.danger, marginBottom: 8 }}>{apiError}</Text>}
          <GradientButton title="Create account" loading={loading} onPress={submit} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
