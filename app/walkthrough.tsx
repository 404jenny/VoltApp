import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const STEPS = [
  {
    emoji: '⚡',
    title: 'YOUR ACTIVE ZONE',
    desc: 'This is your current zone — the mode you\'re working in right now. Each zone has its own energy and purpose.',
    position: 'center',
  },
  {
    emoji: '▶',
    title: 'START YOUR TIMER',
    desc: 'Tap START to begin a focused session. Your zone usage gets tracked every time you start a timer.',
    position: 'center',
  },
  {
    emoji: '✓',
    title: 'TASKS & WINS',
    desc: 'Add tasks for your current zone. Complete them and they automatically become wins. ⚡',
    position: 'center',
  },
  {
    emoji: '✍️',
    title: 'END OF DAY CHECK-IN',
    desc: 'Before you wind down, tap LOG MY DAY to reflect on your session. Takes 60 seconds.',
    position: 'center',
  },
];

type Props = {
  onDone: () => void;
};

export default function Walkthrough({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    animateIn();
  }, [step]);

  function animateIn() {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onDone();
    }
  }

  const current = STEPS[step];

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={next} activeOpacity={1} />
      <Animated.View style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}>
        <View style={styles.stepDots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.desc}>{current.desc}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>
              {step < STEPS.length - 1 ? 'NEXT →' : 'GOT IT ⚡'}
            </Text>
          </TouchableOpacity>
          {step < STEPS.length - 1 && (
            <TouchableOpacity onPress={onDone}>
              <Text style={styles.skipText}>Skip tour</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  card: {
    backgroundColor: '#13132e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#4f52ff',
    padding: 32,
    paddingBottom: 48,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: '#2a2a5a',
  },
  dotActive: {
    backgroundColor: '#4f52ff',
    width: 20,
  },
  emoji: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#e8e8ff',
    textAlign: 'center',
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    color: '#5050a0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  actions: { gap: 10 },
  nextBtn: {
    backgroundColor: '#4f52ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  skipText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#2a2a5a',
    paddingVertical: 8,
  },
});