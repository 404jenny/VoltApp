import { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const archetypes = [
    { id: 'deep-focus', emoji: '🔥', name: 'Deep Focus', desc: 'Uninterrupted work, hard thinking, no context-switching', category: 'Energy' },
    { id: 'flow', emoji: '🌊', name: 'Flow State', desc: 'Open-ended time for getting lost in complex or creative work', category: 'Energy' },
    { id: 'low-battery', emoji: '☁️', name: 'Low Battery', desc: 'Light tasks only — not the time for big decisions', category: 'Energy' },
    { id: 'builder', emoji: '🏗', name: 'Builder Mode', desc: 'Creating, shipping, making progress on your main project', category: 'Goal' },
    { id: 'admin', emoji: '📥', name: 'Admin Hour', desc: 'Emails, logistics, scheduling — necessary but low-stakes', category: 'Goal' },
    { id: 'learning', emoji: '📚', name: 'Learning Block', desc: 'Reading, courses, absorbing new knowledge intentionally', category: 'Goal' },
    { id: 'strategy', emoji: '🧩', name: 'Strategy', desc: 'Big picture thinking — zoom out, connect the dots', category: 'Goal' },
    { id: 'communication', emoji: '💬', name: 'Communication', desc: 'Calls, messages, meetings — connect and align', category: 'Goal' },
    { id: 'present', emoji: '🤝', name: 'Present & Connected', desc: 'Family, friends, relationships — phone down, fully here', category: 'Life' },
    { id: 'creative', emoji: '🎨', name: 'Creative Exploration', desc: 'No output pressure — ideas, sketching, wandering thoughts', category: 'Life' },
    { id: 'movement', emoji: '🏃', name: 'Movement', desc: 'Exercise, walks, physical reset — body first', category: 'Life' },
    { id: 'meal', emoji: '🍽', name: 'Meal & Nourish', desc: 'Eating with intention — no screens, just fuel', category: 'Life' },
    { id: 'play', emoji: '🎮', name: 'Play', desc: 'Fun with no agenda — permission to enjoy yourself', category: 'Life' },
    { id: 'ritual', emoji: '🕯', name: 'Ritual', desc: 'Morning or evening routine — anchor your day', category: 'Life' },
    { id: 'wind-down', emoji: '🛁', name: 'Wind Down', desc: 'End-of-day decompression — protect this or it disappears', category: 'Recovery' },
    { id: 'stillness', emoji: '🤫', name: 'Stillness', desc: 'Meditation, journaling, silence — active doing nothing', category: 'Recovery' },
    { id: 'transition', emoji: '🔀', name: 'Transition Buffer', desc: 'The gap between modes — don\'t skip it, schedule it', category: 'Recovery' },
    { id: 'deep-rest', emoji: '😴', name: 'Deep Rest', desc: 'Nap or full rest — your brain needs this more than you think', category: 'Recovery' },
    { id: 'social-battery', emoji: '🔋', name: 'Social Battery Restore', desc: 'Recharge from people drain — alone time is productive too', category: 'Recovery' },
    { id: 'gratitude', emoji: '🙏', name: 'Gratitude', desc: 'Reflection and appreciation — zoom out on what\'s good', category: 'Recovery' },
  ];

const scoringMap: Record<string, string[]> = {
    '0-0': ['builder', 'deep-focus', 'creative'],
    '0-1': ['learning', 'deep-focus', 'strategy'],
    '0-2': ['present', 'wind-down', 'movement'],
    '0-3': ['deep-focus', 'admin', 'transition'],
    '1-0': ['deep-focus', 'flow', 'stillness'],
    '1-1': ['admin', 'transition', 'low-battery'],
    '1-2': ['builder', 'admin', 'ritual'],
    '1-3': ['flow', 'creative', 'strategy'],
    '2-0': ['deep-focus', 'builder', 'ritual'],
    '2-1': ['flow', 'creative', 'learning'],
    '2-2': ['builder', 'creative', 'flow'],
    '2-3': ['transition', 'low-battery', 'admin'],
    '3-0': ['social-battery', 'stillness', 'wind-down'],
    '3-1': ['stillness', 'strategy', 'low-battery'],
    '3-2': ['deep-focus', 'stillness', 'transition'],
    '3-3': ['deep-focus', 'flow', 'builder'],
    '4-0': ['deep-focus', 'flow', 'builder'],
    '4-1': ['admin', 'transition', 'low-battery'],
    '4-2': ['strategy', 'learning', 'flow'],
    '4-3': ['communication', 'present', 'admin'],
    '5-0': ['deep-focus', 'builder', 'ritual'],
    '5-1': ['flow', 'transition', 'builder'],
    '5-2': ['communication', 'admin', 'low-battery'],
    '5-3': ['ritual', 'deep-focus', 'transition'],
    '6-0': ['deep-rest', 'wind-down', 'stillness'],
    '6-1': ['present', 'transition', 'social-battery'],
    '6-2': ['movement', 'ritual', 'wind-down'],
    '6-3': ['play', 'creative', 'flow'],
    '7-0': ['ritual', 'deep-focus', 'stillness'],
    '7-1': ['meal', 'transition', 'stillness'],
    '7-2': ['wind-down', 'ritual', 'stillness'],
    '7-3': ['gratitude', 'stillness', 'wind-down'],
    '8-0': ['movement', 'transition', 'wind-down'],
    '8-1': ['stillness', 'wind-down', 'deep-rest'],
    '8-2': ['present', 'social-battery', 'creative'],
    '8-3': ['social-battery', 'stillness', 'deep-rest'],
    '9-0': ['deep-rest', 'wind-down', 'low-battery'],
    '9-1': ['stillness', 'social-battery', 'gratitude'],
    '9-2': ['creative', 'play', 'flow'],
    '9-3': ['present', 'gratitude', 'wind-down'],
  };

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<string[]>([]);

  // Score archetypes from answers
  const answers = params.answers ? JSON.parse(params.answers as string) : [];
  const scores: Record<string, number> = {};
  archetypes.forEach(a => scores[a.id] = 0);

  answers.forEach((answerIndex: number, questionIndex: number) => {
    const key = `${questionIndex}-${answerIndex}`;
    const scored = scoringMap[key] || [];
    scored.forEach(id => { scores[id] = (scores[id] || 0) + 1; });
  });

  const sorted = [...archetypes].sort((a, b) => scores[b.id] - scores[a.id]);
  const topIds = sorted.slice(0, 5).map(a => a.id);

  function toggleArchetype(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      if (selected.length >= 5) return;
      setSelected([...selected, id]);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>

      {/* Header */}
      <Text style={styles.zap}>⚡</Text>
      <Text style={styles.title}>YOUR ZONES{'\n'}ARE READY.</Text>
      <Text style={styles.subtitle}>
        Based on your answers, we've suggested your best-fit zones below.{'\n'}
        <Text style={{ color: '#f5a623' }}>★ Starred ones are just suggestions</Text>
        {' '}— pick any 3–5 that feel right.{'\n'}
        You can always switch or add zones later from your dashboard.
      </Text>

      {/* Archetype list */}
      {sorted.map(archetype => {
        const isSuggested = topIds.includes(archetype.id) && scores[archetype.id] > 0;
        const isSelected = selected.includes(archetype.id);

        return (
          <TouchableOpacity
            key={archetype.id}
            style={[
              styles.card,
              isSuggested && styles.cardSuggested,
              isSelected && styles.cardSelected,
            ]}
            onPress={() => toggleArchetype(archetype.id)}>

            {isSuggested && (
              <Text style={styles.suggestedBadge}>★ suggested</Text>
            )}

            <View style={styles.cardRow}>
              <View style={styles.emojiBox}>
                <Text style={styles.emoji}>{archetype.emoji}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.archName, isSelected && styles.archNameSelected]}>
                  {archetype.name.toUpperCase()}
                </Text>
                <Text style={styles.archDesc}>{archetype.desc}</Text>
                <Text style={styles.archCategory}>{archetype.category}</Text>
              </View>
              <View style={[styles.check, isSelected && styles.checkSelected]}>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </View>

          </TouchableOpacity>
        );
      })}

      {/* Selection count */}
      <Text style={styles.selectionHint}>
        <Text style={styles.selectionCount}>{selected.length}</Text> of 5 zones selected
      </Text>

    {/* Lock in button */}
    <TouchableOpacity
        style={[styles.button, selected.length >= 3 && styles.buttonEnabled]}
        disabled={selected.length < 3}
        onPress={() => {
          router.push({
            pathname: '/dashboard' as any,
            params: { zones: JSON.stringify(selected) },
          });
        }}>
        <Text style={styles.buttonText}>START WITH THESE ZONES →</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1e',
  },
  content: {
    padding: 28,
    paddingTop: 60,
    paddingBottom: 60,
  },
  zap: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontWeight: '900',
    fontSize: 36,
    letterSpacing: 1,
    color: '#e8e8ff',
    lineHeight: 42,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '300',
    color: '#5050a0',
    lineHeight: 20,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#13132e',
    borderWidth: 1,
    borderColor: '#2a2a5a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    position: 'relative',
  },
  cardSuggested: {
    borderColor: 'rgba(245,166,35,0.3)',
    backgroundColor: 'rgba(245,166,35,0.03)',
  },
  cardSelected: {
    borderColor: '#4f52ff',
    backgroundColor: 'rgba(79,82,255,0.1)',
  },
  suggestedBadge: {
    fontSize: 8,
    letterSpacing: 1,
    color: '#f5a623',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiBox: {
    width: 44,
    height: 44,
    backgroundColor: '#1a1a40',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  archName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#a0a2ff',
    marginBottom: 2,
  },
  archNameSelected: {
    color: '#e8e8ff',
  },
  archDesc: {
    fontSize: 11,
    color: '#5050a0',
    lineHeight: 16,
    marginBottom: 4,
  },
  archCategory: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#2a2a5a',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#2a2a5a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkSelected: {
    backgroundColor: '#4f52ff',
    borderColor: '#4f52ff',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  selectionHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#5050a0',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 20,
  },
  selectionCount: {
    color: '#a0a2ff',
    fontStyle: 'normal',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2a2a5a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    opacity: 0.4,
  },
  buttonEnabled: {
    backgroundColor: '#4f52ff',
    opacity: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
});