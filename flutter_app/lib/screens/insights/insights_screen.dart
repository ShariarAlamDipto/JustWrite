import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';
import 'dart:math' as math;

class InsightsScreen extends StatefulWidget {
  const InsightsScreen({super.key});

  @override
  State<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends State<InsightsScreen> with AutomaticKeepAliveClientMixin {
  // Cache stats to avoid recomputing on every build
  Map<String, dynamic>? _cachedStats;
  int _lastEntriesLength = 0;

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    
    return Consumer<EntryProvider>(
      builder: (context, entryProvider, _) {
        final entries = entryProvider.entries;
        
        // Only recalculate if entries changed
        if (_cachedStats == null || entries.length != _lastEntriesLength) {
          _cachedStats = _calculateStats(entries);
          _lastEntriesLength = entries.length;
        }
        final stats = _cachedStats!;
        
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Text('Insights', style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 4),
              Text(
                'Track your journaling journey',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 24),

              // Stats Overview
              _buildStatsGrid(stats, isDark),
              const SizedBox(height: 24),

              // Streak Calendar
              _buildStreakSection(stats, isDark),
              const SizedBox(height: 24),

              // Mood Chart Toggle
              _buildMoodChartSection(stats, isDark),
              const SizedBox(height: 24),

              // Entry Breakdown
              _buildEntryBreakdown(stats, isDark),
            ],
          ),
        );
      },
    );
  }

  Map<String, dynamic> _calculateStats(List entries) {
    final now = DateTime.now();
    final weekAgo = now.subtract(const Duration(days: 7));
    final monthAgo = now.subtract(const Duration(days: 30));
    
    // Filter entries by time
    final weeklyEntries = entries.where((e) => e.createdAt.isAfter(weekAgo)).toList();
    final monthlyEntries = entries.where((e) => e.createdAt.isAfter(monthAgo)).toList();
    
    // Calculate streaks
    final streakData = _calculateStreaks(entries);
    
    // Mood analysis
    final entriesWithMood = entries.where((e) => e.mood != null && e.mood > 0).toList();
    final moodDistribution = _calculateMoodDistribution(entriesWithMood);
    final moodHistory = _calculateMoodHistory(entriesWithMood, 14);
    final avgMood = entriesWithMood.isEmpty ? 0 : 
        (entriesWithMood.map((e) => e.mood as int).reduce((a, b) => a + b) / entriesWithMood.length).round();
    
    // Daily counts for calendar
    final dailyCounts = _calculateDailyCounts(entries, 30);
    
    // Entry type breakdown
    final journalCount = entries.where((e) => e.source.toString().contains('text')).length;
    final brainstormCount = entries.where((e) => e.source.toString().contains('brainstorm')).length;
    final voiceCount = entries.where((e) => e.source.toString().contains('voice')).length;
    
    return {
      'totalEntries': entries.length,
      'weeklyEntries': weeklyEntries.length,
      'monthlyEntries': monthlyEntries.length,
      'currentStreak': streakData['current'],
      'longestStreak': streakData['longest'],
      'avgMood': avgMood,
      'moodDistribution': moodDistribution,
      'moodHistory': moodHistory,
      'dailyCounts': dailyCounts,
      'journalCount': journalCount,
      'brainstormCount': brainstormCount,
      'voiceCount': voiceCount,
    };
  }

  Map<String, int> _calculateStreaks(List entries) {
    if (entries.isEmpty) return {'current': 0, 'longest': 0};
    
    // Sort by date descending
    final sortedDates = entries
        .map((e) => DateTime(e.createdAt.year, e.createdAt.month, e.createdAt.day))
        .toSet()
        .toList()
      ..sort((a, b) => b.compareTo(a));
    
    if (sortedDates.isEmpty) return {'current': 0, 'longest': 0};
    
    int currentStreak = 0;
    int longestStreak = 0;
    int tempStreak = 1;
    
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final yesterday = today.subtract(const Duration(days: 1));
    
    // Check if streak is active (entry today or yesterday)
    if (sortedDates.first == today || sortedDates.first == yesterday) {
      currentStreak = 1;
      for (int i = 0; i < sortedDates.length - 1; i++) {
        final diff = sortedDates[i].difference(sortedDates[i + 1]).inDays;
        if (diff == 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculate longest streak
    for (int i = 0; i < sortedDates.length - 1; i++) {
      final diff = sortedDates[i].difference(sortedDates[i + 1]).inDays;
      if (diff == 1) {
        tempStreak++;
      } else {
        longestStreak = math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = math.max(longestStreak, tempStreak);
    
    return {'current': currentStreak, 'longest': longestStreak};
  }

  Map<String, int> _calculateMoodDistribution(List entries) {
    final dist = {'veryLow': 0, 'low': 0, 'neutral': 0, 'good': 0, 'great': 0};
    
    for (final entry in entries) {
      final mood = entry.mood as int? ?? 5;
      // Scale: 1-2 = veryLow, 3-4 = low, 5-6 = neutral, 7-8 = good, 9-10 = great
      if (mood <= 2) {
        dist['veryLow'] = (dist['veryLow'] ?? 0) + 1;
      } else if (mood <= 4) {
        dist['low'] = (dist['low'] ?? 0) + 1;
      } else if (mood <= 6) {
        dist['neutral'] = (dist['neutral'] ?? 0) + 1;
      } else if (mood <= 8) {
        dist['good'] = (dist['good'] ?? 0) + 1;
      } else {
        dist['great'] = (dist['great'] ?? 0) + 1;
      }
    }
    
    return dist;
  }

  List<Map<String, dynamic>> _calculateMoodHistory(List entries, int days) {
    final now = DateTime.now();
    final cutoff = now.subtract(Duration(days: days));
    
    final results = entries
        .where((e) => e.createdAt.isAfter(cutoff))
        .map<Map<String, dynamic>>((e) {
          final date = e.createdAt;
          return {
            'date': '${date.month}/${date.day}',
            'mood': e.mood as int? ?? 5,
          };
        })
        .toList();
    
    results.sort((a, b) => (a['date'] as String).compareTo(b['date'] as String));
    return results;
  }

  Map<String, int> _calculateDailyCounts(List entries, int days) {
    final counts = <String, int>{};
    final now = DateTime.now();
    
    for (int i = 0; i < days; i++) {
      final date = now.subtract(Duration(days: i));
      final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      counts[dateStr] = 0;
    }
    
    for (final entry in entries) {
      final date = entry.createdAt;
      final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      if (counts.containsKey(dateStr)) {
        counts[dateStr] = (counts[dateStr] ?? 0) + 1;
      }
    }
    
    return counts;
  }

  Widget _buildStatsGrid(Map<String, dynamic> stats, bool isDark) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          value: '${stats['currentStreak']}',
          label: 'Current Streak',
          icon: Icons.local_fire_department,
          color: const Color(0xFFFF6B35),
          isDark: isDark,
        ),
        _StatCard(
          value: '${stats['longestStreak']}',
          label: 'Best Streak',
          icon: Icons.emoji_events,
          color: const Color(0xFFFFD700),
          isDark: isDark,
        ),
        _StatCard(
          value: '${stats['totalEntries']}',
          label: 'Total Entries',
          icon: Icons.book,
          color: AppTheme.navy,
          isDark: isDark,
        ),
        _StatCard(
          value: '${stats['weeklyEntries']}',
          label: 'This Week',
          icon: Icons.calendar_today,
          color: const Color(0xFF38A169),
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildStreakSection(Map<String, dynamic> stats, bool isDark) {
    final dailyCounts = stats['dailyCounts'] as Map<String, int>;
    final sortedDates = dailyCounts.keys.toList()..sort();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ACTIVITY',
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: sortedDates.reversed.take(30).map((date) {
              final count = dailyCounts[date] ?? 0;
              return _CalendarCell(count: count, date: date, isDark: isDark);
            }).toList(),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                'Less',
                style: TextStyle(
                  fontSize: 10,
                  color: isDark ? Colors.white54 : Colors.grey,
                ),
              ),
              const SizedBox(width: 4),
              ...List.generate(4, (i) => Container(
                width: 12,
                height: 12,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: _getIntensityColor(i, isDark),
                  borderRadius: BorderRadius.circular(2),
                ),
              )),
              const SizedBox(width: 4),
              Text(
                'More',
                style: TextStyle(
                  fontSize: 10,
                  color: isDark ? Colors.white54 : Colors.grey,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMoodChartSection(Map<String, dynamic> stats, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('MOOD DISTRIBUTION', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 16),
          _MoodPieChart(
            distribution: stats['moodDistribution'] as Map<String, int>,
            isDark: isDark,
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              'Average Mood: ${stats['avgMood']}/10',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white70 : Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEntryBreakdown(Map<String, dynamic> stats, bool isDark) {
    final total = stats['totalEntries'] as int;
    if (total == 0) return const SizedBox.shrink();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ENTRY TYPES', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 12),
          _EntryTypeBar(
            label: 'Journal',
            count: stats['journalCount'] as int,
            total: total,
            color: AppTheme.navy,
            isDark: isDark,
          ),
          const SizedBox(height: 8),
          _EntryTypeBar(
            label: 'Ideas',
            count: stats['brainstormCount'] as int,
            total: total,
            color: const Color(0xFFFFD700),
            isDark: isDark,
          ),
          const SizedBox(height: 8),
          _EntryTypeBar(
            label: 'Voice',
            count: stats['voiceCount'] as int,
            total: total,
            color: const Color(0xFF00FFD5),
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Color _getIntensityColor(int level, bool isDark) {
    final colors = [
      isDark ? AppTheme.darkCard : AppTheme.greyLight,
      const Color(0xFF00FFD5).withValues(alpha: 0.3),
      const Color(0xFF00FFD5).withValues(alpha: 0.6),
      const Color(0xFF00FFD5),
    ];
    return colors[level.clamp(0, 3)];
  }
}

// Helper Widgets

class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color color;
  final bool isDark;

  const _StatCard({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white54 : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}

class _CalendarCell extends StatelessWidget {
  final int count;
  final String date;
  final bool isDark;

  const _CalendarCell({
    required this.count,
    required this.date,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final intensity = count == 0 ? 0 : count == 1 ? 1 : count == 2 ? 2 : 3;
    final colors = [
      isDark ? AppTheme.darkCard : AppTheme.greyLight,
      const Color(0xFF00FFD5).withValues(alpha: 0.3),
      const Color(0xFF00FFD5).withValues(alpha: 0.6),
      const Color(0xFF00FFD5),
    ];

    return Tooltip(
      message: '$date: $count ${count == 1 ? 'entry' : 'entries'}',
      child: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          color: colors[intensity],
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}

class _ChartToggle extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isDark;

  const _ChartToggle({
    required this.icon,
    required this.isSelected,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.navy
              : (isDark ? AppTheme.darkCard : AppTheme.greyLight),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 18,
          color: isSelected ? Colors.white : (isDark ? Colors.white54 : Colors.grey),
        ),
      ),
    );
  }
}

class _MoodLineChart extends StatelessWidget {
  final List<Map<String, dynamic>> moodHistory;
  final bool isDark;

  const _MoodLineChart({required this.moodHistory, required this.isDark});

  @override
  Widget build(BuildContext context) {
    if (moodHistory.isEmpty) {
      return SizedBox(
        height: 120,
        child: Center(
          child: Text(
            'No mood data yet',
            style: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
          ),
        ),
      );
    }

    return SizedBox(
      height: 120,
      child: CustomPaint(
        painter: _LineChartPainter(
          data: moodHistory,
          isDark: isDark,
        ),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  final List<Map<String, dynamic>> data;
  final bool isDark;

  _LineChartPainter({required this.data, required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final paint = Paint()
      ..color = const Color(0xFF00FFD5)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final dotPaint = Paint()
      ..color = const Color(0xFF00FFD5)
      ..style = PaintingStyle.fill;

    final gridPaint = Paint()
      ..color = (isDark ? Colors.white12 : Colors.grey[300])!
      ..strokeWidth = 0.5;

    final path = Path();
    final maxMood = 10.0;
    final padding = 20.0;
    final chartWidth = size.width - padding * 2;
    final chartHeight = size.height - padding;

    // Draw grid lines
    for (int i = 0; i <= 4; i++) {
      final y = padding + (chartHeight / 4) * i;
      canvas.drawLine(
        Offset(padding, y),
        Offset(size.width - padding, y),
        gridPaint,
      );
    }

    // Draw line chart
    for (int i = 0; i < data.length; i++) {
      final x = padding + (i / (data.length - 1)) * chartWidth;
      final mood = (data[i]['mood'] as int).toDouble();
      final y = padding + chartHeight - (mood / maxMood) * chartHeight;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);

    // Draw dots
    for (int i = 0; i < data.length; i++) {
      final x = padding + (i / (data.length - 1)) * chartWidth;
      final mood = (data[i]['mood'] as int).toDouble();
      final y = padding + chartHeight - (mood / maxMood) * chartHeight;
      canvas.drawCircle(Offset(x, y), 4, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _MoodPieChart extends StatelessWidget {
  final Map<String, int> distribution;
  final bool isDark;

  const _MoodPieChart({required this.distribution, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final total = distribution.values.fold<int>(0, (a, b) => a + b);
    if (total == 0) {
      return SizedBox(
        height: 120,
        child: Center(
          child: Text(
            'No mood data yet',
            style: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
          ),
        ),
      );
    }

    final segments = [
      {'label': 'Very Low', 'value': distribution['veryLow'] ?? 0, 'color': const Color(0xFFE53E3E)},
      {'label': 'Low', 'value': distribution['low'] ?? 0, 'color': const Color(0xFFDD6B20)},
      {'label': 'Neutral', 'value': distribution['neutral'] ?? 0, 'color': const Color(0xFFD69E2E)},
      {'label': 'Good', 'value': distribution['good'] ?? 0, 'color': const Color(0xFF38A169)},
      {'label': 'Great', 'value': distribution['great'] ?? 0, 'color': const Color(0xFF3182CE)},
    ].where((s) => (s['value'] as int) > 0).toList();

    return Row(
      children: [
        SizedBox(
          width: 100,
          height: 100,
          child: CustomPaint(
            painter: _PieChartPainter(segments: segments, total: total),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: segments.map((s) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: s['color'] as Color,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${s['label']}: ${s['value']}',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                ],
              ),
            )).toList(),
          ),
        ),
      ],
    );
  }
}

class _PieChartPainter extends CustomPainter {
  final List<Map<String, dynamic>> segments;
  final int total;

  _PieChartPainter({required this.segments, required this.total});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    var startAngle = -math.pi / 2;

    for (final segment in segments) {
      final sweepAngle = 2 * math.pi * (segment['value'] as int) / total;
      final paint = Paint()
        ..color = segment['color'] as Color
        ..style = PaintingStyle.fill;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        true,
        paint,
      );
      startAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _EntryTypeBar extends StatelessWidget {
  final String label;
  final int count;
  final int total;
  final Color color;
  final bool isDark;

  const _EntryTypeBar({
    required this.label,
    required this.count,
    required this.total,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final percent = total > 0 ? (count / total * 100).round() : 0;

    return Row(
      children: [
        SizedBox(
          width: 60,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
        ),
        Expanded(
          child: Stack(
            children: [
              Container(
                height: 20,
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              FractionallySizedBox(
                widthFactor: total > 0 ? count / total : 0,
                child: Container(
                  height: 20,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 50,
          child: Text(
            '$count ($percent%)',
            style: TextStyle(
              fontSize: 11,
              color: isDark ? Colors.white54 : Colors.grey[600],
            ),
          ),
        ),
      ],
    );
  }
}
