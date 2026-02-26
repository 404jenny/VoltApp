import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const allZones = [
  { id: 'deep-focus', emoji: '🔥', name: 'Deep Focus', desc: 'Uninterrupted work, hard thinking', category: 'Energy', color: '#4f52ff' },
  { id: 'flow', emoji: '🌊', name: 'Flow State', desc: 'Get lost in complex or creative work', category: 'Energy', color: '#7b7eff' },
  { id: 'low-battery', emoji: '☁️', name: 'Low Battery', desc: 'Light tasks only, be kind to yourself', category: 'Energy', color: '#5050a0' },
  { id: 'builder', emoji: '🏗', name: 'Builder Mode', desc: 'Creating, shipping, making progress', category: 'Goal', color: '#7af0c4' },
  { id: 'admin', emoji: '📥', name: 'Admin Hour', desc: 'Emails, logistics, scheduling', category: 'Goal', color: '#a0a2ff' },
  { id: 'learning', emoji: '📚', name: 'Learning Block', desc: 'Reading, courses, absorbing knowledge', category: 'Goal', color: '#c47af0' },
  { id: 'strategy', emoji: '🧩', name: 'Strategy', desc: 'Big picture thinking, connect the dots', category: 'Goal', color: '#f0d87a' },
  { id: 'communication', emoji: '💬', name: 'Communication', desc: 'Calls, messages, meetings', category: 'Goal', color: '#7ab8f0' },
  { id: 'present', emoji: '🤝', name: 'Present & Connected', desc: 'Phone down, fully here', category: 'Life', color: '#f0a87a' },
  { id: 'creative', emoji: '🎨', name: 'Creative Exploration', desc: 'No output pressure, just explore', category: 'Life', color: '#f07ab8' },
  { id: 'movement', emoji: '🏃', name: 'Movement', desc: 'Exercise, walks, physical reset', category: 'Life', color: '#7af0c4' },
  { id: 'meal', emoji: '🍽', name: 'Meal & Nourish', desc: 'Eating with intention, no screens', category: 'Life', color: '#f0c87a' },
  { id: 'play', emoji: '🎮', name: 'Play', desc: 'Fun with no agenda', category: 'Life', color: '#f07ab8' },
  { id: 'ritual', emoji: '🕯', name: 'Ritual', desc: 'Morning or evening routine', category: 'Life', color: '#c47af0' },
  { id: 'wind-down', emoji: '🛁', name: 'Wind Down', desc: 'End-of-day decompression', category: 'Recovery', color: '#c47af0' },
  { id: 'stillness', emoji: '🤫', name: 'Stillness', desc: 'Meditation, journaling, silence', category: 'Recovery', color: '#a0a2ff' },
  { id: 'transition', emoji: '🔀', name: 'Transition Buffer', desc: 'The gap between modes', category: 'Recovery', color: '#f5a623' },
  { id: 'deep-rest', emoji: '😴', name: 'Deep Rest', desc: 'Nap or full rest, no guilt', category: 'Recovery', color: '#5050a0' },
  { id: 'social-battery', emoji: '🔋', name: 'Social Battery Restore', desc: 'Recharge from people drain', category: 'Recovery', color: '#7ab8f0' },
  { id: 'gratitude', emoji: '🙏', name: 'Gratitude', desc: 'Reflection and appreciation', category: 'Recovery', color: '#f0d87a' },
];

const categories = ['Energy', 'Goal', 'Life', 'Recovery'];

export default function ZonePickerScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggleZone(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      if (selected.length >= 5) return;
      setSelected([...selected, id]);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.zap}>⚡</Text>
      <Text style={styles.title}>PICK YOUR{'\n'}ZONES.</Text>
      <Text style={styles.subtitle}>
        Browse all zones and pick 3–5 that fit your life right now.{'\n'}
        You can always change these later.
      </Text>

      {categories.map(cat => (
        <View key={cat}>
          <Text style={styles.catLabel}>{cat.toUpperCase()}</Text>
          {allZones.filter(z => z.category === cat).map(z => {
            const isSelected = selected.includes(z.id);
            return (
              <TouchableOpacity
                key={z.id}
                style={[
                  styles.card,
                  isSelected && { borderColor: z.color, backgroundColor: z.color + '12' }
                ]}
                onPress={() => toggleZone(z.id)}>
                <View style={styles.cardRow}>
                  <View style={styles.emojiBox}>
                    <Text style={styles.emoji}>{z.emoji}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.zoneName, isSelected && { color: '#e8e8ff' }]}>
                      {z.name.toUpperCase()}
                    </Text>
                    <Text style={styles.zoneDesc}>{z.desc}</Text>
                  </View>
                  <View style={[
                    styles.check,
                    isSelected && { backgroundColor: z.color, borderColor: z.color }
                  ]}>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <Text style={styles.hint}>
        <Text style={styles.hintCount}>{selected.length}</Text> of 5 selected
      </Text>

      <TouchableOpacity
        style={[styles.btn, selected.length >= 3 && styles.btnEnabled]}
        disabled={selected.length < 3}
        onPress={() => router.push({
          pathname: '/dashboard' as any,
          params: { zones: JSON.stringify(selected) },
        })}>
        <Text style={styles.btnText}>LOCK IN MY ZONES →</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 28, paddingTop: 60, paddingBottom: 60 },
  zap: { fontSize: 36, marginBottom: 12 },
  title: { fontWeight: '900', fontSize: 36, letterSpacing: 1, color: '#e8e8ff', lineHeight: 42, marginBottom: 12 },
  subtitle: { fontSize: 13, fontWeight: '300', color: '#5050a0', lineHeight: 20, marginBottom: 32 },
  catLabel: { fontSize: 9, letterSpacing: 3, color: '#2a2a5a', textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },
  card: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiBox: { width: 40, height: 40, backgroundColor: '#1a1a40', borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  zoneName: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#a0a2ff', marginBottom: 2 },
  zoneDesc: { fontSize: 11, color: '#5050a0', lineHeight: 15 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#2a2a5a', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hint: { textAlign: 'center', fontSize: 12, color: '#5050a0', fontStyle: 'italic', marginTop: 16, marginBottom: 20 },
  hintCount: { color: '#a0a2ff', fontStyle: 'normal', fontWeight: '600' },
  btn: { backgroundColor: '#2a2a5a', borderRadius: 12, padding: 16, alignItems: 'center', opacity: 0.4 },
  btnEnabled: { backgroundColor: '#4f52ff', opacity: 1 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});