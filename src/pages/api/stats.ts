import { NextApiRequest, NextApiResponse } from 'next';
import { listEntries } from '../../lib/storage';
import { withAuth } from '../../lib/withAuth';
import { calculateStats, getLevelFromPoints, getLevelProgress, BADGES, getBadgeById, getMotivationalMessage } from '../../lib/gamification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).end('Method Not Allowed');
    }

    try {
      const entries = await listEntries(userId);
      const stats = calculateStats(entries);
      const level = getLevelFromPoints(stats.totalPoints);
      const levelProgress = getLevelProgress(stats.totalPoints);

      // Calculate mood trends
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const monthAgo = new Date(now.getTime() - 30 * 86400000);

      const weeklyEntries = entries.filter((e: any) => new Date(e.created_at) >= weekAgo);
      const monthlyEntries = entries.filter((e: any) => new Date(e.created_at) >= monthAgo);

      // Mood analysis
      const entriesWithMood = entries.filter((e: any) => e.mood !== undefined && e.mood !== null);
      const weeklyMoods = weeklyEntries
        .filter((e: any) => e.mood !== undefined && e.mood !== null)
        .map((e: any) => e.mood);
      const monthlyMoods = monthlyEntries
        .filter((e: any) => e.mood !== undefined && e.mood !== null)
        .map((e: any) => e.mood);

      const avgMood = (moods: number[]) => 
        moods.length > 0 ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : null;

      // Activity tag analysis
      const activityCounts: Record<string, number> = {};
      monthlyEntries.forEach((entry: any) => {
        if (entry.activities && Array.isArray(entry.activities)) {
          entry.activities.forEach((activity: string) => {
            activityCounts[activity] = (activityCounts[activity] || 0) + 1;
          });
        }
      });

      // Word frequency for keywords (simple implementation)
      const wordCounts: Record<string, number> = {};
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'my', 'me', 'we', 'you', 'it', 'is', 'was', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those', 'am', 'are', 'been', 'being', 'so', 'as', 'if', 'then', 'than', 'just', 'very', 'really', 'about', 'also', 'more', 'some', 'any', 'all', 'not', 'no', 'yes', 'can', 'get', 'got', 'like', 'think', 'know', 'want', 'feel', 'felt', 'today', 'day', 'time']);
      
      monthlyEntries.forEach((entry: any) => {
        if (entry.content) {
          const words = entry.content.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter((w: string) => w.length > 3 && !stopWords.has(w));
          
          words.forEach((word: string) => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          });
        }
      });

      const topKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      // Daily entry counts for the last 30 days
      const dailyCounts: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 86400000);
        const dateStr = date.toISOString().split('T')[0];
        dailyCounts[dateStr] = 0;
      }
      monthlyEntries.forEach((entry: any) => {
        const dateStr = new Date(entry.created_at).toISOString().split('T')[0];
        if (dailyCounts[dateStr] !== undefined) {
          dailyCounts[dateStr]++;
        }
      });

      // Get earned badges with full info
      const earnedBadges = stats.badges.map(badgeId => {
        const badge = getBadgeById(badgeId);
        return badge ? {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
        } : null;
      }).filter(Boolean);

      // Get next badges to earn
      const unearnedBadges = BADGES
        .filter(b => !stats.badges.includes(b.id))
        .slice(0, 3)
        .map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          points: b.points,
        }));

      return res.status(200).json({
        stats: {
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          totalEntries: stats.totalEntries,
          totalPoints: stats.totalPoints,
          weeklyEntries: stats.weeklyEntries,
          monthlyEntries: stats.monthlyEntries,
          streakFreezeAvailable: stats.streakFreezeAvailable,
        },
        level: {
          current: level.level,
          title: level.title,
          progress: levelProgress,
          pointsToNext: level.maxPoints === Infinity ? 0 : level.maxPoints - stats.totalPoints + 1,
        },
        mood: {
          weeklyAverage: avgMood(weeklyMoods),
          monthlyAverage: avgMood(monthlyMoods),
          allTimeAverage: avgMood(entriesWithMood.map((e: any) => e.mood)),
          trend: weeklyMoods.length >= 2 
            ? weeklyMoods[0] > weeklyMoods[weeklyMoods.length - 1] ? 'up' : 'down'
            : 'stable',
        },
        activities: Object.entries(activityCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([activity, count]) => ({ activity, count })),
        keywords: topKeywords,
        calendar: dailyCounts,
        badges: {
          earned: earnedBadges,
          next: unearnedBadges,
          total: BADGES.length,
        },
        motivationalMessage: getMotivationalMessage(stats),
      });
    } catch (err) {
      console.error('Stats error:', err);
      return res.status(500).json({ error: 'Failed to calculate stats' });
    }
  });
}
