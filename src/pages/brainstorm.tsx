import React, { useState } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

export default function BrainstormPage() {
  const { user, loading: authLoading, token } = useAuth();
  const [freeText, setFreeText] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [addingTasks, setAddingTasks] = useState(false);

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
        const tasksWithIds = (json.tasks || []).map((t: any, i: number) => ({
          ...t,
          id: `task-${Date.now()}-${i}`
        }));
        setGeneratedTasks(tasksWithIds);
        // Auto-select all tasks
        setSelectedTasks(new Set(tasksWithIds.map((t: any) => t.id)));
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

  const toggleTask = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTasks(newSelected);
  };

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratedTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleAddSelected = async () => {
    if (selectedTasks.size === 0) return;
    setAddingTasks(true);

    const tasksToAdd = generatedTasks.filter(t => selectedTasks.has(t.id));

    try {
      const results = await Promise.all(
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
              status: 'todo',
            }),
          })
        )
      );
      
      const allSuccess = results.every(r => r.ok);
      if (allSuccess) {
        setSelectedTasks(new Set());
        setGeneratedTasks([]);
        setFreeText('');
        alert(`✓ Added ${tasksToAdd.length} task(s) to your to-do list!`);
      } else {
        alert('Some tasks failed to add. Please try again.');
      }
    } catch (err) {
      console.error('Failed to add tasks:', err);
      alert('Failed to add tasks. Please try again.');
    }
    setAddingTasks(false);
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

  if (!user) {
    return (
      <>
        <Nav />
        <div style={styles.container}>
          <p style={styles.error}>Please sign in to use Brainstorm.</p>
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
            rows={6}
            style={styles.textarea}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !freeText.trim()}
            style={{
              ...styles.btnPrimary,
              opacity: loading || !freeText.trim() ? 0.5 : 1,
            }}
          >
            {loading ? 'ANALYZING…' : 'GENERATE TASKS'}
          </button>
        </div>

        {/* Generated Tasks */}
        {generatedTasks.length > 0 && (
          <div style={styles.section}>
            <label style={styles.label}>
              EXTRACTED TASKS ({generatedTasks.length})
            </label>
            <p style={styles.hint}>Tap to select/deselect. Use ✕ to remove a task.</p>
            
            <div style={styles.taskList}>
              {generatedTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    ...styles.taskItem,
                    background: selectedTasks.has(task.id)
                      ? 'rgba(0, 255, 213, 0.15)'
                      : 'transparent',
                    borderColor: selectedTasks.has(task.id)
                      ? 'var(--accent)'
                      : 'var(--muted)',
                  }}
                  onClick={(e) => toggleTask(task.id, e)}
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={(e) => toggleTask(task.id, e)}
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
                  <button
                    onClick={(e) => deleteTask(task.id, e)}
                    style={styles.deleteBtn}
                    aria-label="Delete task"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={styles.actions}>
              <button
                onClick={handleAddSelected}
                disabled={selectedTasks.size === 0 || addingTasks}
                style={{
                  ...styles.btnPrimary,
                  flex: 2,
                  opacity: selectedTasks.size === 0 || addingTasks ? 0.5 : 1,
                }}
              >
                {addingTasks ? 'ADDING...' : `ADD (${selectedTasks.size}) TO LIST`}
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

        {/* Tips */}
        <div style={styles.section}>
          <label style={styles.label}>TIPS</label>
          <ul style={styles.tipsList}>
            <li>Use action words: fix, create, review, update</li>
            <li>One task per line for best results</li>
            <li>Add "urgent" to mark as high priority</li>
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
    padding: '0 12px 2rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1rem',
    margin: '0 0 0.5rem',
    color: 'var(--accent)',
    textShadow: '0 0 10px rgba(0, 255, 213, 0.3)',
    letterSpacing: '0.1em',
  },
  subtitle: {
    fontSize: '0.6rem',
    color: 'var(--muted)',
    margin: 0,
    letterSpacing: '0.05em',
  },
  label: {
    display: 'block',
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  hint: {
    fontSize: '0.55rem',
    color: 'var(--muted)',
    marginBottom: '0.75rem',
  },
  textarea: {
    width: '100%',
    minHeight: '150px',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--muted)',
    padding: '0.75rem',
    fontFamily: 'monospace',
    fontSize: '16px',
    lineHeight: 1.6,
    resize: 'vertical',
    boxSizing: 'border-box' as const,
  },
  btnPrimary: {
    width: '100%',
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.85rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.55rem',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.2s',
    marginTop: '0.75rem',
    minHeight: '48px',
  },
  btnSecondary: {
    flex: 1,
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.85rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.55rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '48px',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  taskItem: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    background: 'var(--bg)',
    border: '2px solid var(--muted)',
    padding: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
  },
  checkbox: {
    width: '22px',
    height: '22px',
    minWidth: '22px',
    marginTop: '2px',
    cursor: 'pointer',
    accentColor: 'var(--accent)',
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--fg)',
    marginBottom: '0.4rem',
    wordBreak: 'break-word' as const,
  },
  taskDesc: {
    fontSize: '0.6rem',
    color: 'var(--muted)',
    marginBottom: '0.4rem',
    lineHeight: 1.5,
    wordBreak: 'break-word' as const,
  },
  taskPriority: {
    fontSize: '0.55rem',
    color: 'var(--muted)',
  },
  deleteBtn: {
    background: 'rgba(255, 59, 255, 0.2)',
    color: '#ff3bff',
    border: '1px solid #ff3bff',
    width: '36px',
    height: '36px',
    minWidth: '36px',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    padding: 0,
  },
  actions: {
    display: 'flex',
    gap: '0.6rem',
    marginTop: '1rem',
    flexWrap: 'wrap' as const,
  },
  tipsList: {
    fontSize: '0.6rem',
    color: 'var(--muted)',
    lineHeight: 1.8,
    paddingLeft: '1.25rem',
    margin: 0,
  },
  loading: {
    fontSize: '0.7rem',
    color: 'var(--fg)',
    textAlign: 'center',
    padding: '2rem',
  },
  error: {
    fontSize: '0.7rem',
    color: '#ff3bff',
    textAlign: 'center',
    padding: '2rem',
  },
};
