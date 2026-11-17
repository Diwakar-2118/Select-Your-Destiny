// My Bookings with Upcoming / Completed / Cancelled tabs and Track / Download / Cancel / Reschedule actions.
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BusCardSkeleton, Card, Chip, EmptyState, GradientHeader } from '../components';
import { colors, radius, touch } from '../theme';
import { api, ApiError } from '../api/client';
import { useBooking } from '../context/BookingContext';
import { Booking } from '../types';
import { inr, prettyDate } from '../utils';
import { TabScreenProps } from '../navigation/types';

type TabKey = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
const statusColor: Record<Booking['status'], string> = { PENDING: colors.warning, CONFIRMED: colors.success, COMPLETED: colors.primary, CANCELLED: colors.danger };

export default function MyBookingsScreen({ navigation }: TabScreenProps<'Bookings'>) {
  const { setTrip, setSelectedSeats, setQuery } = useBooking();
  const [tab, setTab] = useState<TabKey>('UPCOMING');
  const [items, setItems] = useState<Booking[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (t: TabKey) => {
    try { setItems(await api.bookings(t)); } catch { setItems([]); }
  }, []);
  useFocusEffect(useCallback(() => { setItems(null); load(tab); }, [tab, load]));

  const cancel = (b: Booking) => Alert.alert('Cancel booking?', `Refund of ${inr(b.fare.grandTotal)} will be credited to your wallet.`, [
    { text: 'Keep', style: 'cancel' },
    { text: 'Cancel booking', style: 'destructive', onPress: async () => {
      try { await api.cancelBooking(b.id); load(tab); Alert.alert('Cancelled', 'Refund credited to wallet.'); }
      catch (e) { Alert.alert('Error', e instanceof ApiError ? e.message : 'Could not cancel'); }
    } },
  ]);

  const reschedule = (b: Booking) => {
    // Pick a new trip: reuse the same trip on its route, user selects new seats.
    setQuery({ from: b.trip.fromCity, to: b.trip.toCity, date: b.trip.journeyDate });
    setTrip(b.trip); setSelectedSeats([]);
    navigation.navigate('SeatSelection', { rescheduleBookingId: b.id });
  };

  const renderItem = ({ item: b }: { item: Booking }) => (
    <Card style={{ marginBottom: 12 }}>
      <View style={styles.row}>
        <Text style={styles.route}>{b.trip.fromCity} → {b.trip.toCity}</Text>
        <View style={[styles.badge, { backgroundColor: `${statusColor[b.status]}22` }]}>
          <Text style={[styles.badgeTxt, { color: statusColor[b.status] }]}>{b.status}</Text>
        </View>
      </View>
      <Text style={styles.small}>{prettyDate(b.trip.journeyDate)} · {b.boardingPoint.time} · {b.trip.operatorName}</Text>
      <Text style={styles.small}>{b.bookingRef} · PNR {b.pnr} · Seats {b.seatNumbers.join(', ')}</Text>
      <Text style={styles.amount}>{inr(b.fare.grandTotal)}</Text>
      <View style={styles.actions}>
        {tab === 'UPCOMING' && <Action icon="navigate-outline" label="Track" onPress={() => navigation.navigate('LiveTracking', { bookingId: b.id })} />}
        <Action icon="download-outline" label="Download" onPress={() => Linking.openURL(api.ticketUrl(b.id)).catch(() => Alert.alert('Unavailable', 'Ticket PDF needs the backend to be online.'))} />
        {tab === 'UPCOMING' && <Action icon="calendar-outline" label="Reschedule" onPress={() => reschedule(b)} />}
        {tab === 'UPCOMING' && <Action icon="close-circle-outline" label="Cancel" danger onPress={() => cancel(b)} />}
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <GradientHeader title="My Bookings" back={false}>
        <View style={{ flexDirection: 'row', marginTop: 10, paddingHorizontal: 8 }}>
          {(['UPCOMING', 'COMPLETED', 'CANCELLED'] as TabKey[]).map((t) => (
            <Chip key={t} label={t[0] + t.slice(1).toLowerCase()} selected={tab === t} onPress={() => setTab(t)} />
          ))}
        </View>
      </GradientHeader>
      {items === null ? <View style={{ padding: 16 }}>{[0, 1].map((i) => <BusCardSkeleton key={i} />)}</View> : (
        <FlatList
          data={items} keyExtractor={(b) => String(b.id)} renderItem={renderItem} contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(tab); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="ticket-outline" title={`No ${tab.toLowerCase()} bookings`} body="Your trips will appear here." />}
        />
      )}
    </View>
  );
}

function Action({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const c = danger ? colors.danger : colors.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={18} color={c} />
      <Text style={[styles.actionTxt, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  small: { fontSize: 12, color: colors.muted, marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  action: { flexDirection: 'row', alignItems: 'center', minHeight: touch.min, paddingRight: 16 },
  actionTxt: { fontWeight: '700', marginLeft: 4, fontSize: 13 },
});
