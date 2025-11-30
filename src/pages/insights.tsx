import React, { useState, useEffect, useCallback } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

// Mood Line Chart (CSS-based)
const MoodLineChart = ({ moodHistory }: { moodHistory: { date: string; mood: number }[] }) => {
  if (!moodHistory || moodHistory.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No mood data yet</p>;
  }
  
  const maxMood = 100;
  const chartHeight = 140;
  const chartWidth = 320;
  const paddingLeft = 50; // More space for Y-axis label
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40; // More space for X-axis label
  
  // Take last 14 days
  const data = moodHistory.slice(-14);
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const pointSpacing = plotWidth / Math.max(data.length - 1, 1);
  
  const points = data.map((d, i) => ({
    x: paddingLeft + i * pointSpacing,
    y: paddingTop + plotHeight - ((d.mood / maxMood) * plotHeight),
    mood: d.mood,
    date: d.date,
  }));
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  return (
    <div style={{ position: 'relative' }}>
      <svg width={chartWidth} height={chartHeight} style={{ overflow: 'visible' }}>
        {/* Y-axis label */}
        <text 
          x={15} 
          y={chartHeight / 2} 
          fill="var(--fg-dim)" 
          fontSize="11" 
          textAnchor="middle" 
          transform={`rotate(-90, 15, ${chartHeight / 2})`}
        >
          Mood
        </text>
        
        {/* Y-axis tick labels */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = paddingTop + plotHeight - ((v / maxMood) * plotHeight);
          return (
            <text key={`label-${v}`} x={paddingLeft - 8} y={y + 3} fill="var(--muted)" fontSize="9" textAnchor="end">
              {v}
            </text>
          );
        })}
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = paddingTop + plotHeight - ((v / maxMood) * plotHeight);
          return (
            <line key={v} x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} 
              stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
          );
        })}
        
        {/* Y-axis line */}
        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + plotHeight} 
          stroke="var(--border)" strokeWidth="1" />
        
        {/* X-axis line */}
        <line x1={paddingLeft} y1={paddingTop + plotHeight} x2={chartWidth - paddingRight} y2={paddingTop + plotHeight} 
          stroke="var(--border)" strokeWidth="1" />
        
        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--accent-bright)" strokeWidth="2" />
        
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent-bright)" stroke="var(--bg-card)" strokeWidth="2">
            <title>{p.date}: {p.mood}</title>
          </circle>
        ))}
        
        {/* X-axis label */}
        <text 
          x={paddingLeft + plotWidth / 2} 
          y={chartHeight - 5} 
          fill="var(--fg-dim)" 
          fontSize="11" 
          textAnchor="middle"
        >
          Days
        </text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '0.25rem', paddingLeft: paddingLeft, paddingRight: paddingRight }}>
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
};

