import React, { useState } from 'react';

interface PromptCardProps {
  prompt: {
    id: string;
    category: string;
    question: string;
    rationale: string;
    icon: string;
  };
  isSelected: boolean;
  answer: string | undefined;
  onToggle: () => void;
  onAnswerChange: (answer: string) => void;
}

export default function PromptCard({
  prompt,
  isSelected,
  answer,
  onToggle,
  onAnswerChange,
}: PromptCardProps) {
  const [showRationale, setShowRationale] = useState(false);

  return (
    <div
      style={{
        ...styles.card,
        background: isSelected ? 'rgba(0, 255, 213, 0.1)' : 'var(--bg)',
        borderColor: isSelected ? 'var(--accent)' : 'var(--muted)',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          ...styles.header,
          color: isSelected ? 'var(--accent)' : 'var(--fg)',
        }}
      >
        <span style={styles.checkbox}>{isSelected ? '☑' : '☐'}</span>
        <span style={styles.icon}>{prompt.icon}</span>
        <span style={styles.category}>{prompt.category}</span>
      </button>

      <p style={styles.question}>{prompt.question}</p>

      {isSelected && (
        <div style={styles.answerSection}>
          <textarea
            placeholder="Your answer..."
            value={answer || ''}
            onChange={e => onAnswerChange(e.target.value)}
            rows={4}
            style={styles.textarea}
          />
        </div>
      )}

      <button
        onClick={() => setShowRationale(!showRationale)}
        style={styles.rationaleButton}
      >
        {showRationale ? '▼ Why this?' : '▶ Why this?'}
      </button>

      {showRationale && <p style={styles.rationale}>{prompt.rationale}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '2px solid var(--muted)',
    padding: '1rem',
    background: 'var(--bg)',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--fg)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'monospace',
    fontSize: '0.65rem',
    padding: 0,
    transition: 'all 0.2s',
  },
  checkbox: {
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  icon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  category: {
    fontWeight: 700,
    fontSize: '0.65rem',
    lineHeight: 1.3,
  },
  question: {
    fontSize: '0.7rem',
    lineHeight: 1.5,
    margin: '0.5rem 0 0',
    color: 'var(--fg)',
  },
  answerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  textarea: {
    width: '100%',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--accent)',
    padding: '0.5rem',
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    lineHeight: 1.4,
    resize: 'vertical',
  },
  rationaleButton: {
    background: 'transparent',
    color: 'var(--muted)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.6rem',
    textAlign: 'left',
    padding: 0,
    transition: 'color 0.2s',
  },
  rationale: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    lineHeight: 1.4,
    margin: 0,
    padding: '0.75rem',
    background: 'rgba(0, 255, 213, 0.05)',
    borderLeft: '2px solid var(--accent)',
  },
};
