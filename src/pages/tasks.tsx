import React, { useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
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
        // Update local state immediately
        setTasks(prev => prev.map(task => 
          task.id === t.id ? { ...task, status: newStatus } : task
        ));
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
    setToggleLoading(null);
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
    setDeleteLoading(null);
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

  const todoTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <>
      <Nav />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>TO‑DO LIST</h1>
          <div style={styles.stats}>
            <span style={styles.stat}>
              <span style={styles.statNumber}>{todoTasks.length}</span> Active
            </span>
            <span style={styles.stat}>
              <span style={styles.statNumber}>{doneTasks.length}</span> Done
            </span>
          </div>
        </div>

        {loading ? (
          <p style={styles.loading}>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <div style={styles.empty}>
            <p>No tasks yet.</p>
            <p style={styles.hint}>Create an entry and distill it, or use Brainstorm!</p>
          </div>
        ) : (
          <div style={styles.taskList}>
            {/* Active Tasks */}
            {todoTasks.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>ACTIVE</div>
                <div style={styles.taskGroup}>
                  {todoTasks.map(t => (
                    <div key={t.id} style={styles.taskItem}>
                      <div style={styles.taskContent}>
                        <div style={styles.taskTitle}>{t.title}</div>
                        {t.description && <div style={styles.taskDesc}>{t.description}</div>}
                        <div style={styles.taskMeta}>
                          Priority: <span style={styles.priority}>{t.priority || 'medium'}</span>
                        </div>
                      </div>
                      <div style={styles.taskButtons}>
                        <button
                          onClick={() => toggleDone(t)}
                          disabled={toggleLoading === t.id}
                          style={styles.toggleBtn}
                          aria-label="Mark done"
                        >
                          {toggleLoading === t.id ? '…' : '✓'}
                        </button>
                        <button
                          onClick={() => deleteTask(t.id)}
                          disabled={deleteLoading === t.id}
                          style={styles.deleteBtn}
                          aria-label="Delete"
                        >
                          {deleteLoading === t.id ? '…' : '✕'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {doneTasks.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>COMPLETED</div>
                <div style={styles.taskGroup}>
                  {doneTasks.map(t => (
                    <div key={t.id} style={{ ...styles.taskItem, opacity: 0.6 }}>
                      <div style={styles.taskContent}>
                        <div style={{ ...styles.taskTitle, textDecoration: 'line-through' }}>
                          {t.title}
                        </div>
                      </div>
                      <div style={styles.taskButtons}>
                        <button
                          onClick={() => toggleDone(t)}
                          disabled={toggleLoading === t.id}
                          style={{ ...styles.toggleBtn, background: '#2ecc71' }}
                          aria-label="Mark undone"
                        >
                          ↩
                        </button>
                        <button
                          onClick={() => deleteTask(t.id)}
                          disabled={deleteLoading === t.id}
                          style={styles.deleteBtn}
                          aria-label="Delete"
                        >
                          ✕
                        </button>
                      </div>
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
    maxWidth: 760,
    margin: '0 auto',
    padding: '0 12px 2rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1rem',
    margin: '0 0 0.75rem',
    color: 'var(--accent)',
    textShadow: '0 0 10px rgba(0, 255, 213, 0.3)',
    letterSpacing: '0.1em',
  },
  stats: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.6rem',
    color: 'var(--muted)',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  statNumber: {
    fontSize: '1rem',
    color: 'var(--accent)',
    fontWeight: 700,
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  section: {
    marginBottom: '1rem',
  },
  sectionLabel: {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
  },
  taskGroup: {
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
    transition: 'all 0.2s',
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
  taskMeta: {
    fontSize: '0.55rem',
    color: 'var(--muted)',
  },
  priority: {
    color: 'var(--accent)',
    fontWeight: 700,
  },
  taskButtons: {
    display: 'flex',
    gap: '0.4rem',
    flexShrink: 0,
  },
  toggleBtn: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    width: '40px',
    height: '40px',
    minWidth: '40px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  deleteBtn: {
    background: 'rgba(255, 59, 255, 0.2)',
    color: '#ff3bff',
    border: '1px solid #ff3bff',
    width: '40px',
    height: '40px',
    minWidth: '40px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  empty: {
    textAlign: 'center',
    padding: '2rem 1rem',
    color: 'var(--muted)',
    fontSize: '0.65rem',
  },
  hint: {
    fontSize: '0.55rem',
    marginTop: '0.5rem',
    color: 'var(--muted)',
  },
  loading: {
    fontSize: '0.65rem',
    color: 'var(--fg)',
    textAlign: 'center',
    padding: '2rem',
  },
  error: {
    fontSize: '0.65rem',
    color: '#ff3bff',
    textAlign: 'center',
    padding: '2rem',
  },
};
