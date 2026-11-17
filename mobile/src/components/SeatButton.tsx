// Single seat in the seat map. Colours follow the contract; selection bounces.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Seat } from '../types';
import { colors, touch } from '../theme';

interface Props { seat: Seat; selected: boolean; onToggle: (s: Seat) => void; }

export function seatColor(seat: Seat, selected: boolean) {
  if (selected) return colors.seatSelected;
  if (seat.status === 'BOOKED' || seat.status === 'LOCKED') return colors.seatBooked;
  if (seat.isLadies) return colors.seatLadies;
  return colors.seatAvailable;
}

export function SeatButton({ seat, selected, onToggle }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const unavailable = seat.status === 'BOOKED' || seat.status === 'LOCKED';
  const sleeper = seat.kind !== 'PUSH_BACK';
  const c = seatColor(seat, selected);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: selected ? 1.15 : 0.92, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  }, [selected, scale]);

  const label = `Seat ${seat.seatNumber}, ${seat.deck.toLowerCase()} deck${seat.isWindow ? ', window' : ''}${seat.isLadies ? ', ladies' : ''}, ₹${seat.price}, ${unavailable ? 'booked' : selected ? 'selected' : 'available'}`;

  return (
    <Pressable
      onPress={() => onToggle(seat)}
      disabled={unavailable}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: unavailable }}
      style={styles.hit}
    >
      <Animated.View
        style={[
          styles.seat,
          sleeper ? styles.sleeper : styles.seater,
          { borderColor: c, backgroundColor: selected ? c : unavailable ? '#E5E7EB' : `${c}1A`, transform: [{ scale }] },
        ]}
      >
        {sleeper ? <View style={[styles.pillow, { backgroundColor: selected ? '#fff' : c }]} /> : (
          <MaterialCommunityIcons name="seat-recline-normal" size={18} color={selected ? '#fff' : c} />
        )}
        <Text style={[styles.num, { color: selected ? '#fff' : unavailable ? colors.muted : colors.text }]} allowFontScaling={false}>
          {seat.seatNumber}
        </Text>
        {seat.isWindow && <View style={styles.window} accessibilityElementsHidden />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center', margin: 3 },
  seat: { borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  seater: { width: 48, height: 48 },
  sleeper: { width: 48, height: 88, justifyContent: 'space-between', paddingVertical: 6 },
  pillow: { width: 26, height: 6, borderRadius: 3 },
  num: { fontSize: 10, fontWeight: '700' },
  window: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#38BDF8' },
});
