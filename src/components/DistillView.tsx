import React, { useState } from 'react';

type Task = { id: string; title: string; description?: string; priority?: string };

export default function DistillView({ open, onClose, entry, summary, tasks, onSave }: any) {
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const initialBits = entry.content.slice(0, 120) + (entry.content.length > 120 ? '…' : '');

  const handleSave = async () => {
    setSaving(true);
    await onSave?.(tasks);
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.timestamp}>DISTILL COMPLETE</div>
            <div style={styles.dateTime}>{new Date(entry.created_at).toLocaleString()}</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Entry Preview */}
        <div style={styles.section}>
          <div style={styles.entryPreview}>{initialBits}</div>
        </div>

        {/* AI Summary */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>AI SUMMARY</div>
          <div style={styles.summaryText}>{summary || 'No summary available.'}</div>
        </div>

        {/* Extracted Tasks */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>TASKS ({tasks?.length || 0})</div>
          {(!tasks || tasks.length === 0) ? (
            <div style={styles.noTasks}>No tasks extracted.</div>
          ) : (
            <div style={styles.tasksList}>
              {tasks.map((t: Task) => (
                <div key={t.id} style={styles.taskItem}>
                  <div style={styles.taskTitle}>{t.title}</div>
                  {t.description && <div style={styles.taskDesc}>{t.description}</div>}
                  <div style={styles.taskMeta}>Priority: {t.priority || 'medium'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button onClick={handleSave} disabled={saving} style={styles.btnPrimary}>
            {saving ? 'Saving…' : 'ADD TO TO‑DO'}
          </button>
          <button onClick={onClose} style={styles.btnSecondary}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    maxHeight: '90vh',
    overflowY: 'auto',
    animation: 'slideUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid var(--accent)',
  },
  timestamp: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
  },
  dateTime: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    marginTop: '0.25rem',
  },
  closeBtn: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.5rem',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  section: {
    marginBottom: '1.5rem',
  },
  entryPreview: {
    fontSize: '0.8rem',
    lineHeight: 1.6,
    color: 'var(--fg)',
    padding: '1rem',
    background: 'var(--bg)',
    border: '2px solid var(--muted)',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
  },
  summaryText: {
    fontSize: '0.75rem',
    lineHeight: 1.7,
    color: 'var(--fg)',
    background: 'var(--bg)',
    padding: '1rem',
    border: '1px solid var(--muted)',
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  taskItem: {
    padding: '0.75rem',
    background: 'var(--bg)',
    border: '2px solid var(--accent)',
    boxShadow: '0 0 10px rgba(0, 255, 213, 0.2)',
  },
  taskTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  taskDesc: {
    fontSize: '0.65rem',
    color: 'var(--fg)',
    marginTop: '0.5rem',
    lineHeight: 1.5,
  },
  taskMeta: {
    fontSize: '0.6rem',
    color: 'var(--muted)',
    marginTop: '0.5rem',
  },
  noTasks: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    padding: '1rem',
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '2px solid var(--muted)',
  },
  btnPrimary: {
    flex: 1,
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.6rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    flex: 1,
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.6rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