// Mood Pie Chart (CSS-based)
const MoodPieChart = ({ distribution }: { distribution: { veryLow: number; low: number; neutral: number; good: number; great: number } }) => {
  const total = distribution.veryLow + distribution.low + distribution.neutral + distribution.good + distribution.great;
  if (total === 0) return <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No mood data yet</p>;
  
  const segments = [
    { label: 'Very Low', value: distribution.veryLow, color: '#e53e3e' },
    { label: 'Low', value: distribution.low, color: '#dd6b20' },
    { label: 'Neutral', value: distribution.neutral, color: '#d69e2e' },
    { label: 'Good', value: distribution.good, color: '#38a169' },
    { label: 'Great', value: distribution.great, color: '#3182ce' },
  ].filter(s => s.value > 0);
  
  // Build conic gradient
  let currentAngle = 0;
  const gradientParts = segments.map(segment => {
    const startAngle = currentAngle;
    const angle = (segment.value / total) * 360;
    currentAngle += angle;
    return `${segment.color} ${startAngle}deg ${currentAngle}deg`;
  }).join(', ');
  
  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: `conic-gradient(${gradientParts})`,
        flexShrink: 0,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {segments.map(segment => (
          <div key={segment.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: segment.color }} />
            <span style={{ fontSize: '13px', color: 'var(--fg-dim)' }}>
              {segment.label}: {segment.value} ({Math.round((segment.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple bar for mood visualization
const MoodBar = ({ value, max = 100 }: { value: number; max?: number }) => {
  const percent = Math.round((value / max) * 100);
  const color = value <= 25 ? '#e53e3e' : value <= 50 ? '#d69e2e' : value <= 75 ? '#38a169' : '#3182ce';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: '100px',
        height: '8px',
        background: 'var(--border)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: '13px', color: 'var(--fg-dim)', minWidth: '24px' }}>{value}</span>
    </div>
  );
};

// Streak calendar cell
const CalendarCell = ({ count, date }: { count: number; date: string }) => {
  const intensity = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
  const colors = ['var(--border)', 'rgba(0, 200, 180, 0.3)', 'rgba(0, 200, 180, 0.6)', 'var(--accent)'];
  
  return (
    <div
      title={`${date}: ${count} ${count === 1 ? 'entry' : 'entries'}`}
      style={{
        width: '14px',
        height: '14px',
        borderRadius: '2px',
        background: colors[intensity],
        cursor: 'default',
      }}
    />
  );
};

export default function Insights() {
  const { user, loading: authLoading, token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [moodChartType, setMoodChartType] = useState<'pie' | 'line'>('pie');

  useEffect(() => {
    if (user && token) fetchStats();
  }, [user, token]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
    setLoading(false);
  }, [token]);

  if (authLoading) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <div style={styles.card}>
            <h2 style={{ margin: '0 0 1rem' }}>Sign in to view insights</h2>
            <a href="/auth/login" className="btn btn-primary">Sign In</a>
          </div>
        </main>
      </>
    );
  }

  if (loading || !stats) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        </main>
      </>
    );
  }

  // Prepare calendar data (last 30 days in a grid)
  const calendarEntries = Object.entries(stats.calendar || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      <Nav />
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>Insights</h1>
          <p style={styles.subtitle}>Track your journaling journey</p>
        </header>

        {/* Stats Overview */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Overview</h2>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.stats.currentStreak}</span>
              <span style={styles.statLabel}>Current Streak</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.stats.longestStreak}</span>
              <span style={styles.statLabel}>Longest Streak</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.stats.totalEntries}</span>
              <span style={styles.statLabel}>Total Entries</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.stats.totalPoints}</span>
              <span style={styles.statLabel}>Total Points</span>
            </div>
          </div>
        </section>

        {/* Level Progress */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Level Progress</h2>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>Level {stats.level.current}</span>
              <span style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>{stats.level.title}</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${stats.level.progress}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '12px', color: 'var(--muted)' }}>
              <span>{stats.level.progress}% complete</span>
              {stats.level.pointsToNext > 0 && <span>{stats.level.pointsToNext} points to next level</span>}
            </div>
          </div>
        </section>

        {/* Mood Trends */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Mood Trends</h2>
          <div style={styles.card}>
            <div style={styles.moodRow}>
              <span style={styles.moodLabel}>This Week</span>
              {stats.mood.weeklyAverage !== null ? (
                <MoodBar value={stats.mood.weeklyAverage} />
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>No data</span>
              )}
            </div>
            <div style={styles.moodRow}>
              <span style={styles.moodLabel}>This Month</span>
              {stats.mood.monthlyAverage !== null ? (
                <MoodBar value={stats.mood.monthlyAverage} />
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>No data</span>
              )}
            </div>
            <div style={styles.moodRow}>
              <span style={styles.moodLabel}>All Time</span>
              {stats.mood.allTimeAverage !== null ? (
                <MoodBar value={stats.mood.allTimeAverage} />
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>No data</span>
              )}
            </div>
            {stats.mood.trend && stats.mood.trend !== 'stable' && (
              <p style={{ fontSize: '13px', color: stats.mood.trend === 'up' ? 'var(--success)' : 'var(--error)', marginTop: '0.75rem' }}>
                Mood trending {stats.mood.trend === 'up' ? 'upward' : 'downward'} this week
              </p>
            )}
          </div>
        </section>

        {/* Mood Distribution Chart */}
        {stats.mood.distribution && (
          <section style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={styles.sectionTitle}>Mood Distribution</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className={`btn btn-sm ${moodChartType === 'pie' ? 'btn-primary' : ''}`}
                  onClick={() => setMoodChartType('pie')}
                  style={{ fontSize: '11px', padding: '0.25rem 0.5rem' }}
                >
                  Pie
                </button>
                <button 
                  className={`btn btn-sm ${moodChartType === 'line' ? 'btn-primary' : ''}`}
                  onClick={() => setMoodChartType('line')}
                  style={{ fontSize: '11px', padding: '0.25rem 0.5rem' }}
                >
                  Line
                </button>
              </div>
            </div>
            <div style={styles.card}>
              {moodChartType === 'pie' ? (
                <MoodPieChart distribution={stats.mood.distribution} />
              ) : (
                <MoodLineChart moodHistory={stats.mood.history || []} />
              )}
            </div>
          </section>
        )}

        {/* Activity Calendar */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Last 30 Days</h2>
          <div style={styles.card}>
            <div style={styles.calendarGrid}>
              {calendarEntries.map(([date, count]) => (
                <CalendarCell key={date} date={date} count={count as number} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Less</span>
              <CalendarCell count={0} date="" />
              <CalendarCell count={1} date="" />
              <CalendarCell count={2} date="" />
              <CalendarCell count={3} date="" />
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>More</span>
            </div>
          </div>
        </section>

        
        {stats.activities && stats.activities.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Top Activities</h2>
            <div style={styles.card}>
              <div style={styles.activityList}>
                {stats.activities.map((act: any) => (
                  <div key={act.activity} style={styles.activityItem}>
                    <span style={{ textTransform: 'capitalize' }}>{act.activity}</span>
                    <span style={{ color: 'var(--muted)' }}>{act.count} {act.count === 1 ? 'entry' : 'entries'}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Badges */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Badges ({stats.badges.earned.length}/{stats.badges.total})</h2>
          
          {stats.badges.earned.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earned</h3>
              <div style={styles.badgeGrid}>
                {stats.badges.earned.map((badge: any) => (
                  <div key={badge.id} style={styles.badge}>
                    <span style={styles.badgeIcon}>{badge.icon}</span>
                    <div>
                      <span style={styles.badgeName}>{badge.name}</span>
                      <span style={styles.badgeDesc}>{badge.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {stats.badges.next.length > 0 && (
            <div style={{ ...styles.card, marginTop: '1rem', opacity: 0.7 }}>
              <h3 style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Up Next</h3>
              <div style={styles.badgeGrid}>
                {stats.badges.next.map((badge: any) => (
                  <div key={badge.id} style={styles.badge}>
                    <span style={{ ...styles.badgeIcon, filter: 'grayscale(1)' }}>{badge.icon}</span>
                    <div>
                      <span style={styles.badgeName}>{badge.name}</span>
                      <span style={styles.badgeDesc}>{badge.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Motivational Message */}
        {stats.motivationalMessage && (
          <section style={{ ...styles.card, textAlign: 'center', marginTop: '2rem' }}>
            <p style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--fg-dim)', margin: 0 }}>
              {stats.motivationalMessage}
            </p>
          </section>
        )}
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '2.5rem 1rem 4rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--fg)',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--muted)',
    margin: '0.375rem 0 0',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    margin: '0 0 0.75rem',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  card: {
    background: 'var(--bg-card)',
    padding: '1.25rem',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  statCard: {
    background: 'var(--bg-card)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--accent-bright)',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  progressBar: {
    height: '8px',
    background: 'var(--border)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent), var(--accent-bright))',
    transition: 'width 0.3s ease',
  },
  moodRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border)',
  },
  moodLabel: {
    fontSize: '14px',
    color: 'var(--fg)',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(10, 1fr)',
    gap: '4px',
  },
  keywordList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  keyword: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    background: 'var(--bg)',
    padding: '0.375rem 0.625rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    border: '1px solid var(--border)',
  },
  keywordCount: {
    fontSize: '11px',
    color: 'var(--accent-bright)',
    fontWeight: 600,
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border)',
    fontSize: '14px',
  },
  badgeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  badgeIcon: {
    fontSize: '24px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    borderRadius: '50%',
    border: '1px solid var(--border)',
  },
  badgeName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--fg)',
  },
  badgeDesc: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--muted)',
  },
};
