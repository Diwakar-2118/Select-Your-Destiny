// Shimmer placeholder: a translucent gradient band sweeps across a grey block.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

interface Props { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle>; rounded?: number; }

export function Skeleton({ width = '100%', height = 16, style, rounded = radius.sm }: Props) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(300);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [x]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-w, w] });
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityLabel="Loading"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.card, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.75)', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Card-shaped skeleton for bus result lists. */
export function BusCardSkeleton() {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
      <Skeleton width="60%" height={18} />
      <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        <Skeleton width={70} height={22} />
        <Skeleton width={60} height={12} />
        <Skeleton width={70} height={22} />
      </View>
      <Skeleton height={12} style={{ marginTop: 16 }} />
    </View>
  );
}
