// Notifications list; tap marks as read.
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, GradientHeader, Skeleton } from '../components';
import { colors, radius } from '../theme';
import { api } from '../api/client';
import { Notification } from '../types';

const iconFor: Record<Notification['type'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  BOOKING_CONFIRMED: { icon: 'checkmark-circle', color: colors.success },
  BUS_DELAYED: { icon: 'alert-circle', color: colors.warning },
  BUS_ARRIVED: { icon: 'bus', color: colors.primary },
  OFFER: { icon: 'gift', color: colors.accent },
  COUPON: { icon: 'pricetag', color: colors.secondary },
  PAYMENT_SUCCESS: { icon: 'card', color: colors.success },
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[] | null>(null);
  useEffect(() => { api.notifications().then(setItems).catch(() => setItems([])); }, []);

  const read = (n: Notification) => {
    if (n.read) return;
    api.markRead(n.id).catch(() => undefined);
    setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
  };
  const unread = items?.filter((n) => !n.read).length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <GradientHeader title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'} />
      {items === null ? <View style={{ padding: 16 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={72} style={{ marginBottom: 10 }} />)}</View> : (
        <FlatList
          data={items} keyExtractor={(n) => String(n.id)} contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="No notifications" />}
          renderItem={({ item: n }) => (
            <Pressable onPress={() => read(n)} accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
              style={[styles.item, !n.read && styles.unread]}>
              <Ionicons name={iconFor[n.type].icon} size={26} color={iconFor[n.type].color} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
              </View>
              {!n.read && <View style={styles.dot} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 64, backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  unread: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  title: { fontWeight: '800', color: colors.text },
  body: { color: colors.text, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
});
