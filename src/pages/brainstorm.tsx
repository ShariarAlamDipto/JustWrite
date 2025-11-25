import React, { useState } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

export default function BrainstormPage() {
  const { user, loading: authLoading, token } = useAuth();
  const [freeText, setFreeText] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    if (!freeText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ text: freeText }),
      });
      if (res.ok) {
        const json = await res.json();
        setGeneratedTasks(json.tasks || []);
      } else {
        const err = await res.json();
        console.error('Failed to generate tasks:', err.error);
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to generate tasks:', err);
    }
    setLoading(false);
  };

  const toggleTask = (id: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTasks(newSelected);
  };

  const handleAddSelected = async () => {
    if (selectedTasks.size === 0) return;

    const tasksToAdd = generatedTasks.filter(t => selectedTasks.has(t.id));

    try {
      await Promise.all(
        tasksToAdd.map(t =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`
            },
            body: JSON.stringify({
              title: t.title,
              description: t.description,
              priority: t.priority,
            }),
          })
        )
      );
      setSelectedTasks(new Set());
      setGeneratedTasks([]);
      setFreeText('');
      alert(`✓ Added ${tasksToAdd.length} task(s) to your to-do list!`);
    } catch (err) {
      console.error('Failed to add tasks:', err);
    }
  };

  if (authLoading) {
    return (
      <>
        <Nav />
        <div style={styles.container}>
          <p style={styles.loading}>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={styles.container}>
        <div style={styles.section}>
          <h1 style={styles.title}>BRAINSTORM</h1>
          <p style={styles.subtitle}>Turn your thoughts into tasks</p>
        </div>

        {/* Free-form Input */}
        <div style={styles.section}>
          <label style={styles.label}>YOUR THOUGHTS</label>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder="Write anything... ideas, todos, notes, reminders..."
            rows={8}
            style={styles.textarea}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !freeText.trim()}
            style={styles.btnPrimary}
          >
            {loading ? 'ANALYZING…' : 'GENERATE TASKS'}
          </button>
        </div>

        {/* Generated Tasks */}
        {generatedTasks.length > 0 && (
          <div style={styles.section}>
            <label style={styles.label}>EXTRACTED TASKS ({generatedTasks.length})</label>
            <div style={styles.taskList}>
              {generatedTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    ...styles.taskItem,
                    background: selectedTasks.has(task.id)
                      ? 'rgba(0, 255, 213, 0.1)'
                      : 'transparent',
                    borderColor: selectedTasks.has(task.id)
                      ? 'var(--accent)'
                      : 'var(--muted)',
                  }}
                  onClick={() => toggleTask(task.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => toggleTask(task.id)}
                    style={styles.checkbox}
                  />
                  <div style={styles.taskContent}>
                    <div style={styles.taskTitle}>{task.title}</div>
                    {task.description && (
                      <div style={styles.taskDesc}>{task.description}</div>
                    )}
                    <div style={styles.taskPriority}>
                      Priority: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                        {task.priority || 'medium'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.actions}>
              <button
                onClick={handleAddSelected}
                disabled={selectedTasks.size === 0}
                style={styles.btnPrimary}
              >
                ADD SELECTED ({selectedTasks.size}) TO TO-DO LIST
              </button>
              <button
                onClick={() => {
                  setGeneratedTasks([]);
                  setSelectedTasks(new Set());
                }}
                style={styles.btnSecondary}
              >
                CLEAR
              </button>
            </div>
          </div>
        )}

        {/* No Tasks Message */}
        {freeText.trim() && generatedTasks.length === 0 && !loading && (
          <div style={styles.section}>
            <p style={styles.emptyState}>
              No tasks extracted. Try being more specific or add action words like "fix", "create", "implement", etc.
            </p>
          </div>
        )}

        {/* Tips */}
        <div style={styles.section}>
          <label style={styles.label}>TIPS</label>
          <ul style={styles.tipsList}>
            <li>Use action words: fix, create, implement, review, update, etc.</li>
            <li>One task per line or sentence for best results</li>
            <li>Add urgency words like "urgent" or "critical" to mark as high priority</li>
            <li>Example: "Fix the auth bug, update documentation, deploy to production"</li>
          </ul>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '0 1rem 2rem',
  },
  section: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.2rem',
    margin: '0 0 0.5rem',
    color: 'var(--accent)',
    textShadow: '0 0 10px rgba(0, 255, 213, 0.3)',
    letterSpacing: '0.1em',
  },
  subtitle: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    margin: 0,
    letterSpacing: '0.05em',
  },
  label: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--muted)',
    padding: '1rem',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    lineHeight: 1.6,
    resize: 'vertical',
  },
  btnPrimary: {
    width: '100%',
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.2s',
    marginTop: '0.75rem',
  },
  btnSecondary: {
    flex: 1,
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  taskItem: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    background: 'var(--bg)',
    border: '2px solid var(--muted)',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    cursor: 'pointer',
    accentColor: 'var(--accent)',
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--fg)',
    marginBottom: '0.5rem',
  },
  taskDesc: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
    lineHeight: 1.5,
  },
  taskPriority: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  emptyState: {
    fontSize: '0.75rem',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '2rem 1rem',
  },
  tipsList: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    lineHeight: 1.8,
    paddingLeft: '1.5rem',
  },
  loading: {
    fontSize: '0.75rem',
    color: 'var(--fg)',
    textAlign: 'center',
    padding: '2rem',
  },
};
