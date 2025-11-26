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
        setSelectedTasks(new Set(tasksWithIds.map((t: any) => t.id)));
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed:', err);
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
      
      if (results.every(r => r.ok)) {
        setSelectedTasks(new Set());
        setGeneratedTasks([]);
        setFreeText('');
        alert(`✓ Added ${tasksToAdd.length} task(s)!`);
      } else {
        alert('Some tasks failed. Try again.');
      }
    } catch (err) {
      alert('Failed to add tasks.');
    }
    setAddingTasks(false);
  };

  if (authLoading) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <p style={styles.loading}>Loading…</p>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <p style={styles.authMsg}>Sign in to brainstorm</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>Brainstorm</h1>
          <p style={styles.subtitle}>Dump ideas → Get tasks</p>
        </header>

        {/* Input */}
        <section style={styles.section}>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder="Write anything… ideas, todos, notes…"
            style={styles.textarea}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !freeText.trim()}
            style={{
              ...styles.generateBtn,
              opacity: loading || !freeText.trim() ? 0.4 : 1,
            }}
          >
            {loading ? 'Analyzing…' : 'Extract tasks'}
          </button>
        </section>

        {/* Generated Tasks */}
        {generatedTasks.length > 0 && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Extracted</h2>
              <span style={styles.count}>{selectedTasks.size}/{generatedTasks.length}</span>
            </div>
            
            <div style={styles.taskList}>
              {generatedTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    ...styles.taskItem,
                    borderColor: selectedTasks.has(task.id) ? 'var(--accent)' : 'var(--border)',
                    background: selectedTasks.has(task.id) ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  }}
                >
                  <div style={{
                    ...styles.checkbox,
                    background: selectedTasks.has(task.id) ? 'var(--accent)' : 'transparent',
                    borderColor: selectedTasks.has(task.id) ? 'var(--accent)' : 'var(--border)',
                  }}>
                    {selectedTasks.has(task.id) && '✓'}
                  </div>
                  
                  <div style={styles.taskContent}>
                    <span style={styles.taskTitle}>{task.title}</span>
                    {task.description && (
                      <p style={styles.taskDesc}>{task.description}</p>
                    )}
                    <span style={styles.taskPriority}>
                      {task.priority || 'medium'}
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => deleteTask(task.id, e)}
                    style={styles.deleteBtn}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div style={styles.actions}>
              <button
                onClick={handleAddSelected}
                disabled={selectedTasks.size === 0 || addingTasks}
                style={{
                  ...styles.addBtn,
                  opacity: selectedTasks.size === 0 || addingTasks ? 0.4 : 1,
                }}
              >
                {addingTasks ? 'Adding…' : `Add ${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => {
                  setGeneratedTasks([]);
                  setSelectedTasks(new Set());
                }}
                style={styles.clearBtn}
              >
                Clear
              </button>
            </div>
          </section>
        )}

        {/* Tips */}
        {generatedTasks.length === 0 && (
          <section style={styles.tips}>
            <p style={styles.tipTitle}>Tips</p>
            <ul style={styles.tipList}>
              <li>Use action words: fix, create, update</li>
              <li>One idea per line works best</li>
              <li>Add "urgent" for high priority</li>
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '1.5rem 1rem 3rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '14px',
    fontWeight: 400,
    margin: 0,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
  },
  subtitle: {
    fontSize: '9px',
    color: 'var(--muted)',
    margin: '0.5rem 0 0',
    letterSpacing: '0.05em',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '9px',
    fontWeight: 400,
    margin: 0,
    color: 'var(--fg-dim)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  count: {
    fontSize: '9px',
    color: 'var(--accent)',
    background: 'var(--accent-glow)',
    padding: '0.2rem 0.5rem',
    borderRadius: '10px',
  },
  textarea: {
    width: '100%',
    minHeight: '180px',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '1rem',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: '14px',
    lineHeight: 1.6,
    resize: 'vertical',
  },
  generateBtn: {
    width: '100%',
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: '4px',
    padding: '0.875rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '9px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.75rem',
    transition: 'all 0.15s ease',
    letterSpacing: '0.08em',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    minWidth: '18px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: 'var(--bg)',
    marginTop: '2px',
    transition: 'all 0.15s ease',
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
    wordBreak: 'break-word',
  },
  taskDesc: {
    fontSize: '9px',
    color: 'var(--muted)',
    margin: '0.375rem 0 0',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  taskPriority: {
    fontSize: '7px',
    color: 'var(--accent)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginTop: '0.5rem',
    display: 'inline-block',
  },
  deleteBtn: {
    background: 'transparent',
    color: 'var(--muted)',
    border: 'none',
    width: '24px',
    height: '24px',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    padding: 0,
    transition: 'color 0.15s ease',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  addBtn: {
    flex: 2,
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: '4px',
    padding: '0.875rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '8px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.05em',
  },
  clearBtn: {
    flex: 1,
    background: 'transparent',
    color: 'var(--fg-dim)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '0.875rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.05em',
  },
  tips: {
    padding: '1.25rem',
    border: '1px dashed var(--border)',
    borderRadius: '4px',
  },
  tipTitle: {
    fontSize: '8px',
    color: 'var(--fg-dim)',
    margin: '0 0 0.75rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  tipList: {
    fontSize: '9px',
    color: 'var(--muted)',
    lineHeight: 2,
    margin: 0,
    paddingLeft: '1rem',
  },
  loading: {
    fontSize: '9px',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  authMsg: {
    fontSize: '10px',
    color: 'var(--accent-2)',
    textAlign: 'center',
    padding: '3rem 1rem',
  },
};
