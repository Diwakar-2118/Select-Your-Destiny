import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Amenity } from '../types';
import { colors } from '../theme';

export const amenityMeta: Record<Amenity, { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }> = {
  CHARGING_PORT: { icon: 'power-plug', label: 'Charging' },
  WATER_BOTTLE: { icon: 'bottle-soda-classic', label: 'Water' },
  BLANKET: { icon: 'bed', label: 'Blanket' },
  LIVE_TRACKING: { icon: 'crosshairs-gps', label: 'Tracking' },
  CCTV: { icon: 'cctv', label: 'CCTV' },
  WIFI: { icon: 'wifi', label: 'WiFi' },
  READING_LIGHT: { icon: 'lightbulb-on-outline', label: 'Light' },
};

export function AmenityIcon({ amenity, showLabel, size = 16 }: { amenity: Amenity; showLabel?: boolean; size?: number }) {
  const m = amenityMeta[amenity];
  return (
    <View style={styles.wrap} accessible accessibilityLabel={m.label}>
      <MaterialCommunityIcons name={m.icon} size={size} color={colors.secondary} />
      {showLabel && <Text style={styles.label}>{m.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  label: { fontSize: 11, color: colors.muted, marginLeft: 3 },
});
