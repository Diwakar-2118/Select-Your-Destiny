// Live tracking: map (react-native-maps, with a graceful fallback view), ETA, driver call, bus number. Polls every 10s.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, GradientButton, IconButton, Skeleton } from '../components';
import { colors, radius, shadow } from '../theme';
import { api } from '../api/client';
import { TrackingInfo } from '../types';
import { RootScreenProps } from '../navigation/types';

// Lazily load maps so the screen still works where the native module is unavailable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Maps: any = null;
try { Maps = require('react-native-maps'); } catch { Maps = null; }

export default function LiveTrackingScreen({ navigation, route }: RootScreenProps<'LiveTracking'>) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [mapFailed, setMapFailed] = useState(!Maps);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = () => api.tracking(bookingId).then(setInfo).catch(() => undefined);
    load();
    const id = setInterval(load, 10000);
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
    return () => clearInterval(id);
  }, [bookingId, pulse]);

  const MapView = Maps?.default;
  const Marker = Maps?.Marker;

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <View style={StyleSheet.absoluteFill}>
        {info && MapView && !mapFailed ? (
          <MapView
            style={StyleSheet.absoluteFill}
            region={{ latitude: info.lat, longitude: info.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            onMapReady={() => undefined}
            onError={() => setMapFailed(true)}
            accessibilityLabel="Map showing bus location"
          >
            <Marker coordinate={{ latitude: info.lat, longitude: info.lng }} title={info.busNumber} description={`${info.speedKmph} km/h`} />
          </MapView>
        ) : (
          // Fallback "map": stylised grid with a pulsing bus marker
          <View style={styles.fallback} accessible accessibilityLabel={info ? `Bus at ${info.lat.toFixed(4)}, ${info.lng.toFixed(4)}` : 'Loading location'}>
            {Array.from({ length: 12 }).map((_, i) => <View key={`h${i}`} style={[styles.gridH, { top: `${i * 9}%` }]} />)}
            {Array.from({ length: 8 }).map((_, i) => <View key={`v${i}`} style={[styles.gridV, { left: `${i * 14}%` }]} />)}
            <View style={styles.road} />
            <View style={styles.markerWrap}>
              <Animated.View style={[styles.pulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }] }]} />
              <View style={styles.marker}><MaterialCommunityIcons name="bus" size={22} color="#fff" /></View>
            </View>
            {info && <Text style={styles.coords}>{info.lat.toFixed(4)}, {info.lng.toFixed(4)}</Text>}
          </View>
        )}
      </View>

      <IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} style={[styles.back, { top: insets.top + 8 }]} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {!info ? (
          <>
            <Skeleton height={24} width="50%" />
            <Skeleton height={16} style={{ marginTop: 12 }} />
            <Skeleton height={48} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <View style={styles.row}>
              <View>
                <Text style={styles.small}>Arriving in</Text>
                <Text style={styles.eta} accessibilityLiveRegion="polite">{info.etaMins} min</Text>
              </View>
              <View style={styles.busNo}>
                <MaterialCommunityIcons name="bus" size={16} color={colors.primary} />
                <Text style={styles.busNoTxt}>{info.busNumber}</Text>
              </View>
            </View>
            <View style={[styles.row, { marginTop: 12 }]}>
              <Stat icon="speedometer-outline" label="Speed" value={`${info.speedKmph} km/h`} />
              <Stat icon="time-outline" label="Updated" value={new Date(info.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
            </View>
            <Card flat style={styles.driver}>
              <Ionicons name="person-circle" size={40} color={colors.secondary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{info.driverName}</Text>
                <Text style={styles.small}>Driver · {info.driverPhone}</Text>
              </View>
            </Card>
            <GradientButton title="Call driver" icon="call" onPress={() => Linking.openURL(`tel:${info.driverPhone}`)} />
          </>
        )}
      </View>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={[styles.small, { marginLeft: 4 }]}>{label}: </Text>
      <Text style={{ fontWeight: '700', color: colors.text }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: '#E0F2FE', overflow: 'hidden' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#BAE6FD' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#BAE6FD' },
  road: { position: 'absolute', top: '35%', left: -40, right: -40, height: 14, backgroundColor: '#fff', transform: [{ rotate: '-12deg' }] },
  markerWrap: { position: 'absolute', top: '32%', left: '45%', alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary },
  marker: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  coords: { position: 'absolute', top: '45%', alignSelf: 'center', color: colors.muted, fontSize: 12 },
  back: { position: 'absolute', left: 12, backgroundColor: '#fff', ...shadow },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { fontSize: 12, color: colors.muted },
  eta: { fontSize: 30, fontWeight: '900', color: colors.text },
  busNo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  busNoTxt: { fontWeight: '800', color: colors.primary, marginLeft: 4 },
  driver: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, backgroundColor: colors.card, borderWidth: 0 },
});
