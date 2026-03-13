
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { saveDailyLog } from '../lib/db';
import { getZone } from '../lib/zones';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TODAY_PLAN_KEY = 'volt_today_plan';

const ratings = [
  { id: 'off',    emoji: '😴', label: 'Off',       desc: "Today was rough. That's okay.",  color: '#5050a0', message: 'Every off day is data. Rest up — tomorrow is a clean slate.' },
  { id: 'okay',   emoji: '😐', label: 'Okay',      desc: 'Got through it. Not my best.',   color: '#f5a623', message: 'Okay days keep the streak alive. Consistency beats intensity.' },
  { id: 'locked', emoji: '⚡', label: 'Locked in', desc: 'I was fully in it today.',       color: '#4f52ff', message: "That's the feeling. Remember it — that's what Volt is built for." },
];

function safeGetZone(id: string) {
  try { return getZone(id); }
  catch { return { id, emoji: '⚡', name: id, color: '#4f52ff', desc: '' }; }
}

export default function CheckInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const completedTasks: string[] = params.completedTasks
    ? JSON.parse(params.completedTasks as string) : [];
  const wins: string[] = params.wins
    ? JSON.parse(params.wins as string) : [];
  const zones: string[] = params.zones
    ? JSON.parse(params.zones as string) : [];
  const zoneLog: any[] = params.zoneLog
    ? JSON.parse(params.zoneLog as string) : [];

  // Only show zones where the timer was actually started
  const timedZoneLog = zoneLog.filter((e: any) => e.timerStarted || e.endTime);

  const rating = ratings.find(r => r.id === selectedRating);

  async function handleSubmit() {
    if (!selectedRating) return;
    await saveDailyLog({
      rating: selectedRating,
      note,
      wins,
      zoneLog: timedZoneLog,
      completedTasks,
      zones,
    });
    // Clear today's plan — dashboard resets to unplanned state
    await AsyncStorage.removeItem(TODAY_PLAN_KEY);
    setSubmitted(true);
  }

  function handleStartFresh() {
    router.replace('/dashboard' as any);
  }

  function handleAdjustDay() {
    // Go back to planday in "adjusting" mode — does NOT clear today's plan key
    router.replace({
      pathname: '/planday' as any,
      params: { adjusting: 'true' },
    });
  }

  // ── SUBMITTED STATE ──
  if (submitted && rating) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.doneZap}>⚡</Text>
        <Text style={styles.doneTitle}>DAY LOGGED.</Text>

        <View style={[styles.ratingBadge, { borderColor: rating.color, backgroundColor: rating.color + '15' }]}>
          <Text style={styles.ratingBadgeEmoji}>{rating.emoji}</Text>
          <Text style={[styles.ratingBadgeLabel, { color: rating.color }]}>
            {rating.label.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.message}>"{rating.message}"</Text>

        {note.trim().length > 0 && (
          <View style={styles.noteDisplay}>
            <Text style={styles.noteDisplayLabel}>YOUR NOTE</Text>
            <Text style={styles.noteDisplayText}>{note}</Text>
          </View>
        )}

        {/* Full day recap */}
        <View style={styles.recapCard}>
          <Text style={styles.recapTitle}>TODAY'S RECAP</Text>

          {timedZoneLog.length > 0 && (
            <>
              <Text style={styles.recapSubLabel}>ZONES USED</Text>
              {timedZoneLog.map((entry: any, i: number) => {
                const z = safeGetZone(entry.zoneId);
                return (
                  <View key={i} style={[styles.recapZoneRow, { borderColor: z.color + '30' }]}>
                    <Text style={styles.recapZoneEmoji}>{z.emoji}</Text>
                    <Text style={[styles.recapZoneName, { color: z.color }]}>{z.name.toUpperCase()}</Text>
                    {entry.minutesSpent != null && (
                      <Text style={[styles.recapZoneTime, { color: z.color }]}>{entry.minutesSpent}m</Text>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {completedTasks.length > 0 && (
            <>
              <Text style={[styles.recapSubLabel, { marginTop: 16 }]}>TASKS COMPLETED</Text>
              {completedTasks.map((task, i) => (
                <View key={i} style={styles.recapRow}>
                  <Text style={styles.recapCheck}>✓</Text>
                  <Text style={styles.recapRowText}>{task}</Text>
                </View>
              ))}
            </>
          )}

          {wins.length > 0 && (
            <>
              <Text style={[styles.recapSubLabel, { marginTop: 16 }]}>WINS ⚡</Text>
              {wins.map((win, i) => (
                <View key={i} style={styles.recapRow}>
                  <Text style={[styles.recapCheck, { color: '#f5a623' }]}>⚡</Text>
                  <Text style={[styles.recapRowText, { color: '#f5a623' }]}>{win}</Text>
                </View>
              ))}
            </>
          )}

          {timedZoneLog.length === 0 && completedTasks.length === 0 && wins.length === 0 && (
            <Text style={styles.recapEmpty}>No activity logged today.</Text>
          )}
        </View>

        <Text style={styles.seeYou}>See you tomorrow. ⚡</Text>

        <TouchableOpacity style={styles.tomorrowBtn} onPress={handleStartFresh}>
          <Text style={styles.tomorrowBtnText}>START FRESH →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── CHECK IN FORM ──
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← BACK</Text>
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.zap}>🌙</Text>
        <Text style={styles.title}>END OF DAY.</Text>
        <Text style={styles.subtitle}>60 seconds. How did today go?</Text>

        {/* Today's summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TODAY AT A GLANCE</Text>

          {timedZoneLog.length > 0 ? (
            <>
              <Text style={styles.summarySubLabel}>ZONES USED</Text>
              {timedZoneLog.map((entry: any, i: number) => {
                const z = safeGetZone(entry.zoneId);
                return (
                  <View key={i} style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>{z.emoji} {z.name}</Text>
                    <Text style={[styles.summaryVal, { color: z.color }]}>
                      {entry.minutesSpent ? `${entry.minutesSpent}m` : 'active'}
                    </Text>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.summaryEmpty}>No timer sessions recorded today</Text>
          )}

          <Text style={[styles.summarySubLabel, { marginTop: 12 }]}>TASKS COMPLETED</Text>
          {completedTasks.length === 0
            ? <Text style={styles.summaryEmpty}>None logged today</Text>
            : completedTasks.map((task, i) => (
              <View key={i} style={styles.summaryTask}>
                <Text style={styles.summaryTaskDot}>✓</Text>
                <Text style={styles.summaryTaskText}>{task}</Text>
              </View>
            ))
          }

          {wins.length > 0 && (
            <>
              <Text style={[styles.summarySubLabel, { marginTop: 12 }]}>WINS ⚡</Text>
              {wins.map((win, i) => (
                <View key={i} style={styles.summaryTask}>
                  <Text style={[styles.summaryTaskDot, { color: '#f5a623' }]}>⚡</Text>
                  <Text style={[styles.summaryTaskText, { color: '#f5a623' }]}>{win}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Adjust day — mid-day option */}
        <TouchableOpacity style={styles.adjustBtn} onPress={handleAdjustDay}>
          <View style={styles.adjustLeft}>
            <Text style={styles.adjustTitle}>Need to adjust your day?</Text>
            <Text style={styles.adjustSub}>Replan tasks and zones without ending the day</Text>
          </View>
          <Text style={styles.adjustArrow}>→</Text>
        </TouchableOpacity>

        {/* Energy rating */}
        <Text style={styles.sectionLabel}>HOW DID TODAY FEEL?</Text>
        <View style={styles.ratingRow}>
          {ratings.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.ratingCard, selectedRating === r.id && { borderColor: r.color, backgroundColor: r.color + '15' }]}
              onPress={() => setSelectedRating(r.id)}>
              <Text style={styles.ratingEmoji}>{r.emoji}</Text>
              <Text style={[styles.ratingLabel, selectedRating === r.id && { color: r.color }]}>
                {r.label.toUpperCase()}
              </Text>
              {selectedRating === r.id && (
                <Text style={[styles.ratingDesc, { color: r.color }]}>{r.desc}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <Text style={styles.sectionLabel}>
          ANYTHING TO NOTE? <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.noteInput}
          placeholder="What worked, what didn't, how you felt..."
          placeholderTextColor="#5050a0"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, selectedRating && styles.submitBtnEnabled]}
          disabled={!selectedRating}
          onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>LOG MY DAY →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleStartFresh}>
          <Text style={styles.skipBtnText}>Skip for tonight</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 28, paddingTop: 52, paddingBottom: 60 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { fontSize: 11, letterSpacing: 2, color: '#4f52ff', fontWeight: '700' },

  zap: { fontSize: 36, marginBottom: 12 },
  title: { fontWeight: '900', fontSize: 40, letterSpacing: 1, color: '#e8e8ff', lineHeight: 44, marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '300', color: '#5050a0', marginBottom: 28 },

  summaryCard: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 18, marginBottom: 16 },
  summaryLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 12 },
  summarySubLabel: { fontSize: 8, letterSpacing: 2, color: '#2a2a5a', textTransform: 'uppercase', marginBottom: 8 },
  summaryEmpty: { fontSize: 12, color: '#2a2a5a', fontStyle: 'italic', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryKey: { fontSize: 12, color: '#5050a0' },
  summaryVal: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  summaryTask: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6 },
  summaryTaskDot: { fontSize: 11, color: '#7af0c4', marginTop: 1 },
  summaryTaskText: { fontSize: 12, color: '#7af0c4', flex: 1, lineHeight: 18 },

  adjustBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(245,166,35,0.06)', borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.25)', borderRadius: 12,
    padding: 16, marginBottom: 28,
  },
  adjustLeft: { flex: 1 },
  adjustTitle: { fontSize: 13, fontWeight: '700', color: '#f5a623', marginBottom: 3 },
  adjustSub: { fontSize: 11, color: '#5050a0' },
  adjustArrow: { fontSize: 16, color: '#f5a623', marginLeft: 12 },

  sectionLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 14 },
  optional: { color: '#2a2a5a', letterSpacing: 1 },

  ratingRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  ratingCard: { flex: 1, backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 14, alignItems: 'center' },
  ratingEmoji: { fontSize: 24, marginBottom: 6 },
  ratingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#5050a0', textAlign: 'center' },
  ratingDesc: { fontSize: 9, textAlign: 'center', marginTop: 6, lineHeight: 13, fontStyle: 'italic' },

  noteInput: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 16, fontSize: 14, color: '#e8e8ff', lineHeight: 22, minHeight: 100, marginBottom: 24 },

  submitBtn: { backgroundColor: '#2a2a5a', borderRadius: 12, padding: 16, alignItems: 'center', opacity: 0.4, marginBottom: 12 },
  submitBtnEnabled: { backgroundColor: '#4f52ff', opacity: 1 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  skipBtn: { alignItems: 'center', padding: 12 },
  skipBtnText: { fontSize: 12, color: '#5050a0', letterSpacing: 1 },

  // Done state
  doneZap: { fontSize: 48, marginBottom: 16, textAlign: 'center' },
  doneTitle: { fontWeight: '900', fontSize: 40, letterSpacing: 2, color: '#e8e8ff', textAlign: 'center', marginBottom: 24 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 24, justifyContent: 'center' },
  ratingBadgeEmoji: { fontSize: 24 },
  ratingBadgeLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  message: { fontSize: 15, fontStyle: 'italic', fontWeight: '300', color: '#a0a2ff', textAlign: 'center', lineHeight: 24, marginBottom: 28, paddingHorizontal: 8 },
  noteDisplay: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 16, marginBottom: 20 },
  noteDisplayLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 8 },
  noteDisplayText: { fontSize: 13, color: '#a0a2ff', lineHeight: 20, fontStyle: 'italic' },

  recapCard: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 18, marginBottom: 24 },
  recapTitle: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 16 },
  recapSubLabel: { fontSize: 8, letterSpacing: 2, color: '#2a2a5a', textTransform: 'uppercase', marginBottom: 10 },
  recapZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  recapZoneEmoji: { fontSize: 16 },
  recapZoneName: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  recapZoneTime: { fontSize: 12, fontWeight: '700' },
  recapRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  recapCheck: { fontSize: 11, color: '#7af0c4', marginTop: 1 },
  recapRowText: { fontSize: 12, color: '#7af0c4', flex: 1, lineHeight: 18 },
  recapEmpty: { fontSize: 12, color: '#2a2a5a', fontStyle: 'italic' },

  seeYou: { fontSize: 18, fontWeight: '700', color: '#e8e8ff', textAlign: 'center', marginBottom: 28, marginTop: 8 },
  tomorrowBtn: { backgroundColor: '#4f52ff', borderRadius: 12, padding: 16, alignItems: 'center' },
  tomorrowBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});