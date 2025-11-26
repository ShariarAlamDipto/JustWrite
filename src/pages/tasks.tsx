import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

// Priority indicator colors
const priorityColors: Record<string, string> = {
  high: '#f87171',
  medium: 'var(--accent)',
  low: 'var(--muted)',
};

// Memoized task item — clean, minimal
interface TaskItemProps {
  task: any;
  toggleLoading: string | null;
  deleteLoading: string | null;
  onToggle: (task: any) => void;
  onDelete: (id: string) => void;
  isDone?: boolean;
}

const TaskItem = memo(({ task, toggleLoading, deleteLoading, onToggle, onDelete, isDone }: TaskItemProps) => (
  <div style={{ 
    ...taskStyles.item, 
    opacity: isDone ? 0.5 : 1,
    borderLeftColor: isDone ? 'var(--border)' : priorityColors[task.priority] || priorityColors.medium,
  }}>
    <button
      onClick={() => onToggle(task)}
      disabled={toggleLoading === task.id}
      style={{
        ...taskStyles.checkbox,
        background: isDone ? 'var(--success)' : 'transparent',
        borderColor: isDone ? 'var(--success)' : 'var(--border)',
      }}
      aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
    >
      {toggleLoading === task.id ? '·' : isDone ? '✓' : ''}
    </button>
    
    <div style={taskStyles.content}>
      <span style={{ 
        ...taskStyles.title, 
        textDecoration: isDone ? 'line-through' : 'none',
        color: isDone ? 'var(--muted)' : 'var(--fg)',
      }}>
        {task.title}
      </span>
      {!isDone && task.description && (
        <p style={taskStyles.desc}>{task.description}</p>
      )}
    </div>

    <button
      onClick={() => onDelete(task.id)}
      disabled={deleteLoading === task.id}
      style={taskStyles.deleteBtn}
      aria-label="Delete"
    >
      {deleteLoading === task.id ? '·' : '×'}
    </button>
  </div>
));

TaskItem.displayName = 'TaskItem';

const taskStyles: Record<string, React.CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    background: 'var(--bg-elevated)',
    borderLeft: '3px solid var(--accent)',
    borderRadius: '0 4px 4px 0',
    transition: 'all 0.15s ease',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    minWidth: '20px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    background: 'transparent',
    color: 'var(--bg)',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    marginTop: '2px',
    padding: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '10px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  desc: {
    fontSize: '9px',
    color: 'var(--muted)',
    margin: '0.375rem 0 0',
    lineHeight: 1.5,
    wordBreak: 'break-word',
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
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const { user, loading: authLoading, token } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (user && token) fetchTasks();
  }, [user, token, fetchTasks]);

  const toggleDone = useCallback(async (t: any) => {
    if (!token) return;
    setToggleLoading(t.id);
    
    const newStatus = t.status === 'done' ? 'todo' : 'done';
    setTasks(prev => prev.map(task => 
      task.id === t.id ? { ...task, status: newStatus } : task
    ));
    
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        setTasks(prev => prev.map(task => 
          task.id === t.id ? { ...task, status: t.status } : task
        ));
      }
    } catch (err) {
      setTasks(prev => prev.map(task => 
        task.id === t.id ? { ...task, status: t.status } : task
      ));
    }
    setToggleLoading(null);
  }, [token]);

  const deleteTask = useCallback(async (id: string) => {
    if (!confirm('Delete this task?')) return;
    if (!token) return;
    
    setDeleteLoading(id);
    const taskToDelete = tasks.find(t => t.id === id);
    const taskIndex = tasks.findIndex(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok && taskToDelete) {
        setTasks(prev => {
          const newTasks = [...prev];
          newTasks.splice(taskIndex, 0, taskToDelete);
          return newTasks;
        });
      }
    } catch (err) {
      if (taskToDelete) {
        setTasks(prev => {
          const newTasks = [...prev];
          newTasks.splice(taskIndex, 0, taskToDelete);
          return newTasks;
        });
      }
    }
    setDeleteLoading(null);
  }, [token, tasks]);

  const { todoTasks, doneTasks } = useMemo(() => ({
    todoTasks: tasks.filter(t => t.status !== 'done'),
    doneTasks: tasks.filter(t => t.status === 'done')
  }), [tasks]);

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
          <p style={styles.authMsg}>Sign in to view tasks</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main style={styles.main}>
        {/* Header with stats */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Tasks</h1>
            <p style={styles.subtitle}>Stay on track</p>
          </div>
          <div style={styles.stats}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{todoTasks.length}</span>
              <span style={styles.statLabel}>active</span>
            </div>
            <div style={styles.stat}>
              <span style={{...styles.statValue, color: 'var(--success)'}}>{doneTasks.length}</span>
              <span style={styles.statLabel}>done</span>
            </div>
          </div>
        </header>

        {loading ? (
          <p style={styles.loading}>Loading…</p>
        ) : tasks.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No tasks yet</p>
            <p style={styles.emptyHint}>Write a journal entry and distill it,<br/>or brainstorm some ideas</p>
          </div>
        ) : (
          <div style={styles.sections}>
            {/* Active Tasks */}
            {todoTasks.length > 0 && (
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Active</h2>
                <div style={styles.taskList}>
                  {todoTasks.map(t => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      toggleLoading={toggleLoading}
                      deleteLoading={deleteLoading}
                      onToggle={toggleDone}
                      onDelete={deleteTask}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Tasks */}
            {doneTasks.length > 0 && (
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Completed</h2>
                <div style={styles.taskList}>
                  {doneTasks.map(t => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      toggleLoading={toggleLoading}
                      deleteLoading={deleteLoading}
                      onToggle={toggleDone}
                      onDelete={deleteTask}
                      isDone
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  stats: {
    display: 'flex',
    gap: '1.25rem',
  },
  stat: {
    textAlign: 'right',
  },
  statValue: {
    display: 'block',
    fontSize: '18px',
    color: 'var(--accent)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '7px',
    color: 'var(--muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {},
  sectionTitle: {
    fontSize: '9px',
    fontWeight: 400,
    margin: '0 0 0.75rem',
    color: 'var(--fg-dim)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem 1rem',
    border: '1px dashed var(--border)',
    borderRadius: '4px',
  },
  emptyTitle: {
    fontSize: '10px',
    color: 'var(--muted)',
    margin: '0 0 0.5rem',
  },
  emptyHint: {
    fontSize: '8px',
    color: 'var(--muted)',
    margin: 0,
    opacity: 0.7,
    lineHeight: 1.6,
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
