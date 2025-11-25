import React from 'react';

interface MoodSliderProps {
  mood: number;
  intensity: number;
  onMoodChange: (mood: number) => void;
  onIntensityChange: (intensity: number) => void;
}

const MOODS = [
  { value: 1, emoji: '😢', label: 'Very sad' },
  { value: 2, emoji: '😔', label: 'Sad' },
  { value: 3, emoji: '😕', label: 'Okay' },
  { value: 4, emoji: '😐', label: 'Neutral' },
  { value: 5, emoji: '🙂', label: 'Good' },
  { value: 6, emoji: '😊', label: 'Happy' },
  { value: 7, emoji: '😄', label: 'Very happy' },
  { value: 8, emoji: '🤗', label: 'Excited' },
  { value: 9, emoji: '🤩', label: 'Elated' },
  { value: 10, emoji: '🌟', label: 'Amazing' },
];

export default function MoodSlider({
  mood,
  intensity,
  onMoodChange,
  onIntensityChange,
}: MoodSliderProps) {
  const currentMood = MOODS.find(m => m.value === mood);

  return (
    <div style={styles.container}>
      <div style={styles.moodSection}>
        <label style={styles.label}>Mood</label>
        <div style={styles.moodGrid}>
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => onMoodChange(m.value)}
              style={{
                ...styles.moodButton,
                background: mood === m.value ? 'rgba(0, 255, 213, 0.2)' : 'transparent',
                border:
                  mood === m.value ? '2px solid var(--accent)' : '2px solid var(--muted)',
              }}
              title={m.label}
            >
              <span style={styles.moodEmoji}>{m.emoji}</span>
              <span style={styles.moodLabel}>{m.value}</span>
            </button>
          ))}
        </div>
        {currentMood && (
          <p style={styles.moodLabel}>{currentMood.emoji} {currentMood.label}</p>
        )}
      </div>

      <div style={styles.intensitySection}>
        <label style={styles.label}>Intensity (0–10)</label>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min="0"
            max="10"
            value={intensity}
            onChange={e => onIntensityChange(parseInt(e.target.value))}
            style={styles.slider}
          />
          <div style={styles.intensityDisplay}>
            <span style={styles.intensityValue}>{intensity}</span>
            <span style={styles.intensityBar}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.bar,
                    background:
                      i < intensity
                        ? intensity >= 8
                          ? '#ff3bff'
                          : intensity >= 5
                            ? 'var(--accent)'
                            : '#00d9ff'
                        : 'var(--muted)',
                  }}
                />
              ))}
            </span>
          </div>
        </div>
        <p style={styles.hint}>How strong is this feeling right now?</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  moodSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  intensitySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  label: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
    margin: 0,
  },
  moodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))',
    gap: '0.5rem',
  },
  moodButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    background: 'transparent',
    border: '2px solid var(--muted)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '50px',
  },
  moodEmoji: {
    fontSize: '1.5rem',
    marginBottom: '0.25rem',
  },
  moodLabel: {
    fontSize: '0.55rem',
    color: 'var(--muted)',
    textAlign: 'center',
    lineHeight: 1.2,
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: 'var(--muted)',
    outline: 'none',
    WebkitAppearance: 'none',
  },
  intensityDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  intensityValue: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--accent)',
    minWidth: '30px',
    textAlign: 'center',
  },
  intensityBar: {
    display: 'flex',
    gap: '2px',
    flex: 1,
  },
  bar: {
    flex: 1,
    height: '8px',
    background: 'var(--muted)',
    transition: 'background 0.2s',
  },
  hint: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    margin: 0,
  },
};
