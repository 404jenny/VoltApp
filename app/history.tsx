import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { getZone } from '../lib/zones';
import { supabase } from '../lib/supabase';

type Usage = { zone_id: string; date: string };

async function loadZoneUsage(): Promise<Usage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('zone_usage')
    .select('zone_id, date')
    .eq('user_id', user.id)
    .order('date', { ascending: false });
  if (error || !data) return [];
  return data;
}

function computeStreaks(usage: Usage[]) {
  const byZone: Record<string, string[]> = {};
  usage.forEach(u => {
    if (!byZone[u.zone_id]) byZone[u.zone_id] = [];
    if (!byZone[u.zone_id].includes(u.date)) byZone[u.zone_id].push(u.date);
  });

  const results: Record<string, {
    totalDays: number;
    currentStreak: number;
    longestStreak: number;
    lastUsed: string;
  }> = {};

  Object.entries(byZone).forEach(([zoneId, dates]) => {
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let current = 0;
    let check = sorted[0] === today || sorted[0] === yesterday ? sorted[0] : null;
    if (check) {
      const checkDate = new Date(check);
      for (const date of sorted) {
        const diff = Math.round((checkDate.getTime() - new Date(date).getTime()) / 86400000);
        if (diff === 0) { current++; checkDate.setDate(checkDate.getDate() - 1); }
        else break;
      }
    }

    const asc = [...sorted].reverse();
    let longest = 1, running = 1;
    for (let i = 1; i < asc.length; i++) {
      const diff = Math.round((new Date(asc[i]).getTime() - new Date(asc[i - 1]).getTime()) / 86400000);
      if (diff === 1) { running++; longest = Math.max(longest, running); }
      else running = 1;
    }

    results[zoneId] = {
      totalDays: sorted.length,
      currentStreak: current,
      longestStreak: asc.length === 1 ? 1 : longest,
      lastUsed: sorted[0],
    };
  });

  return results;
}

