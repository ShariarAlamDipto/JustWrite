import React, { useState, memo, useCallback } from 'react';

type Task = { id: string; title: string; description?: string; priority?: string };

const DistillView = memo(function DistillView({ open, onClose, entry, summary, tasks, onSave }: any) {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await onSave?.(tasks);
    setSaving(false);
  }, [onSave, tasks]);

  if (!open) return null;

  const previewText = entry.content.slice(0, 100) + (entry.content.length > 100 ? '…' : '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={styles.modal}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h2 style={styles.title}>Distill Complete</h2>
            <p style={styles.date}>
              {new Date(entry.created_at).toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">
            ×
          </button>
        </header>

        {/* Original Entry */}
        <section style={styles.section}>
          <p style={styles.preview}>{previewText}</p>
        </section>

        {/* AI Summary */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Summary</h3>
          <p style={styles.summaryText}>{summary || 'No summary available.'}</p>
        </section>

        {/* Extracted Tasks */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>
            Tasks <span style={styles.badge}>{tasks?.length || 0}</span>
          </h3>
          
          {(!tasks || tasks.length === 0) ? (
            <p style={styles.noTasks}>No tasks extracted</p>
          ) : (
            <div style={styles.taskList}>
              {tasks.map((t: Task) => (
                <div key={t.id} style={styles.taskItem}>
                  <div style={styles.taskDot} />
                  <div style={styles.taskContent}>
                    <span style={styles.taskTitle}>{t.title}</span>
                    {t.description && (
                      <p style={styles.taskDesc}>{t.description}</p>
                    )}
                    <span style={styles.taskPriority}>{t.priority || 'medium'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <footer style={styles.footer}>
          <button 
            onClick={handleSave} 
            disabled={saving || !tasks?.length} 
            style={{
              ...styles.addBtn,
              opacity: saving || !tasks?.length ? 0.4 : 1,
            }}
          >
            {saving ? 'Adding…' : 'Add to tasks'}
          </button>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  modal: {
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: '11px',
    fontWeight: 400,
    margin: 0,
    color: 'var(--accent)',
    letterSpacing: '0.08em',
  },
  date: {
    fontSize: '8px',
    color: 'var(--muted)',
    margin: '0.375rem 0 0',
  },
  closeBtn: {
    background: 'transparent',
    color: 'var(--fg-dim)',
    border: '1px solid var(--border)',
    width: '28px',
    height: '28px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  section: {
    marginBottom: '1.5rem',
  },
  preview: {
    fontSize: '11px',
    lineHeight: 1.6,
    color: 'var(--fg-dim)',
    margin: 0,
    padding: '0.875rem',
    background: 'var(--bg)',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  sectionTitle: {
    fontSize: '8px',
    fontWeight: 400,
    margin: '0 0 0.75rem',
    color: 'var(--fg-dim)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  badge: {
    fontSize: '8px',
    color: 'var(--accent)',
    background: 'var(--accent-glow)',
    padding: '0.15rem 0.4rem',
    borderRadius: '8px',
  },
  summaryText: {
    fontSize: '10px',
    lineHeight: 1.7,
    color: 'var(--fg)',
    margin: 0,
    padding: '0.875rem',
    background: 'var(--bg)',
    borderRadius: '4px',
    border: '1px solid var(--border)',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  taskItem: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    padding: '0.75rem',
    background: 'var(--bg)',
    border: '1px solid var(--accent)',
    borderRadius: '4px',
  },
  taskDot: {
    width: '8px',
    height: '8px',
    minWidth: '8px',
    borderRadius: '50%',
    background: 'var(--accent)',
    marginTop: '4px',
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: '10px',
    color: 'var(--fg)',
    display: 'block',
    lineHeight: 1.4,
  },
  taskDesc: {
    fontSize: '9px',
    color: 'var(--muted)',
    margin: '0.375rem 0 0',
    lineHeight: 1.5,
  },
  taskPriority: {
    fontSize: '7px',
    color: 'var(--accent)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginTop: '0.5rem',
    display: 'inline-block',
  },
  noTasks: {
    fontSize: '9px',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '1.5rem',
    border: '1px dashed var(--border)',
    borderRadius: '4px',
    margin: 0,
  },
  footer: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
  },
  addBtn: {
    flex: 2,
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: '4px',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '8px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.05em',
  },
  cancelBtn: {
    flex: 1,
    background: 'transparent',
    color: 'var(--fg-dim)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.05em',
  },
};

export default DistillView;
