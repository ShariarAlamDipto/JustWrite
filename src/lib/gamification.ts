// Gamification System: Streaks, Badges, Points, Levels

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  totalPoints: number;
  level: number;
  badges: string[];
  streakFreezeAvailable: boolean;
  lastEntryDate: string | null;
  weeklyEntries: number;
  monthlyEntries: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserStats, entries: any[]) => boolean;
  points: number;
}

export interface Level {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
}

// Level definitions
export const LEVELS: Level[] = [
  { level: 1, title: 'Novice', minPoints: 0, maxPoints: 99 },
  { level: 2, title: 'Writer', minPoints: 100, maxPoints: 299 },
  { level: 3, title: 'Reflector', minPoints: 300, maxPoints: 599 },
  { level: 4, title: 'Journaler', minPoints: 600, maxPoints: 999 },
  { level: 5, title: 'Insightful', minPoints: 1000, maxPoints: 1499 },
  { level: 6, title: 'Guru', minPoints: 1500, maxPoints: 2499 },
  { level: 7, title: 'Master', minPoints: 2500, maxPoints: Infinity },
];

// Badge definitions
export const BADGES: Badge[] = [
  {
    id: 'first_entry',
    name: 'First Steps',
    description: 'Write your first journal entry',
    icon: '✏️',
    condition: (stats) => stats.totalEntries >= 1,
    points: 10,
  },
  {
    id: 'first_week',
    name: 'Week One',
    description: 'Journal for 7 days',
    icon: '📅',
    condition: (stats) => stats.totalEntries >= 7,
    points: 25,
  },
  {
    id: 'streak_3',
    name: 'On a Roll',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    condition: (stats) => stats.currentStreak >= 3 || stats.longestStreak >= 3,
    points: 15,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    condition: (stats) => stats.currentStreak >= 7 || stats.longestStreak >= 7,
    points: 50,
  },
  {
    id: 'streak_14',
    name: 'Fortnight Focus',
    description: 'Maintain a 14-day streak',
    icon: '💪',
    condition: (stats) => stats.currentStreak >= 14 || stats.longestStreak >= 14,
    points: 100,
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🏆',
    condition: (stats) => stats.currentStreak >= 30 || stats.longestStreak >= 30,
    points: 200,
  },
  {
    id: 'streak_66',
    name: 'Habit Formed',
    description: '66 days - habit is automatic now!',
    icon: '🧠',
    condition: (stats) => stats.currentStreak >= 66 || stats.longestStreak >= 66,
    points: 500,
  },
  {
    id: 'entries_30',
    name: 'Thirty Strong',
    description: 'Write 30 journal entries',
    icon: '📝',
    condition: (stats) => stats.totalEntries >= 30,
    points: 75,
  },
  {
    id: 'entries_100',
    name: 'Century Club',
    description: 'Write 100 journal entries',
    icon: '💯',
    condition: (stats) => stats.totalEntries >= 100,
    points: 250,
  },
  {
    id: 'entries_365',
    name: 'Year of Reflection',
    description: 'Write 365 journal entries',
    icon: '🌟',
    condition: (stats) => stats.totalEntries >= 365,
    points: 1000,
  },
  {
    id: 'level_writer',
    name: 'Rising Writer',
    description: 'Reach Level 2: Writer',
    icon: '📖',
    condition: (stats) => stats.level >= 2,
    points: 0, // Points already earned from activities
  },
  {
    id: 'level_reflector',
    name: 'Deep Thinker',
    description: 'Reach Level 3: Reflector',
    icon: '🔮',
    condition: (stats) => stats.level >= 3,
    points: 0,
  },
  {
    id: 'level_guru',
    name: 'Wisdom Seeker',
    description: 'Reach Level 6: Guru',
    icon: '🧘',
    condition: (stats) => stats.level >= 6,
    points: 0,
  },
];

// Points awarded for actions
export const POINTS = {
  ENTRY_CREATED: 10,
  STREAK_MAINTAINED: 5,
  MOOD_LOGGED: 2,
  PROMPT_USED: 3,
  LONG_ENTRY: 5, // Bonus for entries > 200 words
  DISTILL_USED: 5,
};

