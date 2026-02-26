import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// ── FULL ZONE LIBRARY ──────────────────────────────────────────────
const allZones = [
  // Energy
  { id: 'deep-focus', emoji: '🔥', name: 'Deep Focus', desc: 'Uninterrupted work, hard thinking, no context-switching', category: 'Energy', color: '#4f52ff' },
  { id: 'flow', emoji: '🌊', name: 'Flow State', desc: 'Open-ended time for getting lost in complex or creative work', category: 'Energy', color: '#7b7eff' },
  { id: 'low-battery', emoji: '☁️', name: 'Low Battery', desc: 'Light tasks only — not the time for big decisions', category: 'Energy', color: '#5050a0' },
  // Goal
  { id: 'builder', emoji: '🏗', name: 'Builder Mode', desc: 'Creating, shipping, making progress on your main project', category: 'Goal', color: '#7af0c4' },
  { id: 'admin', emoji: '📥', name: 'Admin Hour', desc: 'Emails, logistics, scheduling — necessary but low-stakes', category: 'Goal', color: '#a0a2ff' },
  { id: 'learning', emoji: '📚', name: 'Learning Block', desc: 'Reading, courses, absorbing new knowledge intentionally', category: 'Goal', color: '#c47af0' },
  { id: 'strategy', emoji: '🧩', name: 'Strategy', desc: 'Big picture thinking — zoom out, connect the dots', category: 'Goal', color: '#f0d87a' },
  { id: 'communication', emoji: '💬', name: 'Communication', desc: 'Calls, messages, meetings — connect and align', category: 'Goal', color: '#7ab8f0' },
  // Life
  { id: 'present', emoji: '🤝', name: 'Present & Connected', desc: 'Family, friends, relationships — phone down, fully here', category: 'Life', color: '#f0a87a' },
  { id: 'creative', emoji: '🎨', name: 'Creative Exploration', desc: 'No output pressure — ideas, sketching, wandering thoughts', category: 'Life', color: '#f07ab8' },
  { id: 'movement', emoji: '🏃', name: 'Movement', desc: 'Exercise, walks, physical reset — body first', category: 'Life', color: '#7af0c4' },
  { id: 'meal', emoji: '🍽', name: 'Meal & Nourish', desc: 'Eating with intention — no screens, just fuel', category: 'Life', color: '#f0c87a' },
  { id: 'play', emoji: '🎮', name: 'Play', desc: 'Fun with no agenda — permission to enjoy yourself', category: 'Life', color: '#f07ab8' },
  { id: 'ritual', emoji: '🕯', name: 'Ritual', desc: 'Morning or evening routine — anchor your day', category: 'Life', color: '#c47af0' },
  // Recovery
  { id: 'wind-down', emoji: '🛁', name: 'Wind Down', desc: 'End-of-day decompression — protect this or it disappears', category: 'Recovery', color: '#c47af0' },
  { id: 'stillness', emoji: '🤫', name: 'Stillness', desc: 'Meditation, journaling, silence — active doing nothing', category: 'Recovery', color: '#a0a2ff' },
  { id: 'transition', emoji: '🔀', name: 'Transition Buffer', desc: 'The gap between modes — don\'t skip it, schedule it', category: 'Recovery', color: '#f5a623' },
  { id: 'deep-rest', emoji: '😴', name: 'Deep Rest', desc: 'Nap or full rest — your brain needs this more than you think', category: 'Recovery', color: '#5050a0' },
  { id: 'social-battery', emoji: '🔋', name: 'Social Battery Restore', desc: 'Recharge from people drain — alone time is productive too', category: 'Recovery', color: '#7ab8f0' },
  { id: 'gratitude', emoji: '🙏', name: 'Gratitude', desc: 'Reflection and appreciation — zoom out on what\'s good', category: 'Recovery', color: '#f0d87a' },
];

