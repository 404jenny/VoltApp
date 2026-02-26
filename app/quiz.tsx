import { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

const questions = [
  {
    id: 1,
    category: 'Goals',
    emoji: '🎯',
    text: "What's your biggest focus right now?",
    options: [
      "Building something new — a project, business, or idea",
      "Growing in my career or learning new skills",
      "Finding more balance between work and life",
      "Getting more consistent and less scattered",
    ],
  },
  {
    id: 2,
    category: 'Goals',
    emoji: '🎯',
    text: "How do you prefer to move through your work?",
    options: [
      "Deep and slow — one thing at a time, fully",
      "Fast and varied — I like switching between things",
      "Structured — I follow a plan and stick to it",
      "Fluid — I go where the energy takes me",
    ],
  },
  {
    id: 3,
    category: 'Energy',
    emoji: '⚡',
    text: "When do you feel sharpest during the day?",
    options: [
      "Morning — I peak early and fade after lunch",
      "Midday — I hit my stride after warming up",
      "Evening — I come alive when everyone else winds down",
      "It varies — no real pattern I've noticed",
    ],
  },
  {
    id: 4,
    category: 'Energy',
    emoji: '⚡',
    text: "What does a draining day look like for you?",
    options: [
      "Too many people and conversations",
      "Too many decisions with no clear direction",
      "No time to think or be alone",
      "Constant interruptions breaking my focus",
    ],
  },
  {
    id: 5,
    category: 'Work Style',
    emoji: '🧠',
    text: "Which of these sounds most like your ideal work block?",
    options: [
      "2 hours alone, deep in one hard problem",
      "Quick wins — clearing my queue and getting organized",
      "Thinking big — strategy, vision, connecting dots",
      "Collaborating — calls, messages, alignment",
    ],
  },
  {
    id: 6,
    category: 'Work Style',
    emoji: '🧠',
    text: "How structured is your typical day?",
    options: [
      "Very structured — I time-block everything",
      "Loosely structured — I have anchors but stay flexible",
      "Mostly reactive — I respond to what comes up",
      "I'm trying to build more structure right now",
    ],
  },
  {
    id: 7,
    category: 'Life',
    emoji: '🌿',
    text: "Which life zones do you most neglect?",
    options: [
      "Rest and recovery — I run on empty too often",
      "Presence — I'm physically there but mentally elsewhere",
      "Movement and physical health",
      "Play and creativity — I'm all work, no fun",
    ],
  },
  {
    id: 8,
    category: 'Life',
    emoji: '🌿',
    text: "What daily ritual matters most to you?",
    options: [
      "A grounding morning routine to start well",
      "Proper meals without screens or rushing",
      "A wind-down that helps me actually switch off",
      "A gratitude or reflection practice",
    ],
  },
  {
    id: 9,
    category: 'Recovery',
    emoji: '🌙',
    text: "How do you best recharge when you're drained?",
    options: [
      "Movement — a walk, gym, or physical reset",
      "Stillness — quiet, meditation, doing nothing",
      "Social connection — the right conversation refuels me",
      "Solo time — I just need to be alone for a bit",
    ],
  },
  {
    id: 10,
    category: 'Recovery',
    emoji: '🌙',
    text: "What does rest mean to you?",
    options: [
      "A proper nap or full physical rest",
      "Quiet time alone — no input, no output",
      "Something creative with zero pressure",
      "Being present with people I love",
    ],
  },
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

export default function QuizScreen() {
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const question = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
    } else {
      router.push({
        pathname: '/results' as any,
        params: { answers: JSON.stringify(newAnswers) },
      });
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <Text style={styles.wordmark}>VOLT</Text>
        <Text style={styles.counter}>
          {currentQ + 1} of {questions.length}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <Text style={styles.category}>
        {question.emoji}  {question.category.toUpperCase()}
      </Text>

      <Text style={styles.questionText}>{question.text}</Text>

      <View style={styles.options}>
        {question.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.option,
              selected === index && styles.optionSelected,
            ]}
            onPress={() => setSelected(index)}>
            <View style={[
              styles.dot,
              selected === index && styles.dotSelected,
            ]} />
            <Text style={[
              styles.optionText,
              selected === index && styles.optionTextSelected,
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, selected !== null && styles.buttonEnabled]}
        onPress={handleNext}
        disabled={selected === null}>
        <Text style={styles.buttonText}>
          {currentQ === questions.length - 1 ? 'SEE MY ZONES →' : 'NEXT →'}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 28, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  wordmark: { fontWeight: '900', fontSize: 20, letterSpacing: 4, color: '#a0a2ff' },
  counter: { fontSize: 11, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase' },
  progressTrack: { height: 3, backgroundColor: '#1a1a40', borderRadius: 2, marginBottom: 32, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4f52ff', borderRadius: 2 },
  category: { fontSize: 10, letterSpacing: 3, color: '#5050a0', textTransform: 'uppercase', marginBottom: 14 },
  questionText: { fontSize: 26, fontWeight: '800', color: '#e8e8ff', lineHeight: 34, marginBottom: 32, letterSpacing: 0.5 },
  options: { gap: 12, marginBottom: 32 },
  option: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionSelected: { borderColor: '#4f52ff', backgroundColor: 'rgba(79,82,255,0.12)' },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#2a2a5a', flexShrink: 0 },
  dotSelected: { backgroundColor: '#4f52ff', borderColor: '#4f52ff' },
  optionText: { fontSize: 14, color: '#a0a2ff', lineHeight: 20, flex: 1 },
  optionTextSelected: { color: '#e8e8ff' },
  button: { backgroundColor: '#2a2a5a', borderRadius: 12, padding: 16, alignItems: 'center', opacity: 0.5 },
  buttonEnabled: { backgroundColor: '#4f52ff', opacity: 1 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});