import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

// ── HAPTICS ──
export function zapHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function lightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function successHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// ── PULSE ── (zone card power surge)
export function createPulse(anim: Animated.Value) {
    return Animated.sequence([
      Animated.timing(anim, { toValue: 1.08, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(anim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1.04, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]);
  }

// ── ZAP ── (task complete lightning strike)
export function createZap(anim: Animated.Value) {
    return Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(anim, { toValue: 0.3, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
  }

// ── PRESS SCALE ── (button press feel)
export function pressIn(anim: Animated.Value) {
  Animated.spring(anim, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
}

export function pressOut(anim: Animated.Value) {
  Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
}

// ── WIN BOLT ── (bolt shoots up)
export function createWinBolt(translateY: Animated.Value, opacity: Animated.Value) {
  translateY.setValue(0);
  opacity.setValue(1);
  return Animated.parallel([
    Animated.timing(translateY, { toValue: -80, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]),
  ]);
}

// ── FLASH ── (screen flash on win)
export function createFlash(anim: Animated.Value) {
  return Animated.sequence([
    Animated.timing(anim, { toValue: 0.15, duration: 80, useNativeDriver: true }),
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
  ]);
}

// ── SKELETON PULSE ──
export function createSkeletonPulse(anim: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ])
  );
}

// ── FADE UP ── (screen entrance)
export function createFadeUp(opacity: Animated.Value, translateY: Animated.Value) {
  opacity.setValue(0);
  translateY.setValue(20);
  return Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
  ]);
}