import { zapHaptic, successHaptic, createPulse, createZap, createWinBolt, createFlash, createFadeUp } from '../lib/animations';
import SkeletonLoader from '../components/SkeletonLoader';
import { loadNotificationSettings, sendTimerDoneNotification } from '../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Walkthrough from './walkthrough';
import ZoneModal from '../components/ZoneModal';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { allZones, getZone, categories } from '../lib/zones';
import { supabase } from '../lib/supabase';
import { loadUserZones, saveUserZones, loadProfile, logZoneUsage } from '../lib/db';

const TODAY_PLAN_KEY = 'volt_today_plan';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function formatTimeLabel() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

type ZoneLog = {
  zoneId: string;
  startTime: string;
  startTimestamp: number;
  endTime: string | null;
  minutesSpent: number | null;
  timerStarted?: boolean;
};

export default function DashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [userName, setUserName] = useState('');
  const [appLoading, setAppLoading] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);

  // Plan state
  const [hasPlan, setHasPlan] = useState(false);
  const [myZones, setMyZones] = useState<string[]>([]);
  const [plannedTasksByZone, setPlannedTasksByZone] = useState<Record<string, string[]>>({});

  // Active zone
  const [activeZoneId, setActiveZoneId] = useState('');
  const [userTasks, setUserTasks] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  // Tasks
  const [showInput, setShowInput] = useState(false);
  const [newTask, setNewTask] = useState('');

  // Wins
  const [wins, setWins] = useState<string[]>([]);
  const [showWinInput, setShowWinInput] = useState(false);
  const [newWin, setNewWin] = useState('');

  // Zone log (timeline)
  const [zoneLog, setZoneLog] = useState<ZoneLog[]>([]);

  // Timer
  const [timerDuration, setTimerDuration] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customHours, setCustomHours] = useState('');

  const intervalRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;
  const zapAnims = useRef<Record<string, Animated.Value>>({}).current;
  const winBoltY = useRef(new Animated.Value(0)).current;
  const winBoltOpacity = useRef(new Animated.Value(0)).current;

  // ── LOAD ON MOUNT ──
  useEffect(() => {
    async function loadData() {
      const profile = await loadProfile();
      if (profile?.name) setUserName(profile.name);

      const todayKey = getTodayKey();
      const raw = await AsyncStorage.getItem(TODAY_PLAN_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.date === todayKey && saved.zones?.length > 0) {
          setHasPlan(true);
          setMyZones(saved.zones);
          setPlannedTasksByZone(saved.tasksByZone || {});
          const firstZone = saved.zones[0];
          setActiveZoneId(firstZone);
          setUserTasks(saved.tasksByZone?.[firstZone] || []);
          setZoneLog([{
            zoneId: firstZone,
            startTime: formatTimeLabel(),
            startTimestamp: Date.now(),
            endTime: null,
            minutesSpent: null,
          }]);
        }
      }

      if (params.newAccount === 'true') setShowWalkthrough(true);

      setAppLoading(false);
      createFadeUp(screenOpacity, screenTranslateY).start();
    }
    loadData();
  }, []);

  // ── HANDLE RETURNING FROM PLANDAY ──
  useFocusEffect(
    useCallback(() => {
      async function refresh() {
        const profile = await loadProfile();
        if (profile?.name) setUserName(profile.name);

        if (params.plannedTasks) {
          const tasksByZone = JSON.parse(params.plannedTasks as string);
          const zones = params.zones ? JSON.parse(params.zones as string) : Object.keys(tasksByZone);
          const firstZoneId = zones[0];

          if (firstZoneId) {
            const todayKey = getTodayKey();
            await AsyncStorage.setItem(TODAY_PLAN_KEY, JSON.stringify({
              date: todayKey,
              zones,
              tasksByZone,
            }));
            await saveUserZones(zones);

            setHasPlan(true);
            setMyZones(zones);
            setPlannedTasksByZone(tasksByZone);
            setActiveZoneId(firstZoneId);
            setUserTasks(tasksByZone[firstZoneId] || []);
            setCompletedTasks([]);
            setZoneLog([{
              zoneId: firstZoneId,
              startTime: formatTimeLabel(),
              startTimestamp: Date.now(),
              endTime: null,
              minutesSpent: null,
              timerStarted: false,
            }]);
          }
        }
      }
      refresh();
    }, [params.plannedTasks])
  );

  // ── WINS FROM COMPLETED TASKS ──
  useEffect(() => {
    setWins(prev => {
      const newWins = completedTasks.filter(task => !prev.includes(task));
      if (newWins.length > 0) {
        setTimeout(() => {
          successHaptic();
          createWinBolt(winBoltY, winBoltOpacity).start();
          createFlash(flashAnim).start();
        }, 100);
        return [...prev, ...newWins];
      }
      return prev;
    });
  }, [completedTasks]);

  // ── TIMER TICK ──
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

  // ── TIMER DONE NOTIFICATION ──
  useEffect(() => {
    if (timerFinished && activeZoneId) {
      const zone = getZone(activeZoneId);
      loadNotificationSettings().then(s => {
        if (s?.timerDone) sendTimerDoneNotification(zone.name);
      });
    }
  }, [timerFinished]);

  async function finishWalkthrough() {
    setShowWalkthrough(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ walkthrough_done: true }).eq('id', user.id);
    }
  }

  // ── ZONE SWITCH ──
  function switchZone(id: string) {
    const now = Date.now();
    setZoneLog(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && !last.endTime && last.timerStarted) {
        const mins = Math.round((now - last.startTimestamp) / 60000);
        updated[updated.length - 1] = { ...last, endTime: formatTimeLabel(), minutesSpent: mins };
        return [...updated, {
          zoneId: id, startTime: formatTimeLabel(), startTimestamp: now,
          endTime: null, minutesSpent: null, timerStarted: false,
        }];
      }
      if (last && !last.endTime) {
        updated[updated.length - 1] = { ...last, zoneId: id, startTime: formatTimeLabel(), startTimestamp: now };
        return updated;
      }
      return [...updated, {
        zoneId: id, startTime: formatTimeLabel(), startTimestamp: now,
        endTime: null, minutesSpent: null, timerStarted: false,
      }];
    });

    setActiveZoneId(id);
    setUserTasks(plannedTasksByZone[id] || []);
    setCompletedTasks([]);
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setTimerFinished(false);
    setTimeRemaining(timerDuration * 60);
  }

  // ── TASKS ──
  function addTask() {
    if (newTask.trim() === '') return;
    setUserTasks(prev => [...prev, newTask.trim()]);
    setNewTask('');
    setShowInput(false);
  }

  function deleteTask(task: string) {
    setUserTasks(prev => prev.filter(t => t !== task));
    setCompletedTasks(prev => prev.filter(t => t !== task));
  }

  function toggleTask(task: string) {
    if (completedTasks.includes(task)) {
      setCompletedTasks(prev => prev.filter(t => t !== task));
    } else {
      setCompletedTasks(prev => [...prev, task]);
      successHaptic();
      if (!zapAnims[task]) zapAnims[task] = new Animated.Value(0);
      createZap(zapAnims[task]).start();
    }
  }

  // ── WINS ──
  function addWin() {
    if (newWin.trim() === '') return;
    setWins(prev => [...prev, newWin.trim()]);
    setNewWin('');
    setShowWinInput(false);
    successHaptic();
    createWinBolt(winBoltY, winBoltOpacity).start();
    createFlash(flashAnim).start();
  }

  function deleteWin(win: string) {
    setWins(prev => prev.filter(w => w !== win));
  }

  // ── TIMER ──
  function startTimer(minutes: number) {
    clearInterval(intervalRef.current);
    setTimerDuration(minutes);
    setTimeRemaining(minutes * 60);
    setTimerRunning(false);
    setTimerFinished(false);
    setShowTimerPicker(false);
    setCustomMinutes('');
    setCustomHours('');
    if (activeZoneId) logZoneUsage(activeZoneId);
    zapHaptic();
    createPulse(pulseAnim).start();
  }

  function applyCustomTimer() {
    const hours = parseInt(customHours) || 0;
    const mins = parseInt(customMinutes) || 0;
    const total = hours * 60 + mins;
    if (total < 1 || total > 1440) return;
    startTimer(total);
  }

  function toggleTimer() {
    if (timerFinished) { startTimer(timerDuration); return; }
    if (!timerRunning) {
      zapHaptic();
      createPulse(pulseAnim).start();
      setZoneLog(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && !last.endTime) {
          updated[updated.length - 1] = { ...last, timerStarted: true };
        }
        return updated;
      });
    }
    setTimerRunning(prev => !prev);
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const timerProgress = (timerRunning || timerFinished)
    ? ((timerDuration * 60 - timeRemaining) / (timerDuration * 60)) * 100
    : 0;

  const timedZoneLog = zoneLog.filter(e => e.timerStarted || e.endTime);
  const totalTrackedMs = timedZoneLog.reduce((sum, entry) => {
    const ms = entry.endTime
      ? (entry.minutesSpent || 0) * 60000
      : Date.now() - entry.startTimestamp;
    return sum + ms;
  }, 0) || 1;

  if (appLoading) return <SkeletonLoader />;

  const zone = activeZoneId ? getZone(activeZoneId) : null;
  const { color = '#4f52ff', emoji = '⚡', name = '' } = zone || {};

  // ── UNPLANNED STATE ──
  const UnplannedState = () => (
    <View style={styles.unplannedContainer}>
      <View style={styles.unplannedContent}>
        <Text style={styles.unplannedBolt}>⚡</Text>
        <Text style={styles.unplannedTitle}>
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </Text>
        <Text style={styles.unplannedDate}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.unplannedSubtitle}>
          Your day is a blank slate.{'\n'}Dump your tasks and let Volt map your zones.
        </Text>
        <TouchableOpacity
          style={styles.unplannedCTA}
          onPress={() => router.push('/planday' as any)}>
          <Text style={styles.unplannedCTAText}>⚡ PLAN MY DAY</Text>
          <Text style={styles.unplannedCTASub}>Dump tasks → get zones assigned</Text>
        </TouchableOpacity>
        <View style={styles.unplannedDivider} />
        <View style={styles.unplannedQuickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/history' as any)}>
            <Text style={styles.quickLinkEmoji}>🔥</Text>
            <Text style={styles.quickLinkText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => setShowZoneModal(true)}>
            <Text style={styles.quickLinkEmoji}>🗂️</Text>
            <Text style={styles.quickLinkText}>Zones</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/settings' as any)}>
            <Text style={styles.quickLinkEmoji}>⚙️</Text>
            <Text style={styles.quickLinkText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push({
              pathname: '/checkin' as any,
              params: { completedTasks: '[]', wins: '[]', activeZone: '', zones: '[]', zoneLog: '[]' },
            })}>
            <Text style={styles.quickLinkEmoji}>🌙</Text>
            <Text style={styles.quickLinkText}>Check in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ── PLANNED STATE ──
  return (
    <Animated.View style={{ flex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}>
      {/* Win flash overlay */}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#f5a623', opacity: flashAnim, zIndex: 999,
      }} />
      <Animated.Text pointerEvents="none" style={{
        position: 'absolute', bottom: 100, alignSelf: 'center',
        fontSize: 48, zIndex: 1000, opacity: winBoltOpacity,
        transform: [{ translateY: winBoltY }],
      }}>⚡</Animated.Text>

      {!hasPlan ? <UnplannedState /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* ── HEADER ── */}
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>
                  {getGreeting()}{userName ? `, ${userName}` : ''} ⚡
                </Text>
                <Text style={styles.date}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              {/* Zones button */}
              <TouchableOpacity
                onPress={() => setShowZoneModal(true)}
                style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>🗂️</Text>
              </TouchableOpacity>
              {/* Settings button */}
              <TouchableOpacity
                onPress={() => router.push('/settings' as any)}
                style={[styles.headerBtn, { marginLeft: 8 }]}>
                <Text style={styles.headerBtnText}>⚙</Text>
              </TouchableOpacity>
            </View>

            {/* ── PLAN MY DAY BANNER ── */}
            <TouchableOpacity
              style={styles.planBanner}
              onPress={() => router.push('/planday' as any)}>
              <View style={styles.planBannerLeft}>
                <Text style={styles.planBannerLabel}>REPLAN YOUR DAY</Text>
                <Text style={styles.planBannerSub}>Dump new tasks → reassign zones</Text>
              </View>
              <Text style={styles.planBannerArrow}>⚡ →</Text>
            </TouchableOpacity>

            {/* ── ZONE SWITCHER PILLS ── */}
            {myZones.length > 0 && (
              <View style={styles.zonePills}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zonePillsInner}>
                  {myZones.map(id => {
                    const z = getZone(id);
                    const isActive = activeZoneId === id;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.zonePill, isActive && { backgroundColor: z.color, borderColor: z.color }]}
                        onPress={() => switchZone(id)}>
                        <Text style={styles.zonePillEmoji}>{z.emoji}</Text>
                        <Text style={[styles.zonePillText, isActive && { color: '#fff' }]}>
                          {z.name.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── ACTIVE ZONE CARD ── */}
            {zone && (
              <Animated.View style={[styles.zoneCard, { borderColor: color, transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.zoneCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.zoneCardLabel}>CURRENT ZONE</Text>
                    <Text style={[styles.zoneCardName, { color }]}>{emoji}  {name.toUpperCase()}</Text>
                    <Text style={styles.zoneDesc}>{zone.desc}</Text>
                  </View>
                </View>

                <View style={styles.timerRow}>
                  <TouchableOpacity
                    style={[styles.timerBtn, { borderColor: color, backgroundColor: timerRunning ? color + '22' : 'transparent' }]}
                    onPress={toggleTimer}>
                    <Text style={[styles.timerBtnText, { color }]}>
                      {timerFinished ? '⚡ DONE' : timerRunning ? '⏸ PAUSE' : '▶ START'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timerDurationBtn}
                    onPress={() => setShowTimerPicker(!showTimerPicker)}>
                    <Text style={styles.timerTime}>{formatTime(timeRemaining)}</Text>
                    <Text style={styles.timerLabel}>TAP TO SET</Text>
                  </TouchableOpacity>
                </View>

                {showTimerPicker && (
                  <View style={styles.timerPicker}>
                    <Text style={styles.timerPickerLabel}>SET DURATION</Text>
                    <View style={styles.timerPresets}>
                      {[5, 10, 15, 25, 30, 45, 60, 90, 120].map(min => (
                        <TouchableOpacity
                          key={min}
                          style={[styles.preset, timerDuration === min && { borderColor: color, backgroundColor: color + '22' }]}
                          onPress={() => startTimer(min)}>
                          <Text style={[styles.presetText, timerDuration === min && { color }]}>
                            {min >= 60 ? `${min / 60}h` : `${min}m`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.customRow}>
                      <TextInput
                        style={styles.customInput} placeholder="hr" placeholderTextColor="#5050a0"
                        value={customHours} onChangeText={setCustomHours}
                        keyboardType="numeric" returnKeyType="next" maxLength={2}
                      />
                      <Text style={styles.customSep}>h</Text>
                      <TextInput
                        style={styles.customInput} placeholder="min" placeholderTextColor="#5050a0"
                        value={customMinutes} onChangeText={setCustomMinutes}
                        keyboardType="numeric" returnKeyType="done"
                        onSubmitEditing={applyCustomTimer} maxLength={2}
                      />
                      <Text style={styles.customSep}>m</Text>
                      <TouchableOpacity style={[styles.customBtn, { backgroundColor: color }]} onPress={applyCustomTimer}>
                        <Text style={styles.customBtnText}>SET</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={[styles.progressTrack, { backgroundColor: color + '22' }]}>
                  <View style={[styles.progressFill, { backgroundColor: color, width: `${timerProgress}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {timerFinished ? '⚡ Zone complete!' : timerRunning ? `${formatTime(timeRemaining)} remaining` : `${timerDuration} min zone — tap START`}
                </Text>
              </Animated.View>
            )}

            {/* ── TASKS ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TODAY'S TASKS</Text>
              {userTasks.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No tasks for this zone yet — add one below.</Text>
                </View>
              )}
              {userTasks.map((task: string) => {
                const done = completedTasks.includes(task);
                return (
                  <TouchableOpacity
                    key={task}
                    style={[styles.task, done && styles.taskDone]}
                    onPress={() => toggleTask(task)}>
                    <Animated.View style={[
                      styles.taskDot,
                      done && { backgroundColor: color, borderColor: color },
                      zapAnims[task] && { transform: [{ scale: zapAnims[task].interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.5, 1] }) }] }
                    ]}>
                      {done && <Text style={styles.taskCheck}>✓</Text>}
                    </Animated.View>
                    <Text style={[styles.taskText, done && styles.taskTextDone]}>{task}</Text>
                    <TouchableOpacity onPress={() => deleteTask(task)}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
              {showInput ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input} placeholder="What needs doing..."
                    placeholderTextColor="#5050a0" value={newTask}
                    onChangeText={setNewTask} onSubmitEditing={addTask}
                    autoFocus returnKeyType="done"
                  />
                  <TouchableOpacity style={[styles.inputAdd, { backgroundColor: color }]} onPress={addTask}>
                    <Text style={styles.inputAddText}>ADD</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addTask} onPress={() => setShowInput(true)}>
                  <Text style={styles.addTaskText}>+ Add a task</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── WINS ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>TODAY'S WINS ⚡</Text>
                <Text style={styles.sectionHint}>{wins.length} logged</Text>
              </View>
              {wins.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Complete a task or add a win manually — every small thing counts. ⚡
                  </Text>
                </View>
              )}
              {wins.map((win, i) => (
                <View key={i} style={styles.winItem}>
                  <Text style={styles.winBolt}>⚡</Text>
                  <Text style={styles.winText}>{win}</Text>
                  <TouchableOpacity onPress={() => deleteWin(win)}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {showWinInput ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input} placeholder="What did you win today?"
                    placeholderTextColor="#5050a0" value={newWin}
                    onChangeText={setNewWin} onSubmitEditing={addWin}
                    autoFocus returnKeyType="done"
                  />
                  <TouchableOpacity style={[styles.inputAdd, { backgroundColor: '#f5a623' }]} onPress={addWin}>
                    <Text style={styles.inputAddText}>ADD</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addTask} onPress={() => setShowWinInput(true)}>
                  <Text style={styles.addTaskText}>+ Add a win</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── ZONE TIMELINE ── */}
            {timedZoneLog.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TODAY'S ZONE TIMELINE</Text>
                <View style={styles.timelineBar}>
                  {timedZoneLog.map((entry, i) => {
                    const ms = entry.endTime
                      ? (entry.minutesSpent || 0) * 60000
                      : Date.now() - entry.startTimestamp;
                    const pct = (ms / totalTrackedMs) * 100;
                    const z = getZone(entry.zoneId);
                    return (
                      <View key={i} style={[
                        styles.timelineSegment,
                        { flex: Math.max(pct, 4), backgroundColor: z.color, opacity: entry.endTime ? 0.5 : 1 }
                      ]} />
                    );
                  })}
                </View>
                {timedZoneLog.map((entry, i) => {
                  const z = getZone(entry.zoneId);
                  const isCurrent = !entry.endTime;
                  return (
                    <View key={i} style={styles.timelineEntry}>
                      <View style={[styles.timelineDot, { backgroundColor: z.color, opacity: isCurrent ? 1 : 0.5 }]} />
                      <View style={styles.timelineInfo}>
                        <Text style={[styles.timelineZoneName, { color: isCurrent ? z.color : '#5050a0' }]}>
                          {z.emoji} {z.name.toUpperCase()}
                          {isCurrent && <Text style={{ color: z.color }}> ● current</Text>}
                        </Text>
                        <Text style={styles.timelineTime}>
                          {entry.startTime}{entry.endTime ? ` → ${entry.endTime}` : ' → now'}
                          {entry.minutesSpent !== null && ` · ${entry.minutesSpent}m`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── BOTTOM ACTIONS ── */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => router.push('/history' as any)}>
                <Text style={styles.historyBtnText}>🔥 HISTORY & STREAKS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkinCard}
                onPress={() => router.push({
                  pathname: '/checkin' as any,
                  params: {
                    completedTasks: JSON.stringify(completedTasks),
                    wins: JSON.stringify(wins),
                    activeZone: activeZoneId,
                    zones: JSON.stringify(myZones),
                    zoneLog: JSON.stringify(zoneLog),
                  },
                })}>
                <Text style={styles.checkinTitle}>END OF DAY CHECK-IN</Text>
                <Text style={styles.checkinSubtitle}>Tap to log how today went. Takes 60 seconds.</Text>
                <View style={styles.checkinArrow}>
                  <Text style={styles.checkinArrowText}>LOG MY DAY →</Text>
                </View>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── ZONE MODAL OVERLAY ── */}
      <ZoneModal visible={showZoneModal} onClose={() => setShowZoneModal(false)} />

      {showWalkthrough && <Walkthrough onDone={finishWalkthrough} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 80 },

  // ── UNPLANNED STATE ──
  unplannedContainer: { flex: 1, backgroundColor: '#0a0a1e' },
  unplannedContent: { flex: 1, padding: 28, paddingTop: 80, alignItems: 'center', justifyContent: 'center' },
  unplannedBolt: { fontSize: 56, marginBottom: 16 },
  unplannedTitle: { fontSize: 26, fontWeight: '900', color: '#e8e8ff', textAlign: 'center', marginBottom: 6 },
  unplannedDate: { fontSize: 11, color: '#5050a0', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  unplannedSubtitle: { fontSize: 14, color: '#5050a0', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  unplannedCTA: {
    width: '100%', backgroundColor: '#4f52ff', borderRadius: 16,
    padding: 22, alignItems: 'center', marginBottom: 32,
    shadowColor: '#4f52ff', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  unplannedCTAText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 3, marginBottom: 6 },
  unplannedCTASub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  unplannedDivider: { width: '100%', height: 1, backgroundColor: '#13132e', marginBottom: 28 },
  unplannedQuickLinks: { flexDirection: 'row', gap: 12 },
  quickLink: { alignItems: 'center', gap: 6, padding: 14, backgroundColor: '#13132e', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a5a', flex: 1 },
  quickLinkEmoji: { fontSize: 20 },
  quickLinkText: { fontSize: 9, color: '#5050a0', letterSpacing: 1, fontWeight: '600' },

  // ── HEADER ──
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#e8e8ff', letterSpacing: 0.5, marginBottom: 4 },
  date: { fontSize: 11, color: '#5050a0', letterSpacing: 1, textTransform: 'uppercase' },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnText: { fontSize: 16, color: '#5050a0' },

  // ── PLAN BANNER ──
  planBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(79,82,255,0.08)', borderWidth: 1, borderColor: 'rgba(79,82,255,0.3)',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  planBannerLeft: { flex: 1 },
  planBannerLabel: { fontSize: 11, fontWeight: '700', color: '#4f52ff', letterSpacing: 2, marginBottom: 2 },
  planBannerSub: { fontSize: 11, color: '#5050a0' },
  planBannerArrow: { fontSize: 16, color: '#4f52ff', fontWeight: '700' },

  // ── ZONE PILLS ──
  zonePills: { marginBottom: 16 },
  zonePillsInner: { gap: 8, paddingRight: 4 },
  zonePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#13132e',
  },
  zonePillEmoji: { fontSize: 14 },
  zonePillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: '#5050a0' },

  // ── ZONE CARD ──
  zoneCard: { backgroundColor: '#13132e', borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 20 },
  zoneCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  zoneCardLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 6 },
  zoneCardName: { fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  zoneDesc: { fontSize: 11, color: '#5050a0', fontStyle: 'italic', lineHeight: 16 },

  // ── TIMER ──
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  timerBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  timerBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
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
  customSep: { fontSize: 14, color: '#5050a0', alignSelf: 'center' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 10, color: '#5050a0', letterSpacing: 1, textTransform: 'uppercase' },

  // ── SECTIONS ──
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 14 },
  sectionHint: { fontSize: 10, color: '#2a2a5a', letterSpacing: 1 },

  // ── TASKS ──
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
  emptyState: { borderWidth: 1, borderColor: '#2a2a5a', borderStyle: 'dashed', borderRadius: 10, padding: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 12, color: '#2a2a5a', textAlign: 'center', lineHeight: 18 },

  // ── WINS ──
  winItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(245,166,35,0.06)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)', borderRadius: 10, padding: 14, marginBottom: 8 },
  winBolt: { fontSize: 14 },
  winText: { fontSize: 14, color: '#f5a623', flex: 1, lineHeight: 20 },

  // ── TIMELINE ──
  timelineBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14, backgroundColor: '#1a1a40' },
  timelineSegment: { height: '100%' },
  timelineEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  timelineInfo: { flex: 1 },
  timelineZoneName: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  timelineTime: { fontSize: 10, color: '#5050a0', marginTop: 1 },

  // ── BOTTOM ACTIONS ──
  bottomActions: { gap: 12 },
  historyBtn: { borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 14, alignItems: 'center' },
  historyBtnText: { fontSize: 11, letterSpacing: 2, color: '#5050a0', fontWeight: '700' },
  checkinCard: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 20 },
  checkinTitle: { fontSize: 10, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 8 },
  checkinSubtitle: { fontSize: 13, fontWeight: '300', color: '#a0a2ff', lineHeight: 20, marginBottom: 14 },
  checkinArrow: { borderTopWidth: 1, borderTopColor: '#2a2a5a', paddingTop: 12 },
  checkinArrowText: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#4f52ff' },
});