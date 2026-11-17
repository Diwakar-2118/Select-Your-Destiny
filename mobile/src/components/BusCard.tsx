// Search result card showing every Trip field from the contract.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { colors, radius, shadow } from '../theme';
import { busTypeLabel, duration, inr } from '../utils';
import { AmenityIcon } from './AmenityIcon';

export function BusCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const discounted = trip.fare * (1 - trip.discountPercent / 100);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trip.operatorName} ${trip.busName}, departs ${trip.departureTime}, arrives ${trip.arrivalTime}, fare ${inr(discounted)}, ${trip.availableSeats} seats left`}
      accessibilityHint="Opens seat selection"
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.operator} numberOfLines={1}>{trip.operatorName}</Text>
          <Text style={styles.sub} numberOfLines={1}>{trip.busName} · {busTypeLabel[trip.busType]}{trip.ac ? ' · AC' : ''}</Text>
          <Text style={styles.busNo}>{trip.busNumber}</Text>
        </View>
        <View style={styles.rating}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={styles.ratingTxt}>{trip.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={[styles.sub, { textAlign: 'right' }]}>{trip.reviews} reviews</Text>

      <View style={[styles.row, { marginTop: 10 }]}>
        <View>
          <Text style={styles.time}>{trip.departureTime}</Text>
          <Text style={styles.sub}>{trip.fromCity}</Text>
        </View>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.sub}>{duration(trip.durationMins)}</Text>
          <View style={styles.line} />
          <Text style={styles.tiny}>{trip.journeyDate}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.time}>{trip.arrivalTime}</Text>
          <Text style={styles.sub}>{trip.toCity}</Text>
        </View>
      </View>

      <View style={[styles.row, { marginTop: 10 }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
          {trip.amenities.slice(0, 5).map((a) => <AmenityIcon key={a} amenity={a} />)}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {trip.discountPercent > 0 && <Text style={styles.strike}>{inr(trip.fare)}</Text>}
          <Text style={styles.fare}>{inr(discounted)}</Text>
        </View>
      </View>

      <View style={[styles.row, styles.footer]}>
        <Text style={[styles.seats, trip.availableSeats < 6 && { color: colors.danger }]}>
          {trip.availableSeats}/{trip.totalSeats} seats · {trip.windowSeats} window
        </Text>
        <Text style={styles.tiny}>{trip.boardingPoints.length} boarding · {trip.droppingPoints.length} dropping</Text>
      </View>
      {(trip.discountPercent > 0 || trip.couponCode) && (
        <View style={styles.offer}>
          <Ionicons name="pricetag" size={12} color={colors.accent} />
          <Text style={styles.offerTxt}>
            {trip.discountPercent > 0 ? `${trip.discountPercent}% OFF` : ''}{trip.couponCode ? `  Use ${trip.couponCode}` : ''}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  operator: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.muted },
  tiny: { fontSize: 11, color: colors.muted },
  busNo: { fontSize: 11, color: colors.secondary, marginTop: 2, fontWeight: '600' },
  rating: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  ratingTxt: { color: '#fff', fontWeight: '700', fontSize: 12, marginLeft: 3 },
  time: { fontSize: 20, fontWeight: '800', color: colors.text },
  line: { height: 2, width: '70%', backgroundColor: colors.border, marginVertical: 4 },
  fare: { fontSize: 20, fontWeight: '800', color: colors.primary },
  strike: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  footer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  seats: { fontSize: 12, fontWeight: '600', color: colors.success },
  offer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#FFF7ED', padding: 6, borderRadius: 8 },
  offerTxt: { fontSize: 12, color: colors.accent, fontWeight: '700', marginLeft: 4 },
});
