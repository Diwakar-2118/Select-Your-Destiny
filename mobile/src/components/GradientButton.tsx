// Primary CTA: brand gradient + spring press-scale animation.
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradient, radius, touch } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'gradient' | 'outline' | 'ghost';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function GradientButton({ title, onPress, loading, disabled, icon, variant = 'gradient', style, accessibilityHint }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const inactive = disabled || loading;
  const txtColor = variant === 'gradient' ? colors.white : colors.primary;

  const content = (
    <>
      {loading ? <ActivityIndicator color={txtColor} /> : (
        <>
          {icon && <Ionicons name={icon} size={20} color={txtColor} style={{ marginRight: 8 }} />}
          <Text style={[styles.text, { color: txtColor }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity: disabled ? 0.55 : 1 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.96)}
        onPressOut={() => to(1)}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      >
        {variant === 'gradient' ? (
          <LinearGradient colors={gradient.colors as unknown as string[]} locations={gradient.locations as unknown as number[]} start={gradient.start} end={gradient.end} style={styles.btn}>
            {content}
          </LinearGradient>
        ) : (
          <Animated.View style={[styles.btn, variant === 'outline' && styles.outline]}>{content}</Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: touch.min + 4, borderRadius: radius.lg, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white },
  text: { fontSize: 16, fontWeight: '700' },
});
