// Interactive seat map (lower/upper deck), legend, boarding/dropping selection, sticky total footer.
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, EmptyState, GradientButton, GradientHeader, SeatButton, Skeleton } from '../components';
import { colors, radius, shadow, touch } from '../theme';
import { api, ApiError } from '../api/client';
import { useBooking } from '../context/BookingContext';
import { Point, Seat, SeatLayout } from '../types';
import { busTypeLabel, inr } from '../utils';
import { RootScreenProps } from '../navigation/types';

const MAX_SEATS = 6;

export default function SeatSelectionScreen({ navigation, route }: RootScreenProps<'SeatSelection'>) {
  const insets = useSafeAreaInsets();
  const { trip, selectedSeats, setSelectedSeats, boarding, setBoarding, dropping, setDropping } = useBooking();
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [deck, setDeck] = useState<'LOWER' | 'UPPER'>('LOWER');
  const [step, setStep] = useState<'SEATS' | 'POINTS'>('SEATS');
  const [loading, setLoading] = useState(false);
  const rescheduleId = route.params?.rescheduleBookingId;

  useEffect(() => {
    if (trip) api.seats(trip).then(setLayout).catch(() => setLayout({ tripId: trip.id, seats: [], rows: 0, cols: 0, hasUpperDeck: false }));
  }, [trip]);

  // Build row-major grid for the current deck
  const grid = useMemo(() => {
    if (!layout) return [];
    const seats = layout.seats.filter((s) => s.deck === deck);
    const rows: (Seat | undefined)[][] = Array.from({ length: layout.rows }, () => Array(layout.cols).fill(undefined));
    seats.forEach((s) => { if (rows[s.row]) rows[s.row][s.col] = s; });
    return rows;
  }, [layout, deck]);
  // Aisle position: 2+2 → after col 1; 2+1 → after col 0
  const aisleAfter = layout?.cols === 3 ? 0 : 1;

  if (!trip) return <EmptyState icon="bus-outline" title="No trip selected" />;

  const isSelected = (s: Seat) => selectedSeats.some((x) => x.seatNumber === s.seatNumber);
  const toggle = (s: Seat) => {
    if (isSelected(s)) return setSelectedSeats(selectedSeats.filter((x) => x.seatNumber !== s.seatNumber));
    if (selectedSeats.length >= MAX_SEATS) return Alert.alert('Seat limit', `You can select up to ${MAX_SEATS} seats.`);
    setSelectedSeats([...selectedSeats, s]);
  };
  const total = selectedSeats.reduce((a, s) => a + s.price, 0);

  const proceed = async () => {
    if (step === 'SEATS') {
      if (!selectedSeats.length) return Alert.alert('Select seats', 'Pick at least one seat to continue.');
      return setStep('POINTS');
    }
    if (!boarding || !dropping) return Alert.alert('Select points', 'Choose both boarding and dropping points.');
    setLoading(true);
    try {
      const nums = selectedSeats.map((s) => s.seatNumber);
      if (rescheduleId) {
        await api.reschedule(rescheduleId, trip.id, nums);
        Alert.alert('Rescheduled', 'Your booking has been moved to the new trip.');
        navigation.navigate('Main', { screen: 'Bookings' });
        return;
      }
      await api.lockSeats(trip.id, nums); // 10-minute hold
      navigation.navigate('PassengerDetails');
    } catch (e) {
      Alert.alert('Seats unavailable', e instanceof ApiError ? e.message : 'Please choose different seats.');
      if (e instanceof ApiError && e.status === 409) { setSelectedSeats([]); setStep('SEATS'); api.seats(trip).then(setLayout); }
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader title={trip.operatorName} subtitle={`${trip.busName} · ${busTypeLabel[trip.busType]} · ${trip.departureTime}`} />

      <View style={styles.steps}>
        <Chip label="1. Seats" selected={step === 'SEATS'} onPress={() => setStep('SEATS')} />
        <Chip label="2. Boarding & Dropping" selected={step === 'POINTS'} onPress={() => selectedSeats.length && setStep('POINTS')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        {step === 'SEATS' ? (
          <>
            <View style={styles.legend}>
              <Legend color={colors.seatAvailable} label="Available" />
              <Legend color={colors.seatBooked} label="Booked" />
              <Legend color={colors.seatSelected} label="Selected" />
              <Legend color={colors.seatLadies} label="Ladies" />
              <View style={styles.legendItem}><View style={styles.windowDot} /><Text style={styles.legendTxt}>Window</Text></View>
            </View>

            {layout?.hasUpperDeck && (
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Chip label="Lower deck" icon="arrow-down" selected={deck === 'LOWER'} onPress={() => setDeck('LOWER')} />
                <Chip label="Upper deck" icon="arrow-up" selected={deck === 'UPPER'} onPress={() => setDeck('UPPER')} />
              </View>
            )}

            <Card style={styles.bus}>
              <View style={styles.front}>
                <Text style={styles.small}>{deck === 'LOWER' ? 'FRONT' : 'UPPER DECK'}</Text>
                {deck === 'LOWER' && <MaterialCommunityIcons name="steering" size={28} color={colors.muted} accessibilityLabel="Driver" />}
              </View>
              {!layout ? (
                <View style={{ alignItems: 'center' }}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} width={240} height={48} style={{ marginBottom: 8 }} />)}</View>
              ) : (
                grid.map((row, r) => (
                  <View key={r} style={styles.row}>
                    {row.map((s, c) => (
                      <React.Fragment key={c}>
                        {s ? <SeatButton seat={s} selected={isSelected(s)} onToggle={toggle} /> : <View style={styles.gap} />}
                        {c === aisleAfter && <View style={styles.aisle} />}
                      </React.Fragment>
                    ))}
                  </View>
                ))
              )}
            </Card>
          </>
        ) : (
          <>
            <PointList title="Boarding point" icon="log-in-outline" points={trip.boardingPoints} value={boarding} onChange={setBoarding} />
            <PointList title="Dropping point" icon="log-out-outline" points={trip.droppingPoints} value={dropping} onChange={setDropping} />
          </>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.small} numberOfLines={1}>
            {selectedSeats.length ? `Seats: ${selectedSeats.map((s) => s.seatNumber).join(', ')}` : 'No seats selected'}
          </Text>
          <Text style={styles.total} accessibilityLiveRegion="polite">{inr(total)}</Text>
        </View>
        <GradientButton
          title={step === 'SEATS' ? 'Continue' : rescheduleId ? 'Reschedule' : 'Proceed'}
          disabled={!selectedSeats.length} loading={loading} onPress={proceed} style={{ minWidth: 150 }}
        />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { borderColor: color, backgroundColor: `${color}33` }]} />
      <Text style={styles.legendTxt}>{label}</Text>
    </View>
  );
}

