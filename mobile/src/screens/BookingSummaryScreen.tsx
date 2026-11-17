// Trip recap, passengers, contract fare breakdown (via /bookings/quote) and coupon apply.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, GradientButton, GradientHeader, Row, Skeleton } from '../components';
import { colors, radius, touch } from '../theme';
import { api, ApiError } from '../api/client';
import { useBooking } from '../context/BookingContext';
import { BookingRequest, Coupon } from '../types';
import { duration, inr, prettyDate } from '../utils';
import { RootScreenProps } from '../navigation/types';

export default function BookingSummaryScreen({ navigation }: RootScreenProps<'BookingSummary'>) {
  const b = useBooking();
  const { trip, selectedSeats, passengers, boarding, dropping, contact, fare, setFare, couponCode, couponDiscount, setCoupon, setBooking } = b;
  const [code, setCode] = useState(couponCode ?? '');
  const [couponMsg, setCouponMsg] = useState('');
  const [offers, setOffers] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  const buildReq = useCallback((cc?: string): BookingRequest => ({
    tripId: trip!.id, seatNumbers: selectedSeats.map((s) => s.seatNumber), passengers,
    contactMobile: contact.mobile, contactEmail: contact.email, emergencyContact: contact.emergencyContact,
    boardingPointId: boarding!.id, droppingPointId: dropping!.id, gstNumber: contact.gstNumber, gstCompany: contact.gstCompany,
    couponCode: cc,
  }), [trip, selectedSeats, passengers, contact, boarding, dropping]);

  const quote = useCallback(async (cc?: string, cd = 0) => {
    if (!trip) return;
    setFare(null);
    const f = await api.quote(buildReq(cc), trip, selectedSeats.map((s) => s.price), cd).catch(() => null);
    setFare(f);
  }, [trip, buildReq, selectedSeats, setFare]);

  useEffect(() => { quote(couponCode, couponDiscount); api.offers().then(setOffers).catch(() => undefined); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip || !boarding || !dropping) return null;
  const base = selectedSeats.reduce((a, s) => a + s.price, 0);

  const apply = async (c = code) => {
    if (!c.trim()) return;
    try {
      const r = await api.validateCoupon(c.trim().toUpperCase(), base);
      setCouponMsg(r.message);
      if (r.valid) { setCode(c.toUpperCase()); setCoupon(c.toUpperCase(), r.discount); quote(c.toUpperCase(), r.discount); }
    } catch (e) { setCouponMsg(e instanceof ApiError ? e.message : 'Could not validate coupon'); }
  };
  const remove = () => { setCoupon(undefined, 0); setCode(''); setCouponMsg(''); quote(undefined, 0); };

  const proceed = async () => {
    if (!fare) return;
    setLoading(true);
    try {
      const booking = await api.createBooking(buildReq(couponCode), trip, fare);
      setBooking(booking);
      navigation.navigate('Checkout');
    } catch (e) {
      Alert.alert('Booking failed', e instanceof ApiError ? e.message : 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <GradientHeader title="Booking summary" subtitle={`${trip.fromCity} → ${trip.toCity} · ${prettyDate(trip.journeyDate)}`} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card style={styles.mb}>
          <Text style={styles.h}>{trip.operatorName}</Text>
          <Text style={styles.small}>{trip.busName} · {trip.busNumber}</Text>
          <View style={styles.timeline}>
            <View><Text style={styles.time}>{boarding.time}</Text><Text style={styles.small}>{boarding.name}</Text></View>
            <Text style={styles.small}>{duration(trip.durationMins)}</Text>
            <View style={{ alignItems: 'flex-end' }}><Text style={styles.time}>{dropping.time}</Text><Text style={styles.small}>{dropping.name}</Text></View>
          </View>
        </Card>

        <Card style={styles.mb}>
          <Text style={styles.h}>Passengers</Text>
          {passengers.map((p) => (
            <View key={p.seatNumber} style={styles.pax}>
              <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              <Text style={{ flex: 1, marginLeft: 8, color: colors.text }}>{p.name} · {p.age} · {p.gender[0]}</Text>
              <Text style={{ fontWeight: '700', color: colors.primary }}>{p.seatNumber}</Text>
            </View>
          ))}
          <Text style={[styles.small, { marginTop: 6 }]}>{contact.mobile} · {contact.email}</Text>
        </Card>

        <Card style={styles.mb}>
          <Text style={styles.h}>Apply coupon</Text>
          {couponCode ? (
            <View style={styles.applied}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={{ flex: 1, marginLeft: 8, fontWeight: '700', color: colors.text }}>{couponCode} applied (−{inr(couponDiscount)})</Text>
              <Chip label="Remove" onPress={remove} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput value={code} onChangeText={setCode} placeholder="Enter coupon code" autoCapitalize="characters"
                  style={styles.input} accessibilityLabel="Coupon code" placeholderTextColor={colors.muted} />
                <GradientButton title="Apply" onPress={() => apply()} style={{ width: 100 }} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {offers.map((o) => <Chip key={o.id} label={o.code} icon="pricetag-outline" onPress={() => apply(o.code)} />)}
              </ScrollView>
            </>
          )}
          {!!couponMsg && <Text style={{ color: couponCode ? colors.success : colors.danger, marginTop: 6 }} accessibilityLiveRegion="polite">{couponMsg}</Text>}
        </Card>

        <Card style={styles.mb}>
          <Text style={styles.h}>Fare breakdown</Text>
          {!fare ? [0, 1, 2, 3].map((i) => <Skeleton key={i} height={16} style={{ marginBottom: 10 }} />) : (
            <>
              <Row label={`Base fare (${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''})`} value={inr(fare.baseFare)} />
              <Row label="GST (5%)" value={inr(fare.gst)} />
              <Row label="Platform fee" value={inr(fare.platformFee)} />
              <Row label="Convenience fee (2%)" value={inr(fare.convenienceFee)} />
              {fare.discount > 0 && <Row label={`Operator discount (${trip.discountPercent}%)`} value={`−${inr(fare.discount)}`} color={colors.success} />}
              {fare.couponDiscount > 0 && <Row label="Coupon discount" value={`−${inr(fare.couponDiscount)}`} color={colors.success} />}
              <View style={styles.divider} />
              <Row label="Grand total" value={inr(fare.grandTotal)} bold />
            </>
          )}
        </Card>

        <GradientButton title={fare ? `Proceed to pay ${inr(fare.grandTotal)}` : 'Calculating…'} disabled={!fare} loading={loading} onPress={proceed} icon="lock-closed" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mb: { marginBottom: 12 },
  h: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  small: { fontSize: 12, color: colors.muted },
  time: { fontSize: 18, fontWeight: '800', color: colors.text },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  pax: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  applied: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minHeight: touch.min + 4, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: 12, color: colors.text, fontWeight: '700', borderWidth: 1.5, borderColor: colors.border },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
});
