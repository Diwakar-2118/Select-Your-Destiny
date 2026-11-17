// Shared layout pieces: gradient header, bottom sheet, section title, icon button, empty state.
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradient, radius, touch } from '../theme';

export function GradientHeader({ title, subtitle, back = true, right, children }: {
  title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; children?: React.ReactNode;
}) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={gradient.colors as unknown as string[]} locations={gradient.locations as unknown as number[]}
      start={gradient.start} end={gradient.end}
      style={[styles.header, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.headerRow}>
        {back && nav.canGoBack() ? (
          <IconButton icon="arrow-back" label="Go back" onPress={() => nav.goBack()} color="#fff" />
        ) : <View style={{ width: 8 }} />}
        <View style={{ flex: 1, marginHorizontal: 4 }}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {right}
      </View>
      {children}
    </LinearGradient>
  );
}

export function IconButton({ icon, label, onPress, color = colors.text, size = 24, style }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color?: string; size?: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }, style]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTxt} accessibilityRole="header">{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} style={styles.sectionAction}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function BottomSheet({ visible, onClose, title, children, footer }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close sheet" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">{title}</Text>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>
        <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingBottom: 12 }}>{children}</ScrollView>
        {footer}
      </View>
    </Modal>
  );
}

export function EmptyState({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={56} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!body && <Text style={styles.emptyBody}>{body}</Text>}
    </View>
  );
}

export function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.kv}>
      <Text style={[styles.kvLabel, bold && { color: colors.text, fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.kvValue, bold && { fontSize: 17, fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 8, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  iconBtn: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionTxt: { fontSize: 17, fontWeight: '800', color: colors.text },
  sectionAction: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: 4 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptyBody: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  kvLabel: { color: colors.muted, fontSize: 14, flex: 1 },
  kvValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
});

export const layoutStyles = { radius };
