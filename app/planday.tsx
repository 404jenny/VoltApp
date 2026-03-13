import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { allZones, getZone } from '../lib/zones';
import { saveUserZones } from '../lib/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_ZONES_KEY = 'custom_zones';

type TaskAssignment = {
  task: string;
  zoneId: string;
  confirmed: boolean;
};

type CustomZone = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  category: string;
  isCustom: true;
};

const COLOR_OPTIONS = [
  '#4f52ff', '#7af0c4', '#f5a623', '#f07ab8', '#c47af0',
  '#7ab8f0', '#f0d87a', '#ff6b6b', '#a0a2ff', '#5050a0',
];

const rules: { keywords: string[]; zoneId: string }[] = [
  { keywords: ['email', 'slack', 'message', 'call', 'meeting', 'reply', 'respond', 'text', 'chat', 'zoom'], zoneId: 'communication' },
  { keywords: ['read', 'book', 'article', 'course', 'learn', 'study', 'watch', 'listen', 'podcast', 'research'], zoneId: 'learning' },
  { keywords: ['write', 'draft', 'design', 'build', 'code', 'develop', 'create', 'make', 'ship', 'launch'], zoneId: 'builder' },
  { keywords: ['plan', 'strategy', 'review', 'goal', 'roadmap', 'decide', 'think', 'brainstorm', 'analyze'], zoneId: 'strategy' },
  { keywords: ['invoice', 'schedule', 'admin', 'logistics', 'calendar', 'appointment', 'pay', 'file', 'organize', 'inbox'], zoneId: 'admin' },
  { keywords: ['gym', 'workout', 'run', 'walk', 'exercise', 'stretch', 'yoga', 'swim', 'bike', 'sport', 'lift'], zoneId: 'movement' },
  { keywords: ['eat', 'lunch', 'dinner', 'breakfast', 'meal', 'cook', 'food', 'drink', 'coffee', 'snack'], zoneId: 'nourish' },
  { keywords: ['meditate', 'journal', 'breathe', 'quiet', 'reflect', 'gratitude', 'mindful'], zoneId: 'stillness' },
  { keywords: ['rest', 'nap', 'sleep', 'recharge', 'recover', 'relax'], zoneId: 'rest' },
  { keywords: ['family', 'friend', 'partner', 'date', 'social', 'hang out', 'visit'], zoneId: 'present' },
  { keywords: ['draw', 'paint', 'art', 'game', 'play', 'hobby', 'fun', 'creative', 'music', 'photo'], zoneId: 'creative-play' },
  { keywords: ['wind down', 'end of day', 'evening', 'bedtime', 'night routine', 'wrap up'], zoneId: 'wind-down' },
];

function assignZone(task: string): string {
  const lower = task.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.zoneId;
  }
  return 'deep-focus';
}

