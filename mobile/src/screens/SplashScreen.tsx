// Animated splash: bus drives in, logo pops, tagline fades, loader bar fills, then routes by auth.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { gradient } from '../theme';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';

export default function SplashScreen({ navigation }: RootScreenProps<'Splash'>) {
  const { width } = useWindowDimensions();
  const { ready, user } = useAuth();
  const busX = useRef(new Animated.Value(-width)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logo, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.parallel([
        Animated.timing(busX, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(text, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
    Animated.timing(bar, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() => {
      done.current = true;
    });
  }, [busX, logo, text, bar]);

  // Navigate once both the animation finished and auth state is restored.
  useEffect(() => {
    const id = setInterval(() => {
      if (done.current && ready) {
        clearInterval(id);
        navigation.reset({ index: 0, routes: [{ name: user ? 'Main' : 'Login' }] });
      }
    }, 150);
    return () => clearInterval(id);
  }, [ready, user, navigation]);

  return (
    <LinearGradient colors={gradient.colors as unknown as string[]} locations={gradient.locations as unknown as number[]} start={gradient.start} end={gradient.end} style={styles.container}>
      <Animated.View style={[styles.logo, { transform: [{ scale: logo }] }]} accessible accessibilityLabel="Select Your Destiny logo">
        <MaterialCommunityIcons name="map-marker-path" size={56} color="#2563EB" />
      </Animated.View>
      <Animated.View style={{ opacity: text, alignItems: 'center' }}>
        <Text style={styles.name} accessibilityRole="header">Select Your Destiny</Text>
        <Text style={styles.tag}>Book Smart. Travel Comfortably.</Text>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: busX }], marginTop: 40 }}>
        <MaterialCommunityIcons name="bus-side" size={72} color="#fff" />
      </Animated.View>
      <View style={styles.road} />
      <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Loading">
        <Animated.View style={[styles.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 104, height: 104, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  name: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  tag: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 6 },
  road: { width: '80%', height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', marginTop: 4 },
  track: { position: 'absolute', bottom: 70, width: '60%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
});
