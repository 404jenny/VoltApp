import ZoneModal from '../components/ZoneModal';
import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert, Platform, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { loadUserZones } from '../lib/db';
import {
  requestPermissions,
  loadNotificationSettings,
  saveNotificationSettings,
  scheduleEndOfDayReminder,
  scheduleStreakReminder,
  cancelNotification,
  formatTime12h,
  NotificationSettings,
  getDefaultSettings,
} from '../lib/notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(getDefaultSettings());
  const [editingEndOfDay, setEditingEndOfDay] = useState(false);
  const [editingStreak, setEditingStreak] = useState(false);
  const [tempTime, setTempTime] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const perms = await requestPermissions();
        setPermissionGranted(perms);
        const saved = await loadNotificationSettings();
        if (saved) setSettings(saved);
      }
      load();
    }, [])
  );

  async function updateSetting(key: keyof NotificationSettings, value: any) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveNotificationSettings(updated);

    // Schedule or cancel based on new value
    if (key === 'endOfDay') {
      if (value) await scheduleEndOfDayReminder(updated.endOfDayTime);
      else await cancelNotification('end-of-day');
    }
    if (key === 'streakReminder') {
      if (value) await scheduleStreakReminder(updated.streakReminderTime);
      else await cancelNotification('streak-reminder');
    }
    if (key === 'endOfDayTime') {
      if (updated.endOfDay) await scheduleEndOfDayReminder(value);
    }
    if (key === 'streakReminderTime') {
      if (updated.streakReminder) await scheduleStreakReminder(value);
    }
  }

  function validateAndSaveTime(key: 'endOfDayTime' | 'streakReminderTime') {
    const parts = tempTime.split(':');
    if (parts.length !== 2) return;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return;
    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    updateSetting(key, formatted);
    setEditingEndOfDay(false);
    setEditingStreak(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/' as any);
        }
      }
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await supabase.from('profiles').delete().eq('id', user.id);
            await supabase.auth.signOut();
            router.replace('/' as any);
          }
        }
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Permission banner */}
      {!permissionGranted && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={requestPermissions}>
          <Text style={styles.permissionText}>
            ⚠️ Notifications are disabled — tap to enable
          </Text>
        </TouchableOpacity>
      )}

      {/* ── ZONES ── */}
<View style={styles.section}>
  <Text style={styles.sectionLabel}>ZONES</Text>
  <View style={styles.card}>
    <TouchableOpacity
      style={styles.row}
      onPress={() => setShowZoneModal(true)}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowEmoji}>🗂</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Manage zones</Text>
          <Text style={styles.rowDesc}>Add, remove, or reorder your zones</Text>
        </View>
      </View>
      <Text style={styles.rowArrow}>→</Text>
    </TouchableOpacity>
  </View>