// Calculate level from points
export function getLevelFromPoints(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// Calculate progress to next level (0-100)
export function getLevelProgress(points: number): number {
  const currentLevel = getLevelFromPoints(points);
  const nextLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  
  if (nextLevelIndex >= LEVELS.length) return 100;
  
  const nextLevel = LEVELS[nextLevelIndex];
  const pointsInLevel = points - currentLevel.minPoints;
  const pointsNeeded = nextLevel.minPoints - currentLevel.minPoints;
  
  return Math.min(100, Math.floor((pointsInLevel / pointsNeeded) * 100));
}

// Check for new badges earned
export function checkNewBadges(stats: UserStats, entries: any[]): Badge[] {
  const newBadges: Badge[] = [];
  
  for (const badge of BADGES) {
    if (!stats.badges.includes(badge.id) && badge.condition(stats, entries)) {
      newBadges.push(badge);
    }
  }
  
  return newBadges;
}

// Calculate streak from entries
export function calculateStreak(entries: any[]): { current: number; longest: number } {
  if (!entries.length) return { current: 0, longest: 0 };
  
  // Sort entries by date descending
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  // Get unique days with entries
  const entryDays = new Set<string>();
  sortedEntries.forEach(entry => {
    const date = new Date(entry.created_at);
    entryDays.add(date.toISOString().split('T')[0]);
  });
  
  const sortedDays = Array.from(entryDays).sort().reverse();
  if (!sortedDays.length) return { current: 0, longest: 0 };
  
  // Check if today or yesterday has an entry (for current streak)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Calculate current streak
  if (sortedDays[0] === today || sortedDays[0] === yesterday) {
    currentStreak = 1;
    let checkDate = new Date(sortedDays[0]);
    
    for (let i = 1; i < sortedDays.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const expectedDate = checkDate.toISOString().split('T')[0];
      
      if (sortedDays[i] === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return { current: currentStreak, longest: longestStreak };
}

// Calculate stats from entries
export function calculateStats(entries: any[], existingStats?: Partial<UserStats>): UserStats {
  const streak = calculateStreak(entries);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  
  const weeklyEntries = entries.filter(e => new Date(e.created_at) >= weekAgo).length;
  const monthlyEntries = entries.filter(e => new Date(e.created_at) >= monthAgo).length;
  
  // Calculate points
  let totalPoints = existingStats?.totalPoints || 0;
  if (!existingStats?.totalPoints) {
    // Initial calculation
    totalPoints = entries.length * POINTS.ENTRY_CREATED;
    // Add bonus for long entries
    entries.forEach(entry => {
      if (entry.content && entry.content.split(/\s+/).length > 200) {
        totalPoints += POINTS.LONG_ENTRY;
      }
      if (entry.mood !== undefined && entry.mood !== null) {
        totalPoints += POINTS.MOOD_LOGGED;
      }
    });
    // Add streak bonus
    totalPoints += streak.current * POINTS.STREAK_MAINTAINED;
  }
  
  const level = getLevelFromPoints(totalPoints);
  
  const stats: UserStats = {
    currentStreak: streak.current,
    longestStreak: Math.max(streak.longest, existingStats?.longestStreak || 0),
    totalEntries: entries.length,
    totalPoints,
    level: level.level,
    badges: existingStats?.badges || [],
    streakFreezeAvailable: existingStats?.streakFreezeAvailable ?? true,
    lastEntryDate: entries.length > 0 ? entries[0].created_at : null,
    weeklyEntries,
    monthlyEntries,
  };
  
  // Check for new badges
  const newBadges = checkNewBadges(stats, entries);
  newBadges.forEach(badge => {
    if (!stats.badges.includes(badge.id)) {
      stats.badges.push(badge.id);
      stats.totalPoints += badge.points;
    }
  });
  
  // Recalculate level after badge points
  const finalLevel = getLevelFromPoints(stats.totalPoints);
  stats.level = finalLevel.level;
  
  return stats;
}

// Get badge by ID
export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

// Generate motivational message based on stats
export function getMotivationalMessage(stats: UserStats): string {
  if (stats.currentStreak === 0) {
    return "Start your streak today! Every journey begins with a single step.";
  }
  if (stats.currentStreak === 1) {
    return "Great start! Come back tomorrow to build your streak.";
  }
  if (stats.currentStreak < 7) {
    return `${stats.currentStreak} days strong! Keep going to reach a full week.`;
  }
  if (stats.currentStreak < 14) {
    return `Amazing ${stats.currentStreak}-day streak! You're building a real habit.`;
  }
  if (stats.currentStreak < 30) {
    return `${stats.currentStreak} days! You're on your way to making journaling automatic.`;
  }
  if (stats.currentStreak < 66) {
    return `Incredible ${stats.currentStreak}-day streak! 66 days to form a habit - you're getting close!`;
  }
  return `${stats.currentStreak} days! Journaling is now part of who you are.`;
}

// Get gentle missed day message
export function getMissedDayMessage(daysMissed: number, hasFreeze: boolean): string {
  if (daysMissed === 1) {
    if (hasFreeze) {
      return "You missed yesterday, but that's okay! Use your streak freeze to keep going.";
    }
    return "You missed a day, but don't give up! Start fresh today.";
  }
  return "Life happens. What matters is that you're here now. Let's write.";
}
