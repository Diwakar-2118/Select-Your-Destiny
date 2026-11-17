// Home: search form (From/To swap, date, optional return, passengers, bus type), quick cities,
// recent searches, offers banner, popular routes, nearby boarding points.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Card, Chip, GradientButton, IconButton, SectionTitle, Skeleton } from '../components';
import { colors, gradient, radius, touch } from '../theme';
import { api, today } from '../api/client';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { BusType, City, Coupon, PopularRoute } from '../types';
import { addDays, busTypeLabel, inr, prettyDate } from '../utils';
import { TabScreenProps } from '../navigation/types';

const QUICK = ['Bengaluru', 'Chennai', 'Hyderabad', 'Mumbai', 'Pune', 'Goa'];
const BUS_TYPES: (BusType | undefined)[] = [undefined, 'AC_SLEEPER', 'VOLVO_MULTI_AXLE', 'AC_SEATER', 'NON_AC_SLEEPER', 'ELECTRIC'];

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { query, setQuery, recent, addRecent, resetFlow } = useBooking();
  const [cities, setCities] = useState<City[]>([]);
  const [popular, setPopular] = useState<PopularRoute[] | null>(null);
  const [offers, setOffers] = useState<Coupon[]>([]);
  const [picker, setPicker] = useState<null | 'from' | 'to'>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const swapRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api.cities().then(setCities).catch(() => undefined);
    api.popularRoutes().then(setPopular).catch(() => setPopular([]));
    api.offers().then(setOffers).catch(() => undefined);
  }, []);

  const swap = () => {
    Animated.timing(swapRot, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => swapRot.setValue(0));
    setQuery({ from: query.to, to: query.from });
  };

  const search = (from = query.from, to = query.to) => {
    if (!from || !to) return setError('Select both cities');
    if (from === to) return setError('From and To cannot be the same');
    setError('');
    const q = { ...query, from, to };
    setQuery(q); addRecent(q); resetFlow();
    navigation.navigate('SearchResults');
  };

  const dates = Array.from({ length: 7 }).map((_, i) => today(i));
  const filtered = cities.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={gradient.colors as unknown as string[]} locations={gradient.locations as unknown as number[]} start={gradient.start} end={gradient.end}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Hi {user?.name?.split(' ')[0] ?? 'Traveller'} 👋</Text>
              <Text style={styles.brand} accessibilityRole="header">Select Your Destiny</Text>
            </View>
            <IconButton icon="notifications-outline" label="Notifications" color="#fff" onPress={() => navigation.navigate('Notifications')} />
            <IconButton icon="headset-outline" label="Support" color="#fff" onPress={() => navigation.navigate('Support')} />
          </View>
        </LinearGradient>

        {/* Search card */}
        <Card style={styles.searchCard}>
          <View>
            <CityField label="From" icon="radio-button-on" value={query.from} onPress={() => { setFilter(''); setPicker('from'); }} />
            <View style={styles.sep} />
            <CityField label="To" icon="location" value={query.to} onPress={() => { setFilter(''); setPicker('to'); }} />
            <Animated.View style={[styles.swap, { transform: [{ rotate: swapRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
              <IconButton icon="swap-vertical" label="Swap from and to cities" color="#fff" onPress={swap} />
            </Animated.View>
          </View>

          <Text style={styles.label}>Journey date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates.map((d, i) => (
              <Chip key={d} label={i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : prettyDate(d)} selected={query.date === d}
                onPress={() => setQuery({ date: d, returnDate: query.returnDate && query.returnDate <= d ? undefined : query.returnDate })} />
            ))}
          </ScrollView>

          <Text style={styles.label}>Return date (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label="One way" selected={!query.returnDate} onPress={() => setQuery({ returnDate: undefined })} />
            {[1, 2, 3, 5, 7].map((n) => {
              const d = addDays(query.date, n);
              return <Chip key={d} label={prettyDate(d)} selected={query.returnDate === d} onPress={() => setQuery({ returnDate: d })} />;
            })}
          </ScrollView>

          <View style={styles.paxRow}>
            <Text style={[styles.label, { marginTop: 0 }]}>Passengers</Text>
            <View style={styles.stepper}>
              <IconButton icon="remove-circle-outline" label="Decrease passengers" color={colors.primary} onPress={() => setQuery({ passengers: Math.max(1, query.passengers - 1) })} />
              <Text style={styles.paxNum} accessibilityLabel={`${query.passengers} passengers`}>{query.passengers}</Text>
              <IconButton icon="add-circle-outline" label="Increase passengers" color={colors.primary} onPress={() => setQuery({ passengers: Math.min(6, query.passengers + 1) })} />
            </View>
          </View>

          <Text style={styles.label}>Bus type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {BUS_TYPES.map((t) => (
              <Chip key={t ?? 'ANY'} label={t ? busTypeLabel[t] : 'Any'} selected={query.busType === t} onPress={() => setQuery({ busType: t })} />
            ))}
          </View>

          {!!error && <Text style={styles.error} accessibilityLiveRegion="assertive">{error}</Text>}
          <GradientButton title="Search Buses" icon="search" onPress={() => search()} style={{ marginTop: 8 }} />
        </Card>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle title="Quick cities" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {QUICK.map((c) => (
              <Chip key={c} label={c} icon="location-outline" onPress={() => setQuery(query.from === c ? { to: c } : c === query.to ? { from: c } : { to: c })} />
            ))}
          </View>

          {recent.length > 0 && (
            <>
              <SectionTitle title="Recent searches" />
              {recent.map((r, i) => (
                <Pressable key={`${r.from}-${r.to}-${i}`} onPress={() => { setQuery(r); search(r.from, r.to); }} style={styles.listRow}
                  accessibilityRole="button" accessibilityLabel={`Search again ${r.from} to ${r.to}`}>
                  <Ionicons name="time-outline" size={20} color={colors.muted} />
                  <Text style={styles.listTxt}>{r.from} → {r.to}</Text>
                  <Text style={styles.small}>{prettyDate(r.date)}</Text>
                </Pressable>
              ))}
            </>
          )}

          <SectionTitle title="Offers for you" action="View all" onAction={() => navigation.navigate('Offers')} />
        </View>
        <FlatList
          horizontal data={offers} keyExtractor={(o) => String(o.id)} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item, index }) => (
            <LinearGradient colors={index % 2 ? ['#6D28D9', '#F97316'] : ['#2563EB', '#6D28D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offer}>
              <Text style={styles.offerCode}>{item.code}</Text>
              <Text style={styles.offerDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.offerValid}>Valid till {item.validTill}</Text>
            </LinearGradient>
          )}
        />

        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle title="Popular routes" />
          {popular === null ? [0, 1, 2].map((i) => <Skeleton key={i} height={56} style={{ marginBottom: 8 }} rounded={radius.md} />) :
            popular.map((p) => (
              <Pressable key={`${p.from}-${p.to}`} style={styles.listRow} onPress={() => search(p.from, p.to)}
                accessibilityRole="button" accessibilityLabel={`${p.from} to ${p.to}, from ${inr(p.startingFare)}`}>
                <MaterialCommunityIcons name="bus" size={22} color={colors.primary} />
                <Text style={styles.listTxt}>{p.from} → {p.to}</Text>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>from {inr(p.startingFare)}</Text>
              </Pressable>
            ))}

          <SectionTitle title={`Nearby boarding points · ${query.from}`} />
          {['Central Bus Stand', 'Railway Station', 'Highway Junction'].map((n, i) => (
            <View key={n} style={styles.listRow} accessible accessibilityLabel={`${query.from} ${n}, ${(i + 1) * 1.4} kilometres away`}>
              <Ionicons name="navigate-circle-outline" size={22} color={colors.secondary} />
              <Text style={styles.listTxt}>{query.from} {n}</Text>
              <Text style={styles.small}>{((i + 1) * 1.4).toFixed(1)} km</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheet visible={!!picker} onClose={() => setPicker(null)} title={picker === 'from' ? 'Leaving from' : 'Going to'}>
        <TextInput placeholder="Search city" value={filter} onChangeText={setFilter} style={styles.search} accessibilityLabel="Search city" placeholderTextColor={colors.muted} />
        {filtered.map((c) => (
          <Pressable key={c.id} style={styles.listRow} accessibilityRole="button" accessibilityLabel={`${c.name}, ${c.state}`}
            onPress={() => { setQuery(picker === 'from' ? { from: c.name } : { to: c.name }); setPicker(null); }}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={styles.listTxt}>{c.name}</Text>
            <Text style={styles.small}>{c.state}</Text>
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

function CityField({ label, value, icon, onPress }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.cityField} accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'select city'}`}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={{ marginLeft: 12 }}>
        <Text style={styles.small}>{label}</Text>
        <Text style={styles.city}>{value || 'Select city'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 72, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  hello: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  brand: { color: '#fff', fontSize: 24, fontWeight: '900' },
  searchCard: { marginHorizontal: 16, marginTop: -56 },
  cityField: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  city: { fontSize: 18, fontWeight: '700', color: colors.text },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 32, marginRight: 56 },
  swap: { position: 'absolute', right: 0, top: 30, backgroundColor: colors.primary, borderRadius: 24 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 14, marginBottom: 8 },
  paxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  paxNum: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center', color: colors.text },
  error: { color: colors.danger, marginTop: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, backgroundColor: colors.card, borderRadius: radius.md, marginBottom: 8 },
  listTxt: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 12, color: colors.muted },
  offer: { width: 260, borderRadius: radius.lg, padding: 16, marginRight: 12, minHeight: 120 },
  offerCode: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  offerDesc: { color: '#fff', marginTop: 6 },
  offerValid: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 8 },
  search: { minHeight: touch.min, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 12, marginBottom: 10, color: colors.text },
});
