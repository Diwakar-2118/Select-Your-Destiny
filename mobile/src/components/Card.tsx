// Surface card. `glass` renders a frosted (expo-blur) card for use over gradients.
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, shadow } from '../theme';

interface Props { children: React.ReactNode; style?: StyleProp<ViewStyle>; glass?: boolean; flat?: boolean; }

export function Card({ children, style, glass, flat }: Props) {
  if (glass) {
    return (
      <BlurView intensity={40} tint="light" style={[styles.base, styles.glass, style]}>
        {children}
      </BlurView>
    );
  }
  return <View style={[styles.base, styles.solid, !flat && shadow, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, padding: 16, overflow: 'hidden' },
  solid: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  glass: { backgroundColor: colors.glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
});
