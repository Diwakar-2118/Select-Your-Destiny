// Labelled text input with icon, error text and password toggle.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, touch } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  secure?: boolean;
}

export function Input({ label, icon, error, secure, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.box, focused && { borderColor: colors.primary }, !!error && { borderColor: colors.danger }]}>
        {icon && <Ionicons name={icon} size={20} color={colors.muted} style={{ marginRight: 8 }} />}
        <TextInput
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          accessibilityLabel={label ?? rest.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, style]}
          {...rest}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={12}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  box: {
    flexDirection: 'row', alignItems: 'center', minHeight: touch.min, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  eye: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
