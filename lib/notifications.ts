import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function loadNotificationSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('notification_settings')
    .eq('id', user.id)
    .single();
  return data?.notification_settings || getDefaultSettings();
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({ notification_settings: settings })
    .eq('id', user.id);
}

export type NotificationSettings = {
  zoneNudge: boolean;
  endOfDay: boolean;
  endOfDayTime: string; // "HH:MM" 24hr
  streakReminder: boolean;
  streakReminderTime: string; // "HH:MM" 24hr
  timerDone: boolean;
};

export function getDefaultSettings(): NotificationSettings {
  return {
    zoneNudge: true,
    endOfDay: true,
    endOfDayTime: '21:00',
    streakReminder: true,
    streakReminderTime: '12:00',
    timerDone: true,
  };
}

export async function scheduleEndOfDayReminder(time: string) {
  await cancelNotification('end-of-day');
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: 'end-of-day',
    content: {
      title: '✍️ End of day check-in',
      body: 'How did today go? Take 60 seconds to log your wins.',
      sound: true,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any,
  });
}

export async function scheduleStreakReminder(time: string) {
  await cancelNotification('streak-reminder');
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-reminder',
    content: {
      title: '🔥 Keep your streak alive',
      body: "You haven't started a zone session today. Zap in!",
      sound: true,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any,
  });
}

export async function scheduleZoneNudge(zoneName: string, zoneEmoji: string, delaySeconds: number) {
  await cancelNotification('zone-nudge');
  await Notifications.scheduleNotificationAsync({
    identifier: 'zone-nudge',
    content: {
      title: `${zoneEmoji} Time for ${zoneName}`,
      body: 'Your zone window is starting — zap in.',
      sound: true,
    },
    trigger: {
      seconds: delaySeconds,
    } as any,
  });
}

export async function sendTimerDoneNotification(zoneName: string) {
  await Notifications.scheduleNotificationAsync({
    identifier: 'timer-done',
    content: {
      title: '⚡ Zone complete!',
      body: `Your ${zoneName} session is done. Log your wins.`,
      sound: true,
    },
    trigger: null, // immediate
  });
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}