import { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { pressIn, pressOut, lightHaptic } from '../lib/animations';

type Props = {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  haptic?: boolean;
};

export default function ZapButton({ onPress, children, style, haptic = true }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <TouchableWithoutFeedback
      onPressIn={() => { pressIn(scaleAnim); if (haptic) lightHaptic(); }}
      onPressOut={() => pressOut(scaleAnim)}
      onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}