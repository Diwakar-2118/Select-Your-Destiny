// Bus search results + filter bottom sheet (AC/Non AC, Sleeper/Seater, time slots, sort, operator, amenities).
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, BusCard, BusCardSkeleton, Chip, EmptyState, GradientButton, GradientHeader, IconButton, amenityMeta } from '../components';
import { colors } from '../theme';
import { api, ApiError } from '../api/client';
import { mockOperators } from '../api/mock';
import { useBooking } from '../context/BookingContext';
import { Amenity, DepartureSlot, SearchFilters, SortKey, Trip } from '../types';
import { prettyDate } from '../utils';
import { RootScreenProps } from '../navigation/types';

const SLOTS: { key: DepartureSlot; label: string; icon: 'sunny-outline' | 'partly-sunny-outline' | 'cloudy-night-outline' | 'moon-outline' }[] = [
  { key: 'MORNING', label: '6AM–12PM', icon: 'sunny-outline' },
  { key: 'AFTERNOON', label: '12PM–6PM', icon: 'partly-sunny-outline' },
  { key: 'EVENING', label: '6PM–10PM', icon: 'cloudy-night-outline' },
  { key: 'NIGHT', label: 'After 10PM', icon: 'moon-outline' },
];
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'PRICE_ASC', label: 'Cheapest' }, { key: 'RATING_DESC', label: 'Top rated' },
  { key: 'DEPARTURE', label: 'Early departure' }, { key: 'ARRIVAL', label: 'Early arrival' },
];

export default function SearchResultsScreen({ navigation }: RootScreenProps<'SearchResults'>) {
  const { query, setTrip, setSelectedSeats } = useBooking();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ busType: query.busType });
  const [draft, setDraft] = useState<SearchFilters>(filters);

  const load = useCallback(async (f: SearchFilters) => {
    setError('');
    try {
      setTrips(await api.searchTrips(query.from, query.to, query.date, f));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load buses');
      setTrips([]);
    }
  }, [query.from, query.to, query.date]);

  useEffect(() => { setTrips(null); load(filters); }, [filters, load]);

  const activeCount = [filters.ac !== undefined, filters.sleeper !== undefined, !!filters.departure, !!filters.sort, !!filters.operator, !!filters.amenities?.length, !!filters.busType].filter(Boolean).length;
  const toggleAmenity = (a: Amenity) => setDraft((d) => {
    const cur = d.amenities ?? [];
    return { ...d, amenities: cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a] };
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <GradientHeader
        title={`${query.from} → ${query.to}`}
        subtitle={`${prettyDate(query.date)}${query.returnDate ? ` · Return ${prettyDate(query.returnDate)}` : ''} · ${query.passengers} pax`}
        right={<IconButton icon="options-outline" label={`Filters${activeCount ? `, ${activeCount} active` : ''}`} color="#fff" onPress={() => { setDraft(filters); setSheet(true); }} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, paddingHorizontal: 8 }}>
          <Chip label="AC" selected={filters.ac === true} onPress={() => setFilters((f) => ({ ...f, ac: f.ac === true ? undefined : true }))} />
          <Chip label="Non AC" selected={filters.ac === false} onPress={() => setFilters((f) => ({ ...f, ac: f.ac === false ? undefined : false }))} />
          <Chip label="Sleeper" selected={filters.sleeper === true} onPress={() => setFilters((f) => ({ ...f, sleeper: f.sleeper === true ? undefined : true }))} />
          <Chip label="Seater" selected={filters.sleeper === false} onPress={() => setFilters((f) => ({ ...f, sleeper: f.sleeper === false ? undefined : false }))} />
          <Chip label="Cheapest" selected={filters.sort === 'PRICE_ASC'} onPress={() => setFilters((f) => ({ ...f, sort: f.sort === 'PRICE_ASC' ? undefined : 'PRICE_ASC' }))} />
        </ScrollView>
      </GradientHeader>

      {trips === null ? (
        <View style={{ padding: 16 }}>{[0, 1, 2, 3].map((i) => <BusCardSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(filters); setRefreshing(false); }} />}
          ListHeaderComponent={<Text style={styles.count} accessibilityLiveRegion="polite">{trips.length} buses found</Text>}
          ListEmptyComponent={<EmptyState icon="bus-outline" title={error || 'No buses match'} body="Try changing filters or the travel date." />}
          renderItem={({ item }) => (
            <BusCard trip={item} onPress={() => { setTrip(item); setSelectedSeats([]); navigation.navigate('SeatSelection'); }} />
          )}
        />
      )}

      <BottomSheet
        visible={sheet} onClose={() => setSheet(false)} title="Filter & sort"
        footer={
          <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
            <GradientButton title="Clear" variant="outline" style={{ flex: 1 }} onPress={() => { setDraft({}); setFilters({}); setSheet(false); }} />
            <GradientButton title="Apply" style={{ flex: 1 }} onPress={() => { setFilters(draft); setSheet(false); }} />
          </View>
        }
      >
        <Text style={styles.h}>Sort by</Text>
        <View style={styles.wrap}>{SORTS.map((s) => <Chip key={s.key} label={s.label} selected={draft.sort === s.key} onPress={() => setDraft((d) => ({ ...d, sort: d.sort === s.key ? undefined : s.key }))} />)}</View>
        <Text style={styles.h}>Bus type</Text>
        <View style={styles.wrap}>
          <Chip label="AC" selected={draft.ac === true} onPress={() => setDraft((d) => ({ ...d, ac: d.ac === true ? undefined : true }))} />
          <Chip label="Non AC" selected={draft.ac === false} onPress={() => setDraft((d) => ({ ...d, ac: d.ac === false ? undefined : false }))} />
          <Chip label="Sleeper" selected={draft.sleeper === true} onPress={() => setDraft((d) => ({ ...d, sleeper: d.sleeper === true ? undefined : true }))} />
          <Chip label="Seater" selected={draft.sleeper === false} onPress={() => setDraft((d) => ({ ...d, sleeper: d.sleeper === false ? undefined : false }))} />
        </View>
        <Text style={styles.h}>Departure time</Text>
        <View style={styles.wrap}>{SLOTS.map((s) => <Chip key={s.key} icon={s.icon} label={s.label} selected={draft.departure === s.key} onPress={() => setDraft((d) => ({ ...d, departure: d.departure === s.key ? undefined : s.key }))} />)}</View>
        <Text style={styles.h}>Operator</Text>
        <View style={styles.wrap}>{mockOperators.map((o) => <Chip key={o} label={o} selected={draft.operator === o} onPress={() => setDraft((d) => ({ ...d, operator: d.operator === o ? undefined : o }))} />)}</View>
        <Text style={styles.h}>Amenities</Text>
        <View style={styles.wrap}>{(Object.keys(amenityMeta) as Amenity[]).map((a) => <Chip key={a} label={amenityMeta[a].label} selected={!!draft.amenities?.includes(a)} onPress={() => toggleAmenity(a)} />)}</View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { color: colors.muted, fontWeight: '600', marginBottom: 10 },
  h: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
