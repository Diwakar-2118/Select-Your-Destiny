// Profile: avatar, editable details, saved passengers, saved cards, wallet, travel history, notifications, support, logout.
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Card, GradientButton, Input, SectionTitle } from '../components';
import { colors, gradient, radius, touch } from '../theme';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking, PassengerInput, SavedCard } from '../types';
import { inr, isEmail, isMobile, prettyDate } from '../utils';
import { TabScreenProps } from '../navigation/types';

export default function ProfileScreen({ navigation }: TabScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  const { user, signOut, updateUser } = useAuth();
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [wallet, setWallet] = useState(user?.walletBalance ?? 0);
  const [history, setHistory] = useState<Booking[]>([]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '' });
  const [err, setErr] = useState('');

  useFocusEffect(useCallback(() => {
    api.passengers().then(setPassengers).catch(() => undefined);
    api.cards().then(setCards).catch(() => undefined);
    api.wallet().then((w) => setWallet(w.balance)).catch(() => undefined);
    api.bookings('COMPLETED').then(setHistory).catch(() => undefined);
  }, []));

  const save = async () => {
    if (form.name.trim().length < 2 || !isEmail(form.email) || !isMobile(form.mobile)) return setErr('Please enter valid details');
    const u = await api.updateMe(form).catch(() => null);
    updateUser(u ?? form); setEdit(false); setErr('');
  };

  const logout = () => Alert.alert('Log out?', 'You will need to sign in again.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: async () => { await signOut(); navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] }); } },
  ]);

  const initials = (user?.name ?? 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <LinearGradient colors={gradient.colors as unknown as string[]} locations={gradient.locations as unknown as number[]} start={gradient.start} end={gradient.end}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <View style={styles.avatar} accessible accessibilityLabel={`Avatar for ${user?.name}`}><Text style={styles.initials}>{initials}</Text></View>
          <Text style={styles.name} accessibilityRole="header">{user?.name}</Text>
          <Text style={styles.sub}>{user?.email} · {user?.mobile}</Text>
          <Pressable onPress={() => setEdit(true)} accessibilityRole="button" accessibilityLabel="Edit profile" style={styles.editBtn}>
            <Ionicons name="create-outline" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', marginLeft: 4 }}>Edit profile</Text>
          </Pressable>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16 }}>
          <Card style={styles.wallet}>
            <Ionicons name="wallet" size={28} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.small}>Destiny Wallet</Text>
              <Text style={styles.walletAmt}>{inr(wallet)}</Text>
            </View>
            <Text style={styles.small}>Refunds & cashback</Text>
          </Card>

          <SectionTitle title="Saved passengers" />
          {passengers.length === 0 ? <Text style={styles.small}>No saved passengers yet.</Text> : passengers.map((p, i) => (
            <View key={`${p.name}-${i}`} style={styles.item}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={styles.itemTxt}>{p.name}</Text><Text style={styles.small}>{p.age} · {p.gender}</Text>
            </View>
          ))}

          <SectionTitle title="Saved cards" />
          {cards.map((c) => (
            <View key={c.id} style={styles.item}>
              <Ionicons name="card-outline" size={20} color={colors.secondary} />
              <Text style={styles.itemTxt}>{c.brand} •••• {c.last4}</Text><Text style={styles.small}>Exp {c.expiry}</Text>
            </View>
          ))}

          <SectionTitle title="Travel history" action="All bookings" onAction={() => navigation.navigate('Bookings')} />
          {history.length === 0 ? <Text style={styles.small}>No completed trips yet.</Text> : history.slice(0, 3).map((b) => (
            <View key={b.id} style={styles.item}>
              <Ionicons name="checkmark-done-outline" size={20} color={colors.success} />
              <Text style={styles.itemTxt}>{b.trip.fromCity} → {b.trip.toCity}</Text><Text style={styles.small}>{prettyDate(b.trip.journeyDate)}</Text>
            </View>
          ))}

          <SectionTitle title="More" />
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
          <MenuItem icon="pricetags-outline" label="Offers & coupons" onPress={() => navigation.navigate('Offers')} />
          <MenuItem icon="headset-outline" label="Help & support" onPress={() => navigation.navigate('Support')} />
          <MenuItem icon="log-out-outline" label="Log out" danger onPress={logout} />
          <Text style={[styles.small, { textAlign: 'center', marginTop: 16 }]}>Select Your Destiny v1.0 · Book Smart. Travel Comfortably.</Text>
        </View>
      </ScrollView>

      <BottomSheet visible={edit} onClose={() => setEdit(false)} title="Edit profile"
        footer={<GradientButton title="Save changes" onPress={save} />}>
        <Input label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <Input label="Email" value={form.email} autoCapitalize="none" keyboardType="email-address" onChangeText={(v) => setForm({ ...form, email: v })} />
        <Input label="Mobile" value={form.mobile} keyboardType="phone-pad" maxLength={10} onChangeText={(v) => setForm({ ...form, mobile: v })} />
        {!!err && <Text style={{ color: colors.danger }}>{err}</Text>}
      </BottomSheet>
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.text} />
      <Text style={[styles.itemTxt, danger && { color: colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 48, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontSize: 30, fontWeight: '900' },
  name: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 10 },
  sub: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', minHeight: touch.min, paddingHorizontal: 16, marginTop: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)' },
  wallet: { flexDirection: 'row', alignItems: 'center', marginTop: -32 },
  walletAmt: { fontSize: 22, fontWeight: '900', color: colors.text },
  small: { fontSize: 12, color: colors.muted },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 56, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, marginBottom: 8 },
  itemTxt: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: colors.text },
});
