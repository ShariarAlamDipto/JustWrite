import React, { useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const { user, loading: authLoading, token } = useAuth();

  useEffect(() => {
    if (user && token) fetchTasks();
  }, [user, token]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
    setLoading(false);
  }

  async function toggleDone(t: any) {
    setToggleLoading(t.id);
    try {
      const newStatus = t.status === 'done' ? 'todo' : 'done';
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
    setToggleLoading(null);
  }

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
          <p style={styles.error}>Please sign in to view tasks.</p>
        </div>
      </>
    );
  }

  const todoCount = tasks.filter(t => t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <>
      <Nav />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>TO‑DO LIST</h1>
          <div style={styles.stats}>
            <span style={styles.stat}>
              <span style={styles.statNumber}>{todoCount}</span> Active
            </span>
            <span style={styles.stat}>
              <span style={styles.statNumber}>{doneCount}</span> Done
            </span>
          </div>
        </div>

        {loading ? (
          <p style={styles.loading}>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <div style={styles.empty}>
            <p>No tasks yet.</p>
            <p style={styles.hint}>Create an entry and distill it to generate tasks!</p>
          </div>
        ) : (
          <div style={styles.taskList}>
            {/* Active Tasks */}
            {tasks.filter(t => t.status !== 'done').length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>ACTIVE</div>
                <div style={styles.taskGroup}>
                  {tasks
                    .filter(t => t.status !== 'done')
                    .map(t => (
                      <div key={t.id} style={styles.taskItem}>
                        <div style={styles.taskContent}>
                          <div style={styles.taskTitle}>{t.title}</div>
                          {t.description && <div style={styles.taskDesc}>{t.description}</div>}
                          <div style={styles.taskMeta}>
                            Priority: <span style={styles.priority}>{t.priority || 'medium'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleDone(t)}
                          disabled={toggleLoading === t.id}
                          style={{
                            ...styles.toggleBtn,
                            background: toggleLoading === t.id ? 'var(--muted)' : 'var(--accent)',
                          }}
                        >
                          {toggleLoading === t.id ? '…' : '✓'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {doneCount > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>COMPLETED</div>
                <div style={styles.taskGroup}>
                  {tasks
                    .filter(t => t.status === 'done')
                    .map(t => (
                      <div key={t.id} style={{ ...styles.taskItem, opacity: 0.6 }}>
                        <div style={styles.taskContent}>
                          <div style={{ ...styles.taskTitle, textDecoration: 'line-through' }}>
                            {t.title}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleDone(t)}
                          disabled={toggleLoading === t.id}
                          style={{
                            ...styles.toggleBtn,
                            background: '#2ecc71',
                            color: '#000',
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 920,
    margin: '0 auto',
    padding: '0 1rem 2rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.2rem',
    margin: '0 0 1rem',
    color: 'var(--accent)',
    textShadow: '0 0 10px rgba(0, 255, 213, 0.3)',
    letterSpacing: '0.1em',
  },
  stats: {
    display: 'flex',
    gap: '2rem',
    fontSize: '0.7rem',
    color: 'var(--muted)',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statNumber: {
    fontSize: '1.2rem',
    color: 'var(--accent)',
    fontWeight: 700,
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
    marginBottom: '1rem',
  },
  taskGroup: {
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
    transition: 'all 0.2s',
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
  taskMeta: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
  },
  priority: {
    color: 'var(--accent)',
    fontWeight: 700,
  },
  toggleBtn: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    width: '40px',
    height: '40px',
    minWidth: '40px',
    fontSize: '1.2rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  empty: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: 'var(--muted)',
  },
  hint: {
    fontSize: '0.7rem',
    marginTop: '0.5rem',
    color: 'var(--muted)',
  },
  loading: {
    fontSize: '0.75rem',
    color: 'var(--fg)',
    textAlign: 'center',
    padding: '2rem',
  },
  error: {
    fontSize: '0.75rem',
    color: '#ff3bff',
    textAlign: 'center',
    padding: '2rem',
  },
};
