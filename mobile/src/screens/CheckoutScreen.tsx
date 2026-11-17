// Payment method selection + promo code. Pay Securely → POST /payments/initiate then /payments/verify (signature "mock").
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, GradientButton, GradientHeader, Input, Row } from '../components';
import { colors, radius, shadow, touch } from '../theme';
import { api, ApiError } from '../api/client';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod } from '../types';
import { inr } from '../utils';
import { RootScreenProps } from '../navigation/types';

const METHODS: { key: PaymentMethod; label: string; sub: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [
  { key: 'UPI', label: 'UPI', sub: 'Pay with any UPI ID', icon: 'qrcode-scan', color: '#16A34A' },
  { key: 'GOOGLE_PAY', label: 'Google Pay', sub: 'Fast & secure', icon: 'google', color: '#4285F4' },
  { key: 'PHONEPE', label: 'PhonePe', sub: 'UPI & wallet', icon: 'cellphone', color: '#5F259F' },
  { key: 'PAYTM', label: 'Paytm', sub: 'UPI, wallet & postpaid', icon: 'wallet-outline', color: '#00BAF2' },
  { key: 'CREDIT_CARD', label: 'Credit Card', sub: 'Visa, Mastercard, RuPay, Amex', icon: 'credit-card-outline', color: colors.primary },
  { key: 'DEBIT_CARD', label: 'Debit Card', sub: 'All major banks', icon: 'credit-card-chip-outline', color: colors.secondary },
  { key: 'NET_BANKING', label: 'Net Banking', sub: '50+ banks', icon: 'bank-outline', color: '#0EA5E9' },
  { key: 'WALLET', label: 'Destiny Wallet', sub: 'Use wallet balance', icon: 'wallet-giftcard', color: colors.accent },
  { key: 'LAZYPAY', label: 'LazyPay', sub: 'Buy now, pay later', icon: 'clock-fast', color: '#E11D48' },
  { key: 'EMI', label: 'EMI', sub: 'No-cost EMI on select cards', icon: 'calendar-month-outline', color: '#0F766E' },
];

export default function CheckoutScreen({ navigation }: RootScreenProps<'Checkout'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { booking, setBooking, fare } = useBooking();
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [upiId, setUpiId] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [promo, setPromo] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  if (!booking) return null;
  const amount = fare?.grandTotal ?? booking.fare.grandTotal;
  const isCard = method === 'CREDIT_CARD' || method === 'DEBIT_CARD' || method === 'EMI';

  const pay = async () => {
    setErr('');
    if (method === 'UPI' && !/^[\w.-]+@[\w]+$/.test(upiId)) return setErr('Enter a valid UPI ID (e.g. name@okbank)');
    if (isCard && (card.number.replace(/\s/g, '').length < 15 || !/^\d{2}\/\d{2}$/.test(card.expiry) || card.cvv.length < 3)) return setErr('Enter valid card details');
    if (method === 'WALLET' && (user?.walletBalance ?? 0) < amount) return setErr('Insufficient wallet balance');
    setLoading(true);
    try {
      const init = await api.initiatePayment(booking.id, method, promo.trim() || undefined, amount);
      // A real SDK (Razorpay etc.) would open here; dev backend accepts signature "mock".
      const confirmed = await api.verifyPayment(init.paymentId, `gw_${Date.now()}`, booking.id);
      setBooking(confirmed);
      navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'PaymentSuccess' }] });
    } catch (e) {
      Alert.alert('Payment failed', e instanceof ApiError ? e.message : 'Please try another method.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <GradientHeader title="Checkout" subtitle={`Booking ${booking.bookingRef}`} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Card style={{ marginBottom: 12 }}>
          <Row label="Amount payable" value={inr(amount)} bold />
          <Text style={styles.small}>Seats {booking.seatNumbers.join(', ')} · {booking.trip.fromCity} → {booking.trip.toCity}</Text>
        </Card>

        <Text style={styles.h} accessibilityRole="header">Choose payment method</Text>
        {METHODS.map((m) => {
          const sel = method === m.key;
          return (
            <Pressable key={m.key} onPress={() => setMethod(m.key)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
              accessibilityLabel={`${m.label}, ${m.sub}`} style={[styles.method, sel && styles.methodSel]}>
              <View style={[styles.mIcon, { backgroundColor: `${m.color}1A` }]}>
                <MaterialCommunityIcons name={m.icon} size={22} color={m.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.mLabel}>{m.label}</Text>
                <Text style={styles.small}>{m.key === 'WALLET' ? `Balance ${inr(user?.walletBalance ?? 0)}` : m.sub}</Text>
              </View>
              <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? colors.primary : colors.muted} />
            </Pressable>
          );
        })}

        {method === 'UPI' && (
          <Card style={{ marginTop: 4 }}>
            <Input label="UPI ID" icon="at" placeholder="name@okbank" autoCapitalize="none" value={upiId} onChangeText={setUpiId} />
          </Card>
        )}
        {isCard && (
          <Card style={{ marginTop: 4 }}>
            <Input label="Card number" icon="card-outline" keyboardType="number-pad" maxLength={19} value={card.number}
              onChangeText={(v) => setCard({ ...card, number: v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() })} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Input label="Expiry (MM/YY)" maxLength={5} value={card.expiry}
                onChangeText={(v) => setCard({ ...card, expiry: v.replace(/[^\d]/g, '').replace(/^(\d{2})(\d)/, '$1/$2') })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Input label="CVV" secure maxLength={4} keyboardType="number-pad" value={card.cvv} onChangeText={(v) => setCard({ ...card, cvv: v })} /></View>
            </View>
            <Input label="Name on card" value={card.name} onChangeText={(v) => setCard({ ...card, name: v })} autoCapitalize="characters" />
            {method === 'EMI' && <Text style={styles.small}>3, 6, 9 and 12 month plans available at checkout.</Text>}
          </Card>
        )}

        <Text style={styles.h}>Promo code</Text>
        <TextInput value={promo} onChangeText={setPromo} placeholder="Bank / wallet promo code (optional)" autoCapitalize="characters"
          style={styles.input} accessibilityLabel="Promo code" placeholderTextColor={colors.muted} />

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
          <Text style={[styles.small, { marginLeft: 6 }]}>256-bit SSL encrypted · PCI-DSS compliant</Text>
        </View>
        {!!err && <Text style={{ color: colors.danger, marginTop: 8 }} accessibilityLiveRegion="assertive">{err}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <GradientButton title={`Pay Securely ${inr(amount)}`} icon="lock-closed" loading={loading} onPress={pay} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: colors.text, marginVertical: 10 },
  small: { fontSize: 12, color: colors.muted },
  method: { flexDirection: 'row', alignItems: 'center', minHeight: 64, backgroundColor: '#fff', borderRadius: radius.lg, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: colors.border },
  methodSel: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  mIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mLabel: { fontWeight: '700', color: colors.text, fontSize: 15 },
  input: { minHeight: touch.min, borderRadius: radius.md, backgroundColor: '#fff', paddingHorizontal: 12, color: colors.text, borderWidth: 1.5, borderColor: colors.border },
  secure: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, ...shadow },
});