export default function PlanDayScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'assign' | 'confirm'>('input');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [customZones, setCustomZones] = useState<CustomZone[]>([]);

  // Inline new zone form state
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneEmoji, setNewZoneEmoji] = useState('⚡');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [newZoneColor, setNewZoneColor] = useState(COLOR_OPTIONS[0]);
  const [createForIndex, setCreateForIndex] = useState<number | null>(null);

  // Load custom zones on mount
  useState(() => {
    AsyncStorage.getItem(CUSTOM_ZONES_KEY).then(raw => {
      if (raw) setCustomZones(JSON.parse(raw));
    });
  });

  const allAvailableZones = [
    ...allZones,
    ...customZones.filter(cz => !allZones.find(z => z.id === cz.id)),
  ];

  function addTask() {
    const trimmed = taskInput.trim();
    if (!trimmed) return;
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    setTasks(prev => [...prev, ...lines]);
    setTaskInput('');
  }

  function removeTask(i: number) {
    setTasks(prev => prev.filter((_, idx) => idx !== i));
  }

  async function assignWithAI() {
    if (tasks.length === 0) return;
    setLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 600));
    const result = tasks.map(task => ({
      task,
      zoneId: assignZone(task),
      confirmed: false,
    }));
    setAssignments(result);
    setStep('assign');
    setLoading(false);
  }

  function swapZone(index: number, zoneId: string) {
    setAssignments(prev => prev.map((a, i) => i === index ? { ...a, zoneId } : a));
    setSwappingIndex(null);
    setShowCreateZone(false);
    setCreateForIndex(null);
  }

  function openCreateZone(index: number) {
    setCreateForIndex(index);
    setShowCreateZone(true);
    setNewZoneName('');
    setNewZoneEmoji('⚡');
    setNewZoneDesc('');
    setNewZoneColor(COLOR_OPTIONS[0]);
  }

  async function saveNewZone() {
    if (!newZoneName.trim()) return;
    const id = `custom-${Date.now()}`;
    const zone: CustomZone = {
      id,
      name: newZoneName.trim(),
      emoji: newZoneEmoji,
      color: newZoneColor,
      desc: newZoneDesc.trim() || `Custom zone: ${newZoneName.trim()}`,
      category: 'Work',
      isCustom: true,
    };
    const updated = [...customZones, zone];
    setCustomZones(updated);
    await AsyncStorage.setItem(CUSTOM_ZONES_KEY, JSON.stringify(updated));

    // Assign this new zone to the task
    if (createForIndex !== null) {
      swapZone(createForIndex, id);
    }
    setShowCreateZone(false);
    setCreateForIndex(null);
  }

  function confirmAll() {
    setAssignments(prev => prev.map(a => ({ ...a, confirmed: true })));
    setStep('confirm');
  }

  async function lockIn() {
    const usedZoneIds = [...new Set(assignments.map(a => a.zoneId))];
    await saveUserZones(usedZoneIds);

    const tasksByZone: Record<string, string[]> = {};
    assignments.forEach(a => {
      if (!tasksByZone[a.zoneId]) tasksByZone[a.zoneId] = [];
      tasksByZone[a.zoneId].push(a.task);
    });

    router.replace({
      pathname: '/dashboard',
      params: {
        plannedTasks: JSON.stringify(tasksByZone),
        zones: JSON.stringify(usedZoneIds),
      },
    });
  }

  function safeGetZone(id: string) {
    const custom = customZones.find(z => z.id === id);
    if (custom) return custom;
    try { return getZone(id); }
    catch { return { id, emoji: '⚡', name: id, color: '#4f52ff', desc: '' }; }
  }

  const byZone = assignments.reduce((acc, a) => {
    if (!acc[a.zoneId]) acc[a.zoneId] = [];
    acc[a.zoneId].push(a.task);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PLAN MY DAY</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* ── STEP 1: INPUT ── */}
        {step === 'input' && (
          <View>
            <Text style={styles.stepLabel}>STEP 1 OF 2</Text>
            <Text style={styles.heading}>What's on your plate today?</Text>
            <Text style={styles.subheading}>Dump everything you need to do. We'll figure out the best zone for each one.</Text>

            {tasks.map((task, i) => (
              <View key={i} style={styles.taskChip}>
                <Text style={styles.taskChipText}>{task}</Text>
                <TouchableOpacity onPress={() => removeTask(i)}>
                  <Text style={styles.taskChipRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Add a task..."
                placeholderTextColor="#5050a0"
                value={taskInput}
                onChangeText={setTaskInput}
                onSubmitEditing={addTask}
                returnKeyType="done"
                multiline
              />
              <TouchableOpacity style={styles.addBtn} onPress={addTask}>
                <Text style={styles.addBtnText}>ADD</Text>
              </TouchableOpacity>
            </View>

            {tasks.length > 0 && (
              <Text style={styles.taskCount}>{tasks.length} task{tasks.length > 1 ? 's' : ''} added</Text>
            )}

            {error !== '' && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, tasks.length === 0 && styles.primaryBtnDisabled]}
              disabled={tasks.length === 0 || loading}
              onPress={assignWithAI}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>⚡ ASSIGN ZONES →</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()}>
              <Text style={styles.skipBtnText}>Skip — I'll pick zones manually</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: ASSIGN ── */}
        {step === 'assign' && (
          <View>
            <Text style={styles.stepLabel}>STEP 2 OF 2</Text>
            <Text style={styles.heading}>Review your zone assignments</Text>
            <Text style={styles.subheading}>Tap the zone to swap it — or create a new one.</Text>

            {assignments.map((a, i) => {
              const z = safeGetZone(a.zoneId);
              const isSwapping = swappingIndex === i;
              return (
                <View key={i} style={[styles.assignCard, { borderColor: z.color + '40' }]}>
                  <Text style={styles.assignTask}>{a.task}</Text>
                  <TouchableOpacity
                    style={[styles.zoneTag, { backgroundColor: z.color + '18', borderColor: z.color }]}
                    onPress={() => {
                      setSwappingIndex(isSwapping ? null : i);
                      setShowCreateZone(false);
                      setCreateForIndex(null);
                    }}>
                    <Text style={[styles.zoneTagText, { color: z.color }]}>
                      {z.emoji} {z.name} {isSwapping ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {isSwapping && (
                    <View style={styles.zonePicker}>
                      <Text style={styles.zonePickerLabel}>SWAP TO</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {allAvailableZones.map(zone => (
                          <TouchableOpacity
                            key={zone.id}
                            style={[styles.zoneOption, { borderColor: zone.color }, a.zoneId === zone.id && { backgroundColor: zone.color + '22' }]}
                            onPress={() => swapZone(i, zone.id)}>
                            <Text style={styles.zoneOptionEmoji}>{zone.emoji}</Text>
                            <Text style={[styles.zoneOptionName, { color: zone.color }]}>{zone.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {/* Create new zone option */}
                      {showCreateZone && createForIndex === i ? (
                        <View style={styles.createZoneForm}>
                          <Text style={styles.createZoneTitle}>CREATE NEW ZONE</Text>

                          {/* Preview */}
                          <View style={[styles.createZonePreview, { borderColor: newZoneColor, backgroundColor: newZoneColor + '12' }]}>
                            <Text style={styles.createZonePreviewEmoji}>{newZoneEmoji}</Text>
                            <Text style={[styles.createZonePreviewName, { color: newZoneColor }]}>
                              {newZoneName || 'Zone name'}
                            </Text>
                          </View>

                          <View style={styles.createZoneRow}>
                            <TextInput
                              style={[styles.createZoneEmojiInput]}
                              value={newZoneEmoji}
                              onChangeText={setNewZoneEmoji}
                              maxLength={2}
                              placeholder="⚡"
                              placeholderTextColor="#5050a0"
                            />
                            <TextInput
                              style={[styles.createZoneNameInput]}
                              value={newZoneName}
                              onChangeText={setNewZoneName}
                              placeholder="Zone name"
                              placeholderTextColor="#5050a0"
                              autoFocus
                            />
                          </View>

                          <TextInput
                            style={styles.createZoneDescInput}
                            value={newZoneDesc}
                            onChangeText={setNewZoneDesc}
                            placeholder="Short description (optional)"
                            placeholderTextColor="#5050a0"
                          />

                          <View style={styles.colorRow}>
                            {COLOR_OPTIONS.map(c => (
                              <TouchableOpacity
                                key={c}
                                style={[styles.colorDot, { backgroundColor: c }, newZoneColor === c && styles.colorDotActive]}
                                onPress={() => setNewZoneColor(c)}
                              />
                            ))}
                          </View>

                          <View style={styles.createZoneActions}>
                            <TouchableOpacity
                              style={styles.createZoneCancelBtn}
                              onPress={() => { setShowCreateZone(false); setCreateForIndex(null); }}>
                              <Text style={styles.createZoneCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.createZoneSaveBtn, { backgroundColor: newZoneColor }, !newZoneName.trim() && { opacity: 0.3 }]}
                              disabled={!newZoneName.trim()}
                              onPress={saveNewZone}>
                              <Text style={styles.createZoneSaveText}>CREATE & ASSIGN →</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.createZoneBtn}
                          onPress={() => openCreateZone(i)}>
                          <Text style={styles.createZoneBtnText}>＋ Create a new zone</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity style={styles.primaryBtn} onPress={confirmAll}>
              <Text style={styles.primaryBtnText}>LOOKS GOOD — LOCK IN →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep('input')}>
              <Text style={styles.skipBtnText}>← Back to tasks</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: CONFIRM ── */}
        {step === 'confirm' && (
          <View>
            <Text style={styles.heading}>Your day is planned ⚡</Text>
            <Text style={styles.subheading}>Here's how your tasks map to zones. You're ready to go.</Text>

            {Object.entries(byZone).map(([zoneId, zoneTasks]) => {
              const z = safeGetZone(zoneId);
              return (
                <View key={zoneId} style={[styles.summaryZone, { borderColor: z.color + '40' }]}>
                  <View style={[styles.summaryZoneHeader, { backgroundColor: z.color + '18' }]}>
                    <Text style={[styles.summaryZoneName, { color: z.color }]}>{z.emoji} {z.name.toUpperCase()}</Text>
                    <Text style={[styles.summaryZoneCount, { color: z.color }]}>{zoneTasks.length} task{zoneTasks.length > 1 ? 's' : ''}</Text>
                  </View>
                  {zoneTasks.map((task, i) => (
                    <View key={i} style={styles.summaryTask}>
                      <View style={[styles.summaryDot, { backgroundColor: z.color }]} />
                      <Text style={styles.summaryTaskText}>{task}</Text>
                    </View>
                  ))}
                </View>
              );
            })}

            <TouchableOpacity style={styles.primaryBtn} onPress={lockIn}>
              <Text style={styles.primaryBtnText}>START MY DAY →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a1e' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  backBtn: { fontSize: 11, letterSpacing: 2, color: '#4f52ff', fontWeight: '700' },
  headerTitle: { fontSize: 14, letterSpacing: 4, color: '#e8e8ff', fontWeight: '900' },
  stepLabel: { fontSize: 9, letterSpacing: 3, color: '#4f52ff', textTransform: 'uppercase', marginBottom: 10 },
  heading: { fontSize: 26, fontWeight: '800', color: '#e8e8ff', marginBottom: 10, lineHeight: 34 },
  subheading: { fontSize: 13, color: '#5050a0', lineHeight: 20, marginBottom: 28 },
  taskChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 10, padding: 14, marginBottom: 8 },
  taskChipText: { fontSize: 14, color: '#a0a2ff', flex: 1 },
  taskChipRemove: { fontSize: 14, color: '#5050a0', paddingLeft: 8 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { flex: 1, backgroundColor: '#13132e', borderWidth: 1, borderColor: '#4f52ff', borderRadius: 10, padding: 14, fontSize: 14, color: '#e8e8ff', minHeight: 48 },
  addBtn: { backgroundColor: '#4f52ff', borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  taskCount: { fontSize: 11, color: '#5050a0', letterSpacing: 1, marginBottom: 24, textAlign: 'center' },
  errorText: { fontSize: 12, color: '#ff6b6b', textAlign: 'center', marginBottom: 16 },
  primaryBtn: { backgroundColor: '#4f52ff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.3 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  skipBtn: { alignItems: 'center', padding: 16 },
  skipBtnText: { fontSize: 13, color: '#5050a0' },

  // Assign cards
  assignCard: { backgroundColor: '#13132e', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 10 },
  assignTask: { fontSize: 14, color: '#e8e8ff', marginBottom: 10, lineHeight: 20 },
  zoneTag: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  zoneTagText: { fontSize: 12, fontWeight: '600' },
  zonePicker: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#2a2a5a', paddingTop: 12 },
  zonePickerLabel: { fontSize: 8, letterSpacing: 2, color: '#5050a0', marginBottom: 8 },
  zoneOption: { borderWidth: 1, borderRadius: 10, padding: 10, marginRight: 8, alignItems: 'center', minWidth: 70 },
  zoneOptionEmoji: { fontSize: 18, marginBottom: 4 },
  zoneOptionName: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, textAlign: 'center' },

  // Create zone inline
  createZoneBtn: {
    marginTop: 12, borderWidth: 1, borderColor: 'rgba(79,82,255,0.3)',
    borderRadius: 10, padding: 12, alignItems: 'center',
    backgroundColor: 'rgba(79,82,255,0.06)',
  },
  createZoneBtnText: { fontSize: 12, color: '#4f52ff', fontWeight: '600', letterSpacing: 1 },
  createZoneForm: {
    marginTop: 12, backgroundColor: '#0a0a1e', borderWidth: 1,
    borderColor: '#2a2a5a', borderRadius: 12, padding: 16,
  },
  createZoneTitle: { fontSize: 8, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 14 },
  createZonePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14,
  },
  createZonePreviewEmoji: { fontSize: 20 },
  createZonePreviewName: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  createZoneRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  createZoneEmojiInput: {
    width: 52, backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a',
    borderRadius: 8, padding: 10, fontSize: 20, color: '#e8e8ff', textAlign: 'center',
  },
  createZoneNameInput: {
    flex: 1, backgroundColor: '#13132e', borderWidth: 1, borderColor: '#4f52ff',
    borderRadius: 8, padding: 10, fontSize: 14, color: '#e8e8ff',
  },
  createZoneDescInput: {
    backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a',
    borderRadius: 8, padding: 10, fontSize: 13, color: '#e8e8ff', marginBottom: 12,
  },
  colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  createZoneActions: { flexDirection: 'row', gap: 8 },
  createZoneCancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a5a', alignItems: 'center' },
  createZoneCancelText: { fontSize: 12, color: '#5050a0' },
  createZoneSaveBtn: { flex: 2, padding: 12, borderRadius: 8, alignItems: 'center' },
  createZoneSaveText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#fff' },

  // Confirm
  summaryZone: { backgroundColor: '#13132e', borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  summaryZoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingHorizontal: 16 },
  summaryZoneName: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  summaryZoneCount: { fontSize: 10, fontWeight: '600' },
  summaryTask: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1a1a40' },
  summaryDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  summaryTaskText: { fontSize: 13, color: '#a0a2ff', flex: 1 },
});