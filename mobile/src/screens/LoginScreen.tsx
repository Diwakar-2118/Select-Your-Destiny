// Login: Mobile + OTP, Email/password, Google, Apple; remember me, forgot password, create account.
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, GradientButton, Input } from '../components';
import { colors, gradient, touch } from '../theme';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';
import { isEmail, isMobile } from '../utils';

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('demo@destiny.com');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finish = async (fn: () => Promise<import('../types').AuthResponse>) => {
    setError(''); setLoading(true);
    try {
      const res = await fn();
      await signIn(res, remember);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  const sendOtp = async () => {
    if (!isMobile(mobile)) return setError('Enter a valid 10-digit mobile number');
    setError(''); setLoading(true);
    try { await api.sendOtp(mobile); setOtpSent(true); } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const forgot = async () => {
    if (!isEmail(email)) return setError('Enter your email above to reset password');
    await api.forgotPassword(email).catch(() => undefined);
    Alert.alert('Check your inbox', `Password reset link sent to ${email}`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient colors={gradient.colors as unknown as string[]} locations={gradient.locations as unknown as number[]} start={gradient.start} end={gradient.end}
          style={[styles.hero, { paddingTop: insets.top + 32 }]}>
          <MaterialCommunityIcons name="bus-side" size={48} color="#fff" />
          <Text style={styles.title} accessibilityRole="header">Welcome back</Text>
          <Text style={styles.tag}>Book Smart. Travel Comfortably.</Text>
        </LinearGradient>

        <Card style={styles.card}>
          <View style={{ flexDirection: 'row' }}>
            <Chip label="Mobile OTP" icon="phone-portrait-outline" selected={mode === 'MOBILE'} onPress={() => { setMode('MOBILE'); setError(''); }} />
            <Chip label="Email" icon="mail-outline" selected={mode === 'EMAIL'} onPress={() => { setMode('EMAIL'); setError(''); }} />
          </View>

          {mode === 'MOBILE' ? (
            <>
              <Input label="Mobile number" icon="call-outline" placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} value={mobile} onChangeText={setMobile} />
              {otpSent && (
                <Input label="OTP" icon="key-outline" placeholder="6-digit OTP (dev: 123456)" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} textContentType="oneTimeCode" />
              )}
              <GradientButton
                title={otpSent ? 'Verify & Login' : 'Send OTP'}
                loading={loading}
                onPress={otpSent ? () => finish(() => api.verifyOtp(mobile, otp)) : sendOtp}
              />
              {otpSent && (
                <Pressable onPress={sendOtp} accessibilityRole="button" accessibilityLabel="Resend OTP" style={styles.link}>
                  <Text style={styles.linkTxt}>Resend OTP</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Input label="Email" icon="mail-outline" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <Input label="Password" icon="lock-closed-outline" placeholder="Password (demo: Demo@123)" secure value={password} onChangeText={setPassword} />
              <GradientButton title="Login" loading={loading} onPress={() => {
                if (!isEmail(email) || !password) return setError('Enter email and password');
                finish(() => api.login(email, password));
              }} />
            </>
          )}

          {!!error && <Text style={styles.error} accessibilityLiveRegion="assertive">{error}</Text>}

          <View style={styles.between}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Switch value={remember} onValueChange={setRemember} accessibilityLabel="Remember me" trackColor={{ true: colors.primary, false: colors.border }} />
              <Text style={{ marginLeft: 6, color: colors.text }}>Remember me</Text>
            </View>
            <Pressable onPress={forgot} accessibilityRole="button" accessibilityLabel="Forgot password" style={styles.link}>
              <Text style={styles.linkTxt}>Forgot password?</Text>
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} /><Text style={{ color: colors.muted, marginHorizontal: 8 }}>or continue with</Text><View style={styles.divider} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable style={styles.social} accessibilityRole="button" accessibilityLabel="Continue with Google"
              onPress={() => finish(() => api.social('GOOGLE', 'dev-google-token'))}>
              <Ionicons name="logo-google" size={20} color="#EA4335" /><Text style={styles.socialTxt}>Google</Text>
            </Pressable>
            <Pressable style={[styles.social, { backgroundColor: '#000' }]} accessibilityRole="button" accessibilityLabel="Continue with Apple"
              onPress={() => finish(() => api.social('APPLE', 'dev-apple-token'))}>
              <Ionicons name="logo-apple" size={20} color="#fff" /><Text style={[styles.socialTxt, { color: '#fff' }]}>Apple</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="button" accessibilityLabel="Create account" style={[styles.link, { alignSelf: 'center', marginTop: 12 }]}>
            <Text style={{ color: colors.muted }}>New here? <Text style={styles.linkTxt}>Create account</Text></Text>
          </Pressable>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 8 },
  tag: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  card: { marginHorizontal: 16, marginTop: -40, marginBottom: 24 },
  error: { color: colors.danger, marginTop: 10, textAlign: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  link: { minHeight: touch.min, justifyContent: 'center' },
  linkTxt: { color: colors.primary, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  social: { flex: 1, minHeight: touch.min, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  socialTxt: { fontWeight: '700', color: colors.text },
});