const sampleTasks: Record<string, string[]> = {
  'deep-focus': ['Finish product brief', 'Review investor deck', 'Write sprint goals'],
  'flow': ['Explore new feature ideas', 'Redesign onboarding flow', 'Write freely'],
  'low-battery': ['Reply to emails', 'Update calendar', 'Review notes'],
  'builder': ['Ship quiz screen', 'Fix navigation bug', 'Update Notion docs'],
  'admin': ['Reply to messages', 'Schedule this week', 'Pay invoices'],
  'learning': ['Read 20 pages', 'Watch course module', 'Take notes'],
  'strategy': ['Review quarterly goals', 'Map out next sprint', 'Think about the big picture'],
  'communication': ['Team standup', 'Reply to DMs', 'Schedule 1:1s'],
  'present': ['Call a friend', 'Family dinner', 'Put phone away'],
  'creative': ['Sketch app ideas', 'Journal', 'Explore Pinterest'],
  'movement': ['30 min walk', 'Gym session', 'Stretch'],
  'meal': ['Eat without screens', 'Cook something real', 'Hydrate'],
  'play': ['Play a game', 'Watch something fun', 'Do nothing productive'],
  'ritual': ['Morning pages', 'Make coffee intentionally', 'Set today\'s intention'],
  'wind-down': ['Journal today\'s wins', 'Plan tomorrow', 'Read fiction'],
  'stillness': ['10 min meditation', 'Breathwork', 'Sit quietly'],
  'transition': ['Close open tabs', 'Clear your desk', 'Take 3 deep breaths'],
  'deep-rest': ['Set a 20 min nap timer', 'Lie down, no phone', 'Rest without guilt'],
  'social-battery': ['Sit alone quietly', 'Walk without headphones', 'Recharge solo'],
  'gratitude': ['Write 3 things you\'re grateful for', 'Reflect on today', 'Appreciate one small thing'],
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function getZone(id: string) {
  return allZones.find(z => z.id === id) || allZones[0];
}

const categories = ['Energy', 'Goal', 'Life', 'Recovery'];

export default function DashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const suggestedIds: string[] = params.zones
    ? JSON.parse(params.zones as string)
    : ['deep-focus', 'builder', 'wind-down'];

  const [activeZoneId, setActiveZoneId] = useState(suggestedIds[0]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [showZoneSwitcher, setShowZoneSwitcher] = useState(false);
  const [showAllZones, setShowAllZones] = useState(false);
  const [userTasks, setUserTasks] = useState<string[]>([]);
  const [removedSampleTasks, setRemovedSampleTasks] = useState<string[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newTask, setNewTask] = useState('');

  // Timer
  const [timerDuration, setTimerDuration] = useState(45);
  const [timeRemaining, setTimeRemaining] = useState(45 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const intervalRef = useRef<any>(null);

  const zone = getZone(activeZoneId);
  const { color, emoji, name } = zone;

  const allTasks = [
    ...(sampleTasks[activeZoneId] || []).filter(
      (t: string) => !removedSampleTasks.includes(t)
    ),
    ...userTasks,
  ];

  // ── TASK FUNCTIONS ──
  function addTask() {
    if (newTask.trim() === '') return;
    setUserTasks([...userTasks, newTask.trim()]);
    setNewTask('');
    setShowInput(false);
  }

  function deleteTask(task: string) {
    if (userTasks.includes(task)) {
      setUserTasks(userTasks.filter(t => t !== task));
    } else {
      setRemovedSampleTasks([...removedSampleTasks, task]);
    }
    setCompletedTasks(completedTasks.filter(t => t !== task));
  }

  function toggleTask(task: string) {
    if (completedTasks.includes(task)) {
      setCompletedTasks(completedTasks.filter(t => t !== task));
    } else {
      setCompletedTasks([...completedTasks, task]);
    }
  }

  // ── TIMER FUNCTIONS ──
  useEffect(() => {
    if (timerRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setTimerRunning(false);
            setTimerFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  function startTimer(minutes: number) {
    clearInterval(intervalRef.current);
    setTimerDuration(minutes);
    setTimeRemaining(minutes * 60);
    setTimerRunning(true);
    setTimerFinished(false);
    setShowTimerPicker(false);
    setCustomMinutes('');
  }

  function applyCustomTimer() {
    const mins = parseInt(customMinutes);
    if (isNaN(mins) || mins < 1 || mins > 480) return;
    startTimer(mins);
  }

  function toggleTimer() {
    if (timerFinished) { startTimer(timerDuration); return; }
    setTimerRunning(!timerRunning);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const timerProgress = (timerRunning || timerFinished)
    ? ((timerDuration * 60 - timeRemaining) / (timerDuration * 60)) * 100
    : 0;

  // ── ZONE SWITCH ──
  function switchZone(id: string) {
    setActiveZoneId(id);
    setCompletedTasks([]);
    setUserTasks([]);
    setRemovedSampleTasks([]);
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setTimerFinished(false);
    setTimeRemaining(timerDuration * 60);
    setShowZoneSwitcher(false);
    setShowAllZones(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* Greeting */}
        <Text style={styles.greeting}>{getGreeting()}, Jenny ⚡</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
          })}
        </Text>

        {/* ── ZONE CARD ── */}
        <View style={[styles.zoneCard, { borderColor: color }]}>
          <View style={styles.zoneCardTop}>
            <View>
              <Text style={styles.zoneCardLabel}>CURRENT ZONE</Text>
              <Text style={[styles.zoneCardName, { color }]}>
                {emoji}  {name.toUpperCase()}
              </Text>
              <Text style={styles.zoneDesc}>{zone.desc}</Text>
            </View>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                setShowZoneSwitcher(!showZoneSwitcher);
                setShowAllZones(false);
              }}>
              <Text style={styles.switchBtnText}>SWITCH</Text>
            </TouchableOpacity>
          </View>

          {/* Timer row */}
          <View style={styles.timerRow}>
            <TouchableOpacity
              style={[styles.timerBtn, { borderColor: color }]}
              onPress={toggleTimer}>
              <Text style={[styles.timerBtnText, { color }]}>
                {timerFinished ? '⚡ DONE' : timerRunning ? '⏸ PAUSE' : '▶ START'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timerDurationBtn}
              onPress={() => setShowTimerPicker(!showTimerPicker)}>
              <Text style={styles.timerTime}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerLabel}>tap to set</Text>
            </TouchableOpacity>
          </View>

          {/* Timer picker */}
          {showTimerPicker && (
            <View style={styles.timerPicker}>
              <Text style={styles.timerPickerLabel}>SET DURATION</Text>
              <View style={styles.timerPresets}>
                {[5, 10, 15, 25, 30, 45, 60, 90].map(min => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.preset,
                      timerDuration === min && {
                        borderColor: color,
                        backgroundColor: color + '22',
                      }
                    ]}
                    onPress={() => startTimer(min)}>
                    <Text style={[
                      styles.presetText,
                      timerDuration === min && { color }
                    ]}>
                      {min}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Custom input */}
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Custom (e.g. 37)"
                  placeholderTextColor="#5050a0"
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={applyCustomTimer}
                />
                <TouchableOpacity
                  style={[styles.customBtn, { backgroundColor: color }]}
                  onPress={applyCustomTimer}>
                  <Text style={styles.customBtnText}>SET</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: color + '22' }]}>
            <View style={[
              styles.progressFill,
              {
                backgroundColor: color,
                width: `${timerProgress}%`,
              }
            ]} />
          </View>
          <Text style={styles.progressLabel}>
            {timerFinished
              ? '⚡ Zone complete!'
              : timerRunning
              ? `${formatTime(timeRemaining)} remaining`
              : `${timerDuration} min zone — tap START`}
          </Text>
        </View>

        {/* ── ZONE SWITCHER ── */}
        {showZoneSwitcher && (
          <View style={styles.switcher}>
            <Text style={styles.switcherLabel}>YOUR ZONES</Text>
            {suggestedIds.map(id => {
              const z = getZone(id);
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.switcherItem,
                    activeZoneId === id && styles.switcherItemActive,
                  ]}
                  onPress={() => switchZone(id)}>
                  <Text style={styles.switcherEmoji}>{z.emoji}</Text>
                  <Text style={[
                    styles.switcherName,
                    activeZoneId === id && { color: '#e8e8ff' }
                  ]}>
                    {z.name.toUpperCase()}
                  </Text>
                  {activeZoneId === id && (
                    <Text style={[styles.activeTag, { color: z.color }]}>active</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Browse all zones */}
            <TouchableOpacity
              style={styles.browseAllBtn}
              onPress={() => setShowAllZones(!showAllZones)}>
              <Text style={styles.browseAllText}>
                {showAllZones ? '▲ Hide all zones' : '▼ Browse all zones'}
              </Text>
            </TouchableOpacity>

            {showAllZones && categories.map(cat => (
              <View key={cat}>
                <Text style={styles.categoryLabel}>{cat.toUpperCase()}</Text>
                {allZones.filter(z => z.category === cat).map(z => {
                  const isActive = activeZoneId === z.id;
                  const isSuggested = suggestedIds.includes(z.id);
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[
                        styles.switcherItem,
                        isActive && styles.switcherItemActive,
                      ]}
                      onPress={() => switchZone(z.id)}>
                      <Text style={styles.switcherEmoji}>{z.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.switcherName,
                          isActive && { color: '#e8e8ff' }
                        ]}>
                          {z.name.toUpperCase()}
                        </Text>
                        {isSuggested && (
                          <Text style={styles.suggestedTag}>★ your zone</Text>
                        )}
                      </View>
                      {isActive && (
                        <Text style={[styles.activeTag, { color: z.color }]}>active</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ── TASKS ── */}
        <View style={styles.tasksSection}>
          <Text style={styles.tasksLabel}>TODAY'S TASKS</Text>
          {allTasks.map((task: string) => {
            const done = completedTasks.includes(task);
            return (
              <TouchableOpacity
                key={task}
                style={[styles.task, done && styles.taskDone]}
                onPress={() => toggleTask(task)}>
                <View style={[
                  styles.taskDot,
                  done && { backgroundColor: color, borderColor: color }
                ]}>
                  {done && <Text style={styles.taskCheck}>✓</Text>}
                </View>
                <Text style={[styles.taskText, done && styles.taskTextDone]}>
                  {task}
                </Text>
                <TouchableOpacity onPress={() => deleteTask(task)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {showInput ? (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="What needs doing..."
                placeholderTextColor="#5050a0"
                value={newTask}
                onChangeText={setNewTask}
                onSubmitEditing={addTask}
                autoFocus
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.inputAdd, { backgroundColor: color }]} onPress={addTask}>
                <Text style={styles.inputAddText}>ADD</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addTask}
              onPress={() => setShowInput(true)}>
              <Text style={styles.addTaskText}>+ Add a task</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Check in */}
        <TouchableOpacity
          style={styles.checkinCard}
          onPress={() => router.push({
            pathname: '/checkin' as any,
            params: {
              completedTasks: JSON.stringify(completedTasks),
              activeZone: activeZoneId,
              zones: JSON.stringify(suggestedIds),
            },
          })}>
          <Text style={styles.checkinTitle}>END OF DAY CHECK-IN</Text>
          <Text style={styles.checkinSubtitle}>
            Tap to log how today went. Takes 60 seconds.
          </Text>
          <View style={styles.checkinArrow}>
            <Text style={styles.checkinArrowText}>LOG MY DAY →</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 28, paddingTop: 60, paddingBottom: 60 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#e8e8ff', letterSpacing: 0.5, marginBottom: 4 },
  date: { fontSize: 12, color: '#5050a0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 32 },

  // Zone card
  zoneCard: { backgroundColor: '#13132e', borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  zoneCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  zoneCardLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 6 },
  zoneCardName: { fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  zoneDesc: { fontSize: 11, color: '#5050a0', fontStyle: 'italic', maxWidth: 200 },
  switchBtn: { backgroundColor: '#1a1a40', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  switchBtnText: { fontSize: 10, letterSpacing: 2, color: '#5050a0', fontWeight: '600' },

  // Timer
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 },
  timerBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  timerBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  timerDurationBtn: { alignItems: 'flex-end' },
  timerTime: { fontSize: 32, fontWeight: '900', color: '#e8e8ff', letterSpacing: 1 },
  timerLabel: { fontSize: 9, color: '#5050a0', letterSpacing: 1, textTransform: 'uppercase' },
  timerPicker: { backgroundColor: '#1a1a40', borderRadius: 10, padding: 14, marginBottom: 14 },
  timerPickerLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 10 },
  timerPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  preset: { borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  presetText: { fontSize: 13, color: '#5050a0', fontWeight: '600' },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: { flex: 1, backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 8, padding: 10, fontSize: 14, color: '#e8e8ff' },
  customBtn: { borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  customBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 10, color: '#5050a0', letterSpacing: 1, textTransform: 'uppercase' },

  // Switcher
  switcher: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 16, marginBottom: 16 },
  switcherLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 12 },
  switcherItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  switcherItemActive: { backgroundColor: 'rgba(79,82,255,0.1)' },
  switcherEmoji: { fontSize: 18 },
  switcherName: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: '#5050a0' },
  activeTag: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  browseAllBtn: { marginTop: 8, paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2a2a5a' },
  browseAllText: { fontSize: 11, color: '#4f52ff', letterSpacing: 1 },
  categoryLabel: { fontSize: 9, letterSpacing: 2, color: '#2a2a5a', textTransform: 'uppercase', marginTop: 12, marginBottom: 6, marginLeft: 12 },
  suggestedTag: { fontSize: 9, color: '#f5a623', letterSpacing: 1, marginTop: 2 },

  // Tasks
  tasksSection: { marginBottom: 24 },
  tasksLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 14 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 10, padding: 14, marginBottom: 8 },
  taskDone: { opacity: 0.5 },
  taskDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#2a2a5a', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  taskCheck: { color: '#fff', fontSize: 10, fontWeight: '700' },
  taskText: { fontSize: 14, color: '#a0a2ff', flex: 1 },
  taskTextDone: { textDecorationLine: 'line-through', color: '#5050a0' },
  deleteBtn: { fontSize: 14, color: '#5050a0', paddingHorizontal: 4 },
  addTask: { padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 10, borderStyle: 'dashed', marginTop: 4 },
  addTaskText: { fontSize: 13, color: '#5050a0', letterSpacing: 1 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  input: { flex: 1, backgroundColor: '#13132e', borderWidth: 1, borderColor: '#4f52ff', borderRadius: 10, padding: 14, fontSize: 14, color: '#e8e8ff' },
  inputAdd: { borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  inputAddText: { color: '#ffffff', fontSize: 12, fontWeight: '700', letterSpacing: 2 },

  // Check in
  checkinCard: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 20 },
  checkinTitle: { fontSize: 10, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 8 },
  checkinSubtitle: { fontSize: 13, fontWeight: '300', color: '#a0a2ff', lineHeight: 20, marginBottom: 14 },
  checkinArrow: { borderTopWidth: 1, borderTopColor: '#2a2a5a', paddingTop: 12 },
  checkinArrowText: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#4f52ff' },
});