function PointList({ title, icon, points, value, onChange }: {
  title: string; icon: keyof typeof Ionicons.glyphMap; points: Point[]; value: Point | null; onChange: (p: Point) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.h} accessibilityRole="header">{title}</Text>
      {points.map((p) => {
        const sel = value?.id === p.id;
        return (
          <Pressable key={p.id} onPress={() => onChange(p)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
            accessibilityLabel={`${p.name} at ${p.time}, ${p.address}`} style={[styles.point, sel && styles.pointSel]}>
            <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? colors.primary : colors.muted} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pointName}>{p.name}</Text>
              <Text style={styles.small}>{p.address}</Text>
            </View>
            <Ionicons name={icon} size={16} color={colors.muted} />
            <Text style={styles.pointTime}>{p.time}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 },
  legendBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, marginRight: 5 },
  legendTxt: { fontSize: 12, color: colors.muted },
  windowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38BDF8', marginRight: 5 },
  bus: { alignSelf: 'center', paddingHorizontal: 12, borderWidth: 2, borderColor: colors.border, borderRadius: 24 },
  front: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  gap: { width: 54, height: 54 },
  aisle: { width: 24 },
  small: { fontSize: 12, color: colors.muted },
  h: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  point: { flexDirection: 'row', alignItems: 'center', minHeight: 64, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8 },
  pointSel: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  pointName: { fontWeight: '700', color: colors.text },
  pointTime: { fontWeight: '800', color: colors.primary, marginLeft: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, ...shadow, minHeight: touch.min + 32 },
  total: { fontSize: 22, fontWeight: '900', color: colors.text },
});
