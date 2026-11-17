// Offers & coupons grouped by category; copy code via Share sheet.
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Chip, EmptyState, GradientHeader, Skeleton } from '../components';
import { colors, radius, touch } from '../theme';
import { api } from '../api/client';
import { Coupon } from '../types';
import { inr } from '../utils';

const CATS: (Coupon['category'] | 'ALL')[] = ['ALL', 'FLAT', 'FESTIVAL', 'REFERRAL', 'CASHBACK'];
const GRADS: Record<Coupon['category'], [string, string]> = {
  FLAT: ['#2563EB', '#6D28D9'], FESTIVAL: ['#F97316', '#EC4899'], REFERRAL: ['#6D28D9', '#2563EB'], CASHBACK: ['#16A34A', '#2563EB'],
};

export default function OffersScreen() {
  const [items, setItems] = useState<Coupon[] | null>(null);
  const [cat, setCat] = useState<(typeof CATS)[number]>('ALL');
  useEffect(() => { api.offers().then(setItems).catch(() => setItems([])); }, []);
  const list = (items ?? []).filter((c) => c.active && (cat === 'ALL' || c.category === cat));

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <GradientHeader title="Offers" subtitle="Save more on every trip" back={false}>
        <FlatList horizontal data={CATS} keyExtractor={(c) => c} showsHorizontalScrollIndicator={false} style={{ marginTop: 10, paddingHorizontal: 8 }}
          renderItem={({ item }) => <Chip label={item[0] + item.slice(1).toLowerCase()} selected={cat === item} onPress={() => setCat(item)} />} />
      </GradientHeader>
      {items === null ? <View style={{ padding: 16 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} style={{ marginBottom: 12 }} rounded={16} />)}</View> : (
        <FlatList
          data={list} keyExtractor={(c) => String(c.id)} contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="pricetags-outline" title="No offers right now" />}
          renderItem={({ item: c }) => (
            <LinearGradient colors={GRADS[c.category]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cat}>{c.category}</Text>
                <Text style={styles.value}>{c.type === 'PERCENT' ? `${c.value}% OFF` : c.type === 'CASHBACK' ? `${inr(c.value)} CASHBACK` : `${inr(c.value)} OFF`}</Text>
              </View>
              <Text style={styles.desc}>{c.description}</Text>
              <Text style={styles.meta}>Min {inr(c.minAmount)} · Max {inr(c.maxDiscount)} · Valid till {c.validTill}</Text>
              <Pressable onPress={() => Share.share({ message: `Use code ${c.code} on Select Your Destiny: ${c.description}` })}
                accessibilityRole="button" accessibilityLabel={`Share coupon ${c.code}`} style={styles.code}>
                <Text style={styles.codeTxt}>{c.code}</Text>
                <Ionicons name="share-social-outline" size={18} color={colors.text} />
              </Pressable>
            </LinearGradient>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 16, marginBottom: 12 },
  cat: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  value: { color: '#fff', fontSize: 18, fontWeight: '900' },
  desc: { color: '#fff', fontSize: 15, marginTop: 8, fontWeight: '600' },
  meta: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 6 },
  code: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'flex-start', minHeight: touch.min, minWidth: 160, marginTop: 12, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.text },
  codeTxt: { fontWeight: '900', letterSpacing: 1.5, color: colors.text, marginRight: 8 },
});
