import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.bolt}>⚡</Text>
      <Text style={styles.wordmark}>VOLT</Text>
      <Text style={styles.tagline}>ZAP IN. LOCK IN. STAY IN.</Text>
      <Text style={styles.desc}>
        Your day has a natural rhythm.{'\n'}
        Volt maps your energy into zones.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/auth' as any)}>
        <Text style={styles.buttonText}>GET STARTED</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  bolt: { fontSize: 64, marginBottom: 16 },
  wordmark: { fontSize: 72, fontWeight: '900', letterSpacing: 8, color: '#a0a2ff', marginBottom: 8 },
  tagline: { fontSize: 11, letterSpacing: 4, color: '#5050a0', marginBottom: 32 },
  desc: { fontSize: 15, color: '#7b7eff', textAlign: 'center', lineHeight: 24, marginBottom: 48 },
  button: { backgroundColor: '#4f52ff', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  skip: { color: '#5050a0', fontSize: 12, letterSpacing: 1 },
});