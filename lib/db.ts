import { supabase } from './supabase';

// ── AUTH ──
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── ZONES ──
export async function saveUserZones(zoneIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from('user_zones').delete().eq('user_id', user.id);
  const rows = zoneIds.map((zoneId, index) => ({
    user_id: user.id,
    zone_id: zoneId,
    position: index,
  }));
  const { error } = await supabase.from('user_zones').insert(rows);
  if (error) console.log('Error saving zones:', error.message);
}

export async function loadUserZones(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('user_zones')
    .select('zone_id, position')
    .eq('user_id', user.id)
    .order('position');
  if (error || !data) return [];
  return data.map((row: any) => row.zone_id);
}

export async function saveSuggestedZones(zoneIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from('profiles').update({ suggested_zones: zoneIds }).eq('id', user.id);
}

export async function loadSuggestedZones(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('suggested_zones')
    .eq('id', user.id)
    .single();
  if (error || !data?.suggested_zones) return [];
  return data.suggested_zones;
}

// ── TASKS ──
export async function saveTasks(zoneId: string, tasks: string[]) {
  const user = await getCurrentUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('tasks')
    .delete()
    .eq('user_id', user.id)
    .eq('zone_id', zoneId)
    .eq('date', today);
  if (tasks.length === 0) return;
  const rows = tasks.map(text => ({
    user_id: user.id,
    zone_id: zoneId,
    text,
    completed: false,
    date: today,
  }));
  const { error } = await supabase.from('tasks').insert(rows);
  if (error) console.log('Error saving tasks:', error.message);
}

export async function loadTasks(zoneId: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tasks')
    .select('text')
    .eq('user_id', user.id)
    .eq('zone_id', zoneId)
    .eq('date', today)
    .eq('completed', false);
  if (error || !data) return [];
  return data.map((row: any) => row.text);
}

export async function markTaskComplete(zoneId: string, taskText: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('tasks')
    .update({ completed: true })
    .eq('user_id', user.id)
    .eq('zone_id', zoneId)
    .eq('text', taskText)
    .eq('date', today);
}

// ── DAILY LOG ──
export async function saveDailyLog(log: {
  rating: string;
  note: string;
  wins: string[];
  zoneLog: any[];
  completedTasks?: string[];
  zones?: string[];
}) {
  const user = await getCurrentUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('daily_logs').upsert({
    user_id: user.id,
    date: today,
    rating: log.rating,
    note: log.note,
    wins: log.wins,
    zone_log: log.zoneLog,
    completed_tasks: log.completedTasks ?? [],
    zones: log.zones ?? [],
  }, { onConflict: 'user_id,date' });
  if (error) console.log('Error saving daily log:', error.message);
}

export async function loadTodayLog() {
  const user = await getCurrentUser();
  if (!user) return null;
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();
  if (error || !data) return null;
  return data;
}

// ── USER PROFILE ──
export async function loadProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('name, suggested_zones')
    .eq('id', user.id)
    .single();
  if (error || !data) return null;
  return data;
}
export async function logZoneUsage(zoneId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('zone_usage').upsert(
    { user_id: user.id, zone_id: zoneId, date: today },
    { onConflict: 'user_id,zone_id,date' }
  );
}

export async function loadZoneUsage(): Promise<{ zone_id: string; date: string }[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('zone_usage')
    .select('zone_id, date')
    .eq('user_id', user.id)
    .order('date', { ascending: false });
  if (error || !data) return [];
  return data;
}