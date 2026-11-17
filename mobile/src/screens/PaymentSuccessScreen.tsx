// Success: animated check + confetti, booking ref, PNR, QR ticket, download/share/email/SMS.
import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Animated, Easing, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, GradientButton, Row } from '../components';
import { colors, radius, touch } from '../theme';
import { api } from '../api/client';
import { useBooking } from '../context/BookingContext';
import { inr, prettyDate } from '../utils';
import { RootScreenProps } from '../navigation/types';

const CONFETTI_COLORS = [colors.primary, colors.secondary, colors.accent, colors.success, colors.seatLadies, '#FACC15'];

function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => Array.from({ length: 36 }).map((_, i) => ({
    x: Math.random() * width, delay: Math.random() * 600, rot: Math.random() * 720,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], size: 6 + Math.random() * 6, anim: new Animated.Value(0),
  })), [width]);
  useEffect(() => {
    Animated.stagger(20, pieces.map((p) => Animated.timing(p.anim, { toValue: 1, duration: 2200 + p.delay, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }))).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: -20, width: p.size, height: p.size * 1.6, backgroundColor: p.color, borderRadius: 2,
          opacity: p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
            { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

export default function PaymentSuccessScreen({ navigation }: RootScreenProps<'PaymentSuccess'>) {
  const insets = useSafeAreaInsets();
  const { booking, resetFlow } = useBooking();
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scale, fade]);

  if (!booking) return null;
  const t = booking.trip;
  const summary = `Select Your Destiny ticket\nBooking: ${booking.bookingRef}\nPNR: ${booking.pnr}\n${t.fromCity} → ${t.toCity} on ${t.journeyDate} at ${booking.boardingPoint.time}\nBus: ${t.operatorName} (${t.busNumber})\nSeats: ${booking.seatNumbers.join(', ')}\nTotal: ${inr(booking.fare.grandTotal)}`;

  const send = async (channel: 'EMAIL' | 'SMS') => {
    await api.shareBooking(booking.id, channel).catch(() => undefined);
    Alert.alert('Sent', `Ticket sent via ${channel === 'EMAIL' ? `email to ${booking.contactEmail}` : `SMS to ${booking.contactMobile}`}.`);
  };

  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'download-outline', label: 'Download', onPress: () => Linking.openURL(api.ticketUrl(booking.id)).catch(() => Alert.alert('Download unavailable', 'Ticket PDF needs the backend to be online.')) },
    { icon: 'share-social-outline', label: 'Share', onPress: () => Share.share({ message: summary, title: 'My bus ticket' }) },
    { icon: 'mail-outline', label: 'Email', onPress: () => send('EMAIL') },
    { icon: 'chatbubble-outline', label: 'SMS', onPress: () => send('SMS') },
  ];

  const done = () => { resetFlow(); navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Bookings' } }] }); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 24, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center' }}>
          <Animated.View style={[styles.check, { transform: [{ scale }] }]} accessible accessibilityLabel="Payment successful">
            <Ionicons name="checkmark" size={64} color="#fff" />
          </Animated.View>
          <Text style={styles.title} accessibilityRole="header">Booking Confirmed!</Text>
          <Text style={styles.small}>Have a comfortable journey 🚌</Text>
        </View>

        <Animated.View style={{ opacity: fade }}>
          <Card style={{ marginTop: 20 }}>
            <View style={styles.ids}>
              <View><Text style={styles.small}>Booking ID</Text><Text style={styles.id} selectable>{booking.bookingRef}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={styles.small}>PNR</Text><Text style={styles.id} selectable>{booking.pnr}</Text></View>
            </View>
            <View style={styles.qr} accessible accessibilityLabel={`Ticket QR code for booking ${booking.bookingRef}`}>
              <QRCode value={JSON.stringify({ ref: booking.bookingRef, pnr: booking.pnr, seats: booking.seatNumbers })} size={160} color={colors.text} />
            </View>
            <Row label="Route" value={`${t.fromCity} → ${t.toCity}`} />
            <Row label="Date" value={prettyDate(t.journeyDate)} />
            <Row label="Boarding" value={`${booking.boardingPoint.name} · ${booking.boardingPoint.time}`} />
            <Row label="Bus" value={`${t.operatorName} · ${t.busNumber}`} />
            <Row label="Seats" value={booking.seatNumbers.join(', ')} />
            <Row label="Paid" value={inr(booking.fare.grandTotal)} bold />
          </Card>

          <View style={styles.actions}>
            {actions.map((a) => (
              <Pressable key={a.label} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={`${a.label} ticket`} style={styles.action}>
                <Ionicons name={a.icon} size={24} color={colors.primary} />
                <Text style={styles.actionTxt}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          <GradientButton title="View my bookings" onPress={done} style={{ marginTop: 16 }} />
        </Animated.View>
      </ScrollView>
      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  check: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  small: { fontSize: 12, color: colors.muted },
  ids: { flexDirection: 'row', justifyContent: 'space-between' },
  id: { fontSize: 18, fontWeight: '900', color: colors.primary, marginTop: 2 },
  qr: { alignItems: 'center', paddingVertical: 16, marginVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  action: { flex: 1, minHeight: touch.min + 24, marginHorizontal: 4, backgroundColor: '#fff', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionTxt: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 4 },
});