function formatDate(dateStr: string) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(usage: Usage[]) {
  const groups: Record<string, string[]> = {};
  usage.forEach(u => {
    if (!groups[u.date]) groups[u.date] = [];
    if (!groups[u.date].includes(u.zone_id)) groups[u.date].push(u.zone_id);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function safeGetZone(id: string) {
  try { return getZone(id); }
  catch { return { id, emoji: '⚡', name: id, color: '#4f52ff', desc: '' }; }
}

// Matches the rating IDs saved by checkin.tsx: off / okay / locked
const ratingConfig: Record<string, { emoji: string; label: string; color: string }> = {
  'off':    { emoji: '😴', label: 'Off',        color: '#5050a0' },
  'okay':   { emoji: '😐', label: 'Okay',       color: '#f5a623' },
  'locked': { emoji: '⚡', label: 'Locked in',  color: '#4f52ff' },
};

export default function HistoryScreen() {
  const router = useRouter();
  const [usage, setUsage] = useState<Usage[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkins' | 'streaks' | 'history' | 'insights'>('checkins');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const data = await loadZoneUsage();
      setUsage(data);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: logs } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
        if (logs) setCheckins(logs);
      }
      setLoading(false);
    }
    load();
  }, []);

  const streaks = computeStreaks(usage);
  const byDate = groupByDate(usage);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingZap}>⚡</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HISTORY</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.tabs}>
        {(['checkins', 'streaks', 'history', 'insights'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'checkins' ? '🌙' : tab === 'streaks' ? '🔥' : tab === 'history' ? '📅' : '📊'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CHECK-INS TAB ── */}
      {activeTab === 'checkins' && (
        <>
          {checkins.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyZap}>🌙</Text>
              <Text style={styles.emptyTitle}>No check-ins yet</Text>
              <Text style={styles.emptyDesc}>Complete your first end-of-day check-in from the dashboard.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionHint}>Tap any entry to see the full day recap.</Text>
              {checkins.map((log, i) => {
                const zoneLog: any[] = log.zone_log || [];
                const wins: string[] = log.wins || [];
                const completedTasks: string[] = log.completed_tasks || [];
                const r = ratingConfig[log.rating];
                const isExpanded = expandedLog === i;

                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.checkinCard}
                    onPress={() => setExpandedLog(isExpanded ? null : i)}
                    activeOpacity={0.8}>

                    {/* Header row */}
                    <View style={styles.checkinHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkinDateLabel}>{formatDate(log.date)}</Text>
                        <Text style={styles.checkinDateFull}>
                          {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long', month: 'long', day: 'numeric'
                          })}
                        </Text>
                      </View>
                      <View style={styles.checkinMeta}>
                        {r && (
                          <View style={[styles.ratingPill, { backgroundColor: r.color + '18', borderColor: r.color + '50' }]}>
                            <Text style={styles.ratingPillEmoji}>{r.emoji}</Text>
                            <Text style={[styles.ratingPillLabel, { color: r.color }]}>{r.label.toUpperCase()}</Text>
                          </View>
                        )}
                        <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </View>

                    {/* Zone chips — always visible */}
                    {zoneLog.length > 0 && (
                      <View style={styles.checkinZones}>
                        {[...new Map(zoneLog.map((z: any) => [z.zoneId, z])).values()].map((entry: any, j) => {
                          const z = safeGetZone(entry.zoneId);
                          return (
                            <View key={j} style={[styles.zoneChip, { borderColor: z.color + '50', backgroundColor: z.color + '12' }]}>
                              <Text style={styles.zoneChipEmoji}>{z.emoji}</Text>
                              <Text style={[styles.zoneChipName, { color: z.color }]}>{z.name.toUpperCase()}</Text>
                              {entry.minutesSpent != null && (
                                <Text style={[styles.zoneChipTime, { color: z.color }]}>{entry.minutesSpent}m</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Expanded full recap */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.expandDivider} />

                        {log.note && log.note.trim().length > 0 && (
                          <View style={styles.noteBox}>
                            <Text style={styles.noteBoxText}>"{log.note}"</Text>
                          </View>
                        )}

                        {completedTasks.length > 0 && (
                          <View style={styles.recapSection}>
                            <Text style={styles.recapSectionLabel}>TASKS COMPLETED</Text>
                            {completedTasks.map((task, j) => (
                              <View key={j} style={styles.recapRow}>
                                <Text style={styles.recapCheck}>✓</Text>
                                <Text style={styles.recapRowText}>{task}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {wins.length > 0 && (
                          <View style={styles.recapSection}>
                            <Text style={styles.recapSectionLabel}>WINS ⚡</Text>
                            {wins.map((win, j) => (
                              <View key={j} style={styles.recapRow}>
                                <Text style={[styles.recapCheck, { color: '#f5a623' }]}>⚡</Text>
                                <Text style={[styles.recapRowText, { color: '#f5a623' }]}>{win}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {zoneLog.length > 0 && (
                          <View style={styles.recapSection}>
                            <Text style={styles.recapSectionLabel}>ZONE TIMELINE</Text>
                            {zoneLog.map((entry: any, j) => {
                              const z = safeGetZone(entry.zoneId);
                              return (
                                <View key={j} style={[styles.timelineRow, { borderColor: z.color + '30' }]}>
                                  <Text style={styles.timelineEmoji}>{z.emoji}</Text>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.timelineName, { color: z.color }]}>{z.name.toUpperCase()}</Text>
                                    <Text style={styles.timelineTime}>
                                      {entry.startTime}{entry.endTime ? ` → ${entry.endTime}` : ''}
                                      {entry.minutesSpent != null ? ` · ${entry.minutesSpent}m` : ''}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ── STREAKS TAB ── */}
      {activeTab === 'streaks' && (
        <>
          {usage.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyZap}>⚡</Text>
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptyDesc}>Start a timer in any zone to begin tracking your streaks.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionHint}>A streak counts each day you start a timer in that zone.</Text>
              {Object.entries(streaks)
                .sort((a, b) => b[1].currentStreak - a[1].currentStreak)
                .map(([zoneId, stats]) => {
                  const z = safeGetZone(zoneId);
                  return (
                    <View key={zoneId} style={[styles.streakCard, { borderColor: z.color + '40' }]}>
                      <View style={styles.streakTop}>
                        <View style={styles.streakLeft}>
                          <Text style={styles.streakEmoji}>{z.emoji}</Text>
                          <View>
                            <Text style={[styles.streakName, { color: z.color }]}>{z.name.toUpperCase()}</Text>
                            <Text style={styles.streakLastUsed}>Last used {formatDate(stats.lastUsed)}</Text>
                          </View>
                        </View>
                        {stats.currentStreak > 0 && (
                          <View style={[styles.streakBadge, { backgroundColor: z.color + '20', borderColor: z.color }]}>
                            <Text style={styles.streakFire}>🔥</Text>
                            <Text style={[styles.streakCount, { color: z.color }]}>{stats.currentStreak}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.streakStats}>
                        <View style={styles.streakStat}>
                          <Text style={styles.streakStatNum}>{stats.totalDays}</Text>
                          <Text style={styles.streakStatLabel}>total days</Text>
                        </View>
                        <View style={styles.streakDivider} />
                        <View style={styles.streakStat}>
                          <Text style={styles.streakStatNum}>{stats.currentStreak}</Text>
                          <Text style={styles.streakStatLabel}>current streak</Text>
                        </View>
                        <View style={styles.streakDivider} />
                        <View style={styles.streakStat}>
                          <Text style={styles.streakStatNum}>{stats.longestStreak}</Text>
                          <Text style={styles.streakStatLabel}>longest streak</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
            </>
          )}
        </>
      )}

      {/* ── ZONES TAB ── */}
      {activeTab === 'history' && (
        <>
          {usage.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyZap}>📅</Text>
              <Text style={styles.emptyTitle}>No zone history yet</Text>
              <Text style={styles.emptyDesc}>Start a timer to log your first zone session.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionHint}>Every day you started a timer, grouped by date.</Text>
              {byDate.map(([date, zoneIds]) => (
                <View key={date} style={styles.dayBlock}>
                  <Text style={styles.dayLabel}>{formatDate(date)}</Text>
                  <View style={styles.dayZones}>
                    {zoneIds.map(id => {
                      const z = safeGetZone(id);
                      return (
                        <View key={id} style={[styles.dayZoneChip, { borderColor: z.color + '60', backgroundColor: z.color + '12' }]}>
                          <Text style={styles.dayZoneEmoji}>{z.emoji}</Text>
                          <Text style={[styles.dayZoneName, { color: z.color }]}>{z.name.toUpperCase()}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}

      {/* ── INSIGHTS TAB ── */}
      {activeTab === 'insights' && (() => {
        if (usage.length === 0) {
          return (
            <View style={styles.empty}>
              <Text style={styles.emptyZap}>📊</Text>
              <Text style={styles.emptyTitle}>No insights yet</Text>
              <Text style={styles.emptyDesc}>Start timers across a few days to see your patterns.</Text>
            </View>
          );
        }

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
        const weekUsage = usage.filter(u => u.date >= weekAgo);
        const weekCount: Record<string, number> = {};
        weekUsage.forEach(u => { weekCount[u.zone_id] = (weekCount[u.zone_id] || 0) + 1; });
        const weekSorted = Object.entries(weekCount).sort((a, b) => b[1] - a[1]);
        const topZoneId = weekSorted[0]?.[0];
        const topZone = topZoneId ? safeGetZone(topZoneId) : null;

        const categoryCount: Record<string, number> = { Work: 0, Life: 0, Recovery: 0 };
        const { allZones } = require('../lib/zones');
        usage.forEach(u => {
          const z = allZones.find((z: any) => z.id === u.zone_id);
          if (z) categoryCount[z.category] = (categoryCount[z.category] || 0) + 1;
        });
        const totalCat = Object.values(categoryCount).reduce((a: number, b: number) => a + b, 0) || 1;

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCount: Record<string, Record<string, number>> = {};
        dayNames.forEach(d => { dayCount[d] = {}; });
        usage.forEach(u => {
          const day = dayNames[new Date(u.date + 'T00:00:00').getDay()];
          dayCount[day][u.zone_id] = (dayCount[day][u.zone_id] || 0) + 1;
        });

        // Time of day — derived from checkin zone_log start times
        const timeSlots: Record<string, Record<string, number>> = {
          'Morning (6–12)': {},
          'Afternoon (12–17)': {},
          'Evening (17–21)': {},
          'Night (21–6)': {},
        };
        checkins.forEach(log => {
          const zones: any[] = log.zone_log || [];
          zones.forEach((entry: any) => {
            const h = parseInt(entry.startTime?.split(':')[0]) || 0;
            const slot = h >= 6 && h < 12 ? 'Morning (6–12)'
              : h >= 12 && h < 17 ? 'Afternoon (12–17)'
              : h >= 17 && h < 21 ? 'Evening (17–21)'
              : 'Night (21–6)';
            timeSlots[slot][entry.zoneId] = (timeSlots[slot][entry.zoneId] || 0) + 1;
          });
        });

        const streakData = computeStreaks(usage);

        return (
          <>
            <Text style={styles.sectionHint}>Based on all your zone timer sessions.</Text>

            <Text style={styles.insightSectionTitle}>THIS WEEK</Text>
            {weekSorted.length === 0 ? (
              <Text style={styles.insightEmpty}>No sessions this week yet.</Text>
            ) : (
              <View style={styles.insightCard}>
                {topZone && (
                  <View style={styles.topZoneRow}>
                    <View style={[styles.topZoneEmoji, { backgroundColor: topZone.color + '20' }]}>
                      <Text style={{ fontSize: 28 }}>{topZone.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insightLabel}>MOST USED ZONE</Text>
                      <Text style={[styles.topZoneName, { color: topZone.color }]}>{topZone.name.toUpperCase()}</Text>
                      <Text style={styles.insightSub}>{weekCount[topZoneId]} session{weekCount[topZoneId] > 1 ? 's' : ''} this week</Text>
                    </View>
                  </View>
                )}
                <View style={styles.insightDivider} />
                {weekSorted.map(([id, count]) => {
                  const z = safeGetZone(id);
                  const pct = (count / weekSorted[0][1]) * 100;
                  return (
                    <View key={id} style={styles.barRow}>
                      <Text style={styles.barEmoji}>{z.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.barName}>{z.name.toUpperCase()}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: z.color }]} />
                        </View>
                      </View>
                      <Text style={[styles.barCount, { color: z.color }]}>{count}x</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.insightSectionTitle}>ZONE BALANCE</Text>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>WORK VS LIFE VS RECOVERY</Text>
              <View style={styles.balanceBar}>
                {(['Work', 'Life', 'Recovery'] as const).map(cat => {
                  const pct = (categoryCount[cat] / totalCat) * 100;
                  const colors = { Work: '#4f52ff', Life: '#7af0c4', Recovery: '#f5a623' };
                  return pct > 0 ? <View key={cat} style={[styles.balanceSegment, { width: `${pct}%`, backgroundColor: colors[cat] }]} /> : null;
                })}
              </View>
              <View style={styles.balanceLegend}>
                {(['Work', 'Life', 'Recovery'] as const).map(cat => {
                  const pct = Math.round((categoryCount[cat] / totalCat) * 100);
                  const colors = { Work: '#4f52ff', Life: '#7af0c4', Recovery: '#f5a623' };
                  return (
                    <View key={cat} style={styles.balanceLegendItem}>
                      <View style={[styles.balanceDot, { backgroundColor: colors[cat] }]} />
                      <Text style={styles.balanceLegendLabel}>{cat}</Text>
                      <Text style={[styles.balancePct, { color: colors[cat] }]}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text style={styles.insightSectionTitle}>DAY OF WEEK</Text>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>WHICH ZONES ON WHICH DAYS</Text>
              {dayNames.map(day => {
                const zones = Object.entries(dayCount[day]).sort((a, b) => b[1] - a[1]);
                return (
                  <View key={day} style={styles.dowRow}>
                    <Text style={styles.dowDay}>{day}</Text>
                    {zones.length === 0 ? <Text style={styles.dowEmpty}>—</Text> : (
                      <View style={styles.dowChips}>
                        {zones.slice(0, 3).map(([id]) => {
                          const z = safeGetZone(id);
                          return (
                            <View key={id} style={[styles.dowChip, { backgroundColor: z.color + '20', borderColor: z.color + '60' }]}>
                              <Text style={{ fontSize: 10 }}>{z.emoji}</Text>
                            </View>
                          );
                        })}
                        {zones.length > 3 && <Text style={styles.dowMore}>+{zones.length - 3}</Text>}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.insightSectionTitle}>TIME OF DAY</Text>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>WHEN YOU USE EACH ZONE</Text>
              {Object.entries(timeSlots).map(([slot, zones]) => {
                const topZones = Object.entries(zones).sort((a, b) => b[1] - a[1]).slice(0, 3);
                return (
                  <View key={slot} style={styles.timeRow}>
                    <Text style={styles.timeSlot}>{slot}</Text>
                    {topZones.length === 0 ? (
                      <Text style={styles.dowEmpty}>—</Text>
                    ) : (
                      <View style={styles.dowChips}>
                        {topZones.map(([id]) => {
                          const z = safeGetZone(id);
                          return (
                            <View key={id} style={[styles.dowChip, { backgroundColor: z.color + '20', borderColor: z.color + '60' }]}>
                              <Text style={{ fontSize: 10 }}>{z.emoji}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.insightSectionTitle}>PERSONAL BESTS</Text>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>LONGEST STREAK PER ZONE</Text>
              {Object.entries(streakData)
                .sort((a, b) => b[1].longestStreak - a[1].longestStreak)
                .slice(0, 5)
                .map(([id, stats]) => {
                  const z = safeGetZone(id);
                  return (
                    <View key={id} style={styles.pbRow}>
                      <Text style={styles.pbEmoji}>{z.emoji}</Text>
                      <Text style={[styles.pbName, { color: z.color }]}>{z.name.toUpperCase()}</Text>
                      <Text style={styles.pbStreak}>🔥 {stats.longestStreak} day{stats.longestStreak > 1 ? 's' : ''}</Text>
                    </View>
                  );
                })}
            </View>
          </>
        );
      })()}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 28, paddingTop: 60, paddingBottom: 60 },
  loading: { flex: 1, backgroundColor: '#0a0a1e', alignItems: 'center', justifyContent: 'center' },
  loadingZap: { fontSize: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { fontSize: 11, letterSpacing: 2, color: '#4f52ff', fontWeight: '700' },
  headerTitle: { fontSize: 16, letterSpacing: 4, color: '#e8e8ff', fontWeight: '900' },
  tabs: { flexDirection: 'row', backgroundColor: '#13132e', borderRadius: 10, padding: 3, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#4f52ff' },
  tabText: { fontSize: 16 },
  tabTextActive: { fontSize: 16 },
  sectionHint: { fontSize: 11, color: '#5050a0', marginBottom: 16, lineHeight: 18 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyZap: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#e8e8ff', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#5050a0', textAlign: 'center', lineHeight: 20 },

  // Check-in cards
  checkinCard: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 14, padding: 16, marginBottom: 12 },
  checkinHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  checkinDateLabel: { fontSize: 16, fontWeight: '800', color: '#e8e8ff', marginBottom: 2 },
  checkinDateFull: { fontSize: 10, color: '#5050a0', letterSpacing: 0.5 },
  checkinMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  ratingPillEmoji: { fontSize: 12 },
  ratingPillLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  expandIcon: { fontSize: 10, color: '#5050a0' },
  checkinZones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  zoneChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  zoneChipEmoji: { fontSize: 12 },
  zoneChipName: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  zoneChipTime: { fontSize: 9, fontWeight: '700', opacity: 0.7 },
  expandedContent: { marginTop: 4 },
  expandDivider: { height: 1, backgroundColor: '#2a2a5a', marginTop: 12, marginBottom: 14 },
  noteBox: { backgroundColor: '#1a1a40', borderRadius: 8, padding: 12, marginBottom: 14 },
  noteBoxText: { fontSize: 13, color: '#a0a2ff', fontStyle: 'italic', lineHeight: 20 },
  recapSection: { marginBottom: 14 },
  recapSectionLabel: { fontSize: 8, letterSpacing: 2, color: '#2a2a5a', textTransform: 'uppercase', marginBottom: 8 },
  recapRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 5 },
  recapCheck: { fontSize: 11, color: '#7af0c4', marginTop: 1 },
  recapRowText: { fontSize: 12, color: '#7af0c4', flex: 1, lineHeight: 18 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  timelineEmoji: { fontSize: 14 },
  timelineName: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  timelineTime: { fontSize: 10, color: '#5050a0' },

  // Streaks
  streakCard: { backgroundColor: '#13132e', borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
  streakTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakEmoji: { fontSize: 24 },
  streakName: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  streakLastUsed: { fontSize: 10, color: '#5050a0' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10 },
  streakFire: { fontSize: 14 },
  streakCount: { fontSize: 18, fontWeight: '900' },
  streakStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#2a2a5a', paddingTop: 12 },
  streakStat: { flex: 1, alignItems: 'center' },
  streakStatNum: { fontSize: 20, fontWeight: '900', color: '#e8e8ff', marginBottom: 2 },
  streakStatLabel: { fontSize: 9, color: '#5050a0', letterSpacing: 1, textTransform: 'uppercase' },
  streakDivider: { width: 1, backgroundColor: '#2a2a5a' },

  // Zone history
  dayBlock: { marginBottom: 20 },
  dayLabel: { fontSize: 11, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 10 },
  dayZones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayZoneChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  dayZoneEmoji: { fontSize: 14 },
  dayZoneName: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  // Insights
  insightSectionTitle: { fontSize: 9, letterSpacing: 3, color: '#4f52ff', textTransform: 'uppercase', fontWeight: '700', marginTop: 20, marginBottom: 8 },
  insightCard: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 14, padding: 16, marginBottom: 4 },
  insightLabel: { fontSize: 8, letterSpacing: 2, color: '#5050a0', textTransform: 'uppercase', marginBottom: 12 },
  insightSub: { fontSize: 10, color: '#5050a0', marginTop: 2 },
  insightDivider: { height: 1, backgroundColor: '#2a2a5a', marginVertical: 12 },
  insightEmpty: { fontSize: 12, color: '#2a2a5a', fontStyle: 'italic', marginBottom: 8 },
  topZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  topZoneEmoji: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topZoneName: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barEmoji: { fontSize: 14, width: 22 },
  barName: { fontSize: 9, color: '#5050a0', letterSpacing: 1, marginBottom: 4 },
  barTrack: { height: 6, backgroundColor: '#1a1a40', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barCount: { fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },
  balanceBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: '#1a1a40', marginBottom: 12 },
  balanceSegment: { height: '100%' },
  balanceLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceLegendItem: { alignItems: 'center', gap: 4 },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceLegendLabel: { fontSize: 9, color: '#5050a0', letterSpacing: 1 },
  balancePct: { fontSize: 14, fontWeight: '900' },
  dowRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  dowDay: { fontSize: 11, color: '#5050a0', fontWeight: '700', width: 32 },
  dowEmpty: { fontSize: 11, color: '#2a2a5a' },
  dowChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dowChip: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dowMore: { fontSize: 10, color: '#5050a0', alignSelf: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  timeSlot: { fontSize: 10, color: '#5050a0', width: 110 },
  pbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pbEmoji: { fontSize: 16, width: 24 },
  pbName: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  pbStreak: { fontSize: 12, color: '#f5a623', fontWeight: '700' },
});