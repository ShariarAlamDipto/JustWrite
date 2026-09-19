import React, { useMemo } from 'react'

interface StreakBoxProps {
  calendar: Record<string, number>
  currentStreak: number
  longestStreak: number
}

interface StreakDay {
  date: string
  count: number
  inFuture: boolean
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 86400000

function levelForCount(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

const LEVEL_COLORS = [
  'var(--border)',
  'rgba(49, 130, 206, 0.25)',
  'rgba(49, 130, 206, 0.5)',
  'rgba(49, 130, 206, 0.75)',
  'var(--accent-bright)',
]

function buildWeeks(calendar: Record<string, number>): StreakDay[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start 52 full weeks back, then rewind to the preceding Sunday so columns line up.
  const start = new Date(today.getTime() - 52 * 7 * DAY_MS)
  start.setDate(start.getDate() - start.getDay())

  const days: StreakDay[] = []
  for (let d = new Date(start); d <= today; d = new Date(d.getTime() + DAY_MS)) {
    const dateStr = d.toISOString().split('T')[0]
    days.push({ date: dateStr, count: calendar[dateStr] ?? 0, inFuture: false })
  }
  // Pad the final week out to Saturday so every column has 7 cells.
  while (days.length % 7 !== 0) {
    const last = new Date(days[days.length - 1].date)
    const next = new Date(last.getTime() + DAY_MS)
    days.push({ date: next.toISOString().split('T')[0], count: 0, inFuture: true })
  }

  const weeks: StreakDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

export default function StreakBox({ calendar, currentStreak, longestStreak }: StreakBoxProps) {
  const weeks = useMemo(() => buildWeeks(calendar), [calendar])
  const totalInRange = useMemo(
    () => weeks.flat().reduce((sum, d) => sum + d.count, 0),
    [weeks]
  )

  const monthLabels = useMemo(() => {
    const labels: { weekIndex: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, weekIndex) => {
      const firstDay = new Date(week[0].date)
      const month = firstDay.getMonth()
      if (month !== lastMonth) {
        labels.push({ weekIndex, label: MONTH_LABELS[month] })
        lastMonth = month
      }
    })
    return labels
  }, [weeks])

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerStat}>
          <span style={styles.flame}>🔥</span>
          <span style={styles.headerValue}>{currentStreak}</span>
          <span style={styles.headerLabel}>day streak</span>
        </div>
        <div style={styles.headerDivider} />
        <div style={styles.headerStat}>
          <span style={styles.headerValue}>{longestStreak}</span>
          <span style={styles.headerLabel}>longest streak</span>
        </div>
        <div style={styles.headerDivider} />
        <div style={styles.headerStat}>
          <span style={styles.headerValue}>{totalInRange}</span>
          <span style={styles.headerLabel}>entries this year</span>
        </div>
      </div>

      <div style={styles.scroller}>
        <div style={styles.graph}>
          <div style={styles.monthRow}>
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={`${label}-${weekIndex}`}
                style={{ ...styles.monthLabel, gridColumnStart: weekIndex + 1 }}
              >
                {label}
              </span>
            ))}
          </div>
          <div style={styles.weeksRow}>
            {weeks.map((week) => (
              <div key={week[0].date} style={styles.weekColumn}>
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={day.inFuture ? undefined : `${day.date}: ${day.count} ${day.count === 1 ? 'entry' : 'entries'}`}
                    style={{
                      ...styles.cell,
                      background: day.inFuture ? 'transparent' : LEVEL_COLORS[levelForCount(day.count)],
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.legend}>
        <span style={styles.legendLabel}>Less</span>
        {LEVEL_COLORS.map((color) => (
          <div key={color} style={{ ...styles.cell, background: color }} />
        ))}
        <span style={styles.legendLabel}>More</span>
      </div>
    </div>
  )
}

const CELL_SIZE = 11
const CELL_GAP = 3

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  },
  headerStat: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.375rem',
  },
  flame: { fontSize: '15px' },
  headerValue: { fontSize: '18px', fontWeight: 700, color: 'var(--fg)' },
  headerLabel: { fontSize: '12px', color: 'var(--muted)' },
  headerDivider: { width: '1px', height: '16px', background: 'var(--border)' },
  scroller: { overflowX: 'auto' as const, paddingBottom: '0.25rem' },
  graph: { display: 'inline-flex', flexDirection: 'column' as const, minWidth: '100%' },
  monthRow: {
    display: 'grid',
    gridAutoFlow: 'column' as const,
    gridAutoColumns: `${CELL_SIZE + CELL_GAP}px`,
    marginBottom: '0.25rem',
  },
  monthLabel: { fontSize: '11px', color: 'var(--muted)' },
  weeksRow: { display: 'flex', gap: `${CELL_GAP}px` },
  weekColumn: { display: 'flex', flexDirection: 'column' as const, gap: `${CELL_GAP}px` },
  cell: {
    width: `${CELL_SIZE}px`,
    height: `${CELL_SIZE}px`,
    borderRadius: '2px',
  },
  legend: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '0.25rem',
    marginTop: '0.75rem',
  },
  legendLabel: { fontSize: '11px', color: 'var(--muted)', margin: '0 0.25rem' },
}
