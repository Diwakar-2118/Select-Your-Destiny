// Toggleable pill used for filters, quick cities, payment options etc.
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, touch } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, onPress, icon, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.75 }, style]}
    >
      {icon && <Ionicons name={icon} size={16} color={selected ? colors.white : colors.primary} style={{ marginRight: 6 }} />}
      <Text style={[styles.text, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.min - 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', flexDirection: 'row', alignItems: 'center',
    marginRight: 8, marginBottom: 8,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
