export type Zone = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  bestFor: string;
  category: string;
  color: string;
  custom?: boolean;
};

export const defaultZones: Zone[] = [
  {
    id: 'deep-focus',
    emoji: '🔥',
    name: 'Deep Focus',
    desc: 'Your hardest, most important work. No interruptions, no switching.',
    bestFor: 'Writing, building, designing, solving hard problems',
    category: 'Work',
    color: '#4f52ff',
  },
  {
    id: 'builder',
    emoji: '🏗️',
    name: 'Builder Mode',
    desc: 'Head down, making real progress. The zone where things get shipped.',
    bestFor: 'Projects, side hustles, building anything tangible',
    category: 'Work',
    color: '#7af0c4',
  },
  {
    id: 'strategy',
    emoji: '🧩',
    name: 'Strategy',
    desc: 'Zoom out and think clearly. Plan, review, connect the dots.',
    bestFor: 'Planning, decision-making, goal-setting, reviews',
    category: 'Work',
    color: '#f0d87a',
  },
  {
    id: 'learning',
    emoji: '📚',
    name: 'Learning',
    desc: 'Dedicated time to absorb something new without multitasking.',
    bestFor: 'Reading, courses, studying, skill-building',
    category: 'Work',
    color: '#c47af0',
  },
  {
    id: 'communication',
    emoji: '💬',
    name: 'Communication',
    desc: 'Batched time for all outbound communication so it doesn\'t bleed into focus.',
    bestFor: 'Email, Slack, calls, check-ins, meetings',
    category: 'Work',
    color: '#7ab8f0',
  },
  {
    id: 'admin',
    emoji: '📥',
    name: 'Admin',
    desc: 'Low-stakes work that keeps everything running. Do it in one batch.',
    bestFor: 'Scheduling, invoices, logistics, inbox zero',
    category: 'Work',
    color: '#a0a2ff',
  },
  {
    id: 'gentle',
    emoji: '☁️',
    name: 'Gentle Mode',
    desc: 'Not every hour is a peak hour. Light tasks only — keep moving without burning out.',
    bestFor: 'Easy wins, gentle tasks, recovering while still moving',
    category: 'Work',
    color: '#5050a0',
  },
  {
    id: 'movement',
    emoji: '🏃',
    name: 'Movement',
    desc: 'Your body needs this to keep your mind sharp. Schedule it or it won\'t happen.',
    bestFor: 'Gym, walks, runs, stretching, any physical activity',
    category: 'Life',
    color: '#7af0c4',
  },
  {
    id: 'nourish',
    emoji: '🍽️',
    name: 'Nourish',
    desc: 'Eating with intention. Screens down, present, actually tasting your food.',
    bestFor: 'Breakfast, lunch, dinner — no multitasking',
    category: 'Life',
    color: '#f0c87a',
  },
  {
    id: 'present',
    emoji: '🤝',
    name: 'Present',
    desc: 'Fully here with the people in your life. Phone down, eyes up.',
    bestFor: 'Family time, date nights, quality time with friends',
    category: 'Life',
    color: '#f0a87a',
  },
  {
    id: 'creative-play',
    emoji: '🎨',
    name: 'Creative Play',
    desc: 'No output required. Space to play, make things, and enjoy the process.',
    bestFor: 'Art, hobbies, games, anything you do purely for enjoyment',
    category: 'Life',
    color: '#f07ab8',
  },
  {
    id: 'wind-down',
    emoji: '🛁',
    name: 'Wind Down',
    desc: 'Transition from work mode to rest. Your evening routine that protects sleep.',
    bestFor: 'End of day routine, closing loops, preparing for tomorrow',
    category: 'Recovery',
    color: '#c47af0',
  },
  {
    id: 'stillness',
    emoji: '🤫',
    name: 'Stillness',
    desc: 'No input, no output. Just quiet. Where your mind defragments and resets.',
    bestFor: 'Meditation, breathwork, journaling, reflection, gratitude',
    category: 'Recovery',
    color: '#a0a2ff',
  },
  {
    id: 'rest',
    emoji: '😴',
    name: 'Rest & Recharge',
    desc: 'Full recovery. A nap, a slow afternoon, solo time after heavy social days. No guilt.',
    bestFor: 'Napping, recharging after events, recovery days, solo time',
    category: 'Recovery',
    color: '#5050a0',
  },
  {
    id: 'transition',
    emoji: '🔀',
    name: 'Transition',
    desc: 'The intentional gap between modes. Without this, everything bleeds into everything else.',
    bestFor: 'Between work and home, between focus blocks, context switching',
    category: 'Recovery',
    color: '#f5a623',
  },
];

// Load custom zones from storage (merged at runtime)
let _customZones: Zone[] = [];

export function setCustomZones(zones: Zone[]) {
  _customZones = zones;
}

export function getCustomZones(): Zone[] {
  return _customZones;
}

export function createCustomZone(zone: Omit<Zone, 'custom'>): Zone {
  return { ...zone, custom: true };
}

export const allZones: Zone[] = defaultZones;

export function getAllZonesWithCustom(): Zone[] {
  return [...defaultZones, ..._customZones];
}

export function getZone(id: string): Zone {
  return getAllZonesWithCustom().find(z => z.id === id) || defaultZones[0];
}

export const categories = ['Work', 'Life', 'Recovery'];