</View>

      {/* ── NOTIFICATIONS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>

          {/* Zone nudge */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>Zone nudges</Text>
              <Text style={styles.rowDesc}>Notified when a time window starts</Text>
            </View>
            <Switch
              value={settings.zoneNudge}
              onValueChange={v => updateSetting('zoneNudge', v)}
              trackColor={{ false: '#2a2a5a', true: '#4f52ff' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />

          {/* End of day */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>End-of-day check-in</Text>
              <Text style={styles.rowDesc}>Nudge to log your day</Text>
            </View>
            <Switch
              value={settings.endOfDay}
              onValueChange={v => updateSetting('endOfDay', v)}
              trackColor={{ false: '#2a2a5a', true: '#4f52ff' }}
              thumbColor="#fff"
            />
          </View>
          {settings.endOfDay && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>REMINDER TIME</Text>
              {editingEndOfDay ? (
                <View style={styles.timeEditRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={tempTime}
                    onChangeText={setTempTime}
                    placeholder="HH:MM"
                    placeholderTextColor="#5050a0"
                    keyboardType="numbers-and-punctuation"
                    autoFocus
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={styles.timeSaveBtn}
                    onPress={() => validateAndSaveTime('endOfDayTime')}>
                    <Text style={styles.timeSaveBtnText}>SAVE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingEndOfDay(false)}>
                    <Text style={styles.timeCancelBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setTempTime(settings.endOfDayTime); setEditingEndOfDay(true); }}>
                  <Text style={styles.timeValue}>{formatTime12h(settings.endOfDayTime)} →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.divider} />

          {/* Streak reminder */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>Streak reminder</Text>
              <Text style={styles.rowDesc}>Nudge if no zone session started today</Text>
            </View>
            <Switch
              value={settings.streakReminder}
              onValueChange={v => updateSetting('streakReminder', v)}
              trackColor={{ false: '#2a2a5a', true: '#4f52ff' }}
              thumbColor="#fff"
            />
          </View>
          {settings.streakReminder && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>REMINDER TIME</Text>
              {editingStreak ? (
                <View style={styles.timeEditRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={tempTime}
                    onChangeText={setTempTime}
                    placeholder="HH:MM"
                    placeholderTextColor="#5050a0"
                    keyboardType="numbers-and-punctuation"
                    autoFocus
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={styles.timeSaveBtn}
                    onPress={() => validateAndSaveTime('streakReminderTime')}>
                    <Text style={styles.timeSaveBtnText}>SAVE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingStreak(false)}>
                    <Text style={styles.timeCancelBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setTempTime(settings.streakReminderTime); setEditingStreak(true); }}>
                  <Text style={styles.timeValue}>{formatTime12h(settings.streakReminderTime)} →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.divider} />

          {/* Timer done */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>Timer complete</Text>
              <Text style={styles.rowDesc}>Alert when your zone timer finishes</Text>
            </View>
            <Switch
              value={settings.timerDone}
              onValueChange={v => updateSetting('timerDone', v)}
              trackColor={{ false: '#2a2a5a', true: '#4f52ff' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* ── ACCOUNT ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🚪</Text>
              <Text style={styles.rowTitle}>Sign out</Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🗑</Text>
              <Text style={[styles.rowTitle, { color: '#f07a7a' }]}>Delete account</Text>
            </View>
            <Text style={[styles.rowArrow, { color: '#f07a7a' }]}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.version}>Volt v0.1.0 — built with ⚡ by Jenny</Text>

      <ZoneModal visible={showZoneModal} onClose={() => setShowZoneModal(false)} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 28, paddingTop: 60, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  backBtn: { fontSize: 11, letterSpacing: 2, color: '#4f52ff', fontWeight: '700' },
  headerTitle: { fontSize: 20, letterSpacing: 4, color: '#e8e8ff', fontWeight: '900' },
  permissionBanner: { backgroundColor: 'rgba(240,122,122,0.1)', borderWidth: 1, borderColor: '#f07a7a', borderRadius: 10, padding: 14, marginBottom: 20 },
  permissionText: { fontSize: 12, color: '#f07a7a', textAlign: 'center', letterSpacing: 0.5 },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 10 },
  card: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowEmoji: { fontSize: 20, flexShrink: 0 },
  rowTitle: { fontSize: 14, color: '#a0a2ff', marginBottom: 2, fontWeight: '600' },
  rowDesc: { fontSize: 11, color: '#5050a0', lineHeight: 16 },
  rowArrow: { fontSize: 16, color: '#5050a0', marginLeft: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  toggleInfo: { flex: 1, marginRight: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  timeLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase' },
  timeValue: { fontSize: 13, color: '#4f52ff', fontWeight: '700', letterSpacing: 0.5 },
  timeEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { backgroundColor: '#1a1a40', borderWidth: 1, borderColor: '#4f52ff', borderRadius: 8, padding: 8, fontSize: 14, color: '#e8e8ff', width: 70, textAlign: 'center' },
  timeSaveBtn: { backgroundColor: '#4f52ff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  timeSaveBtnText: { fontSize: 10, color: '#fff', fontWeight: '700', letterSpacing: 1 },
  timeCancelBtn: { fontSize: 16, color: '#5050a0', padding: 4 },
  divider: { height: 1, backgroundColor: '#2a2a5a' },
  version: { textAlign: 'center', fontSize: 10, color: '#2a2a5a', letterSpacing: 1, marginTop: 16 },
});