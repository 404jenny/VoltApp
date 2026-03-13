import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { createSkeletonPulse } from '../lib/animations';

export default function SkeletonLoader() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    createSkeletonPulse(pulseAnim).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.greeting, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.date, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.card, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.card, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.cardShort, { opacity: pulseAnim }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e', padding: 28, paddingTop: 60 },
  greeting: { height: 28, width: '60%', backgroundColor: '#13132e', borderRadius: 8, marginBottom: 10 },
  date: { height: 12, width: '40%', backgroundColor: '#13132e', borderRadius: 6, marginBottom: 32 },
  card: { height: 120, backgroundColor: '#13132e', borderRadius: 16, marginBottom: 12 },
  cardShort: { height: 80, backgroundColor: '#13132e', borderRadius: 16, marginBottom: 12 },
});