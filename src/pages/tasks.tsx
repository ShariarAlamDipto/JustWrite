import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

// Memoized task item component
interface TaskItemProps {
  task: any;
  toggleLoading: string | null;
  deleteLoading: string | null;
  onToggle: (task: any) => void;
  onDelete: (id: string) => void;
  isDone?: boolean;
}

const TaskItem = memo(({ task, toggleLoading, deleteLoading, onToggle, onDelete, isDone }: TaskItemProps) => (
  <div style={{ ...styles.taskItem, opacity: isDone ? 0.6 : 1 }}>
    <div style={styles.taskContent}>
      <div style={{ ...styles.taskTitle, textDecoration: isDone ? 'line-through' : 'none' }}>
        {task.title}
      </div>
      {!isDone && task.description && <div style={styles.taskDesc}>{task.description}</div>}
      {!isDone && (
        <div style={styles.taskMeta}>
          Priority: <span style={styles.priority}>{task.priority || 'medium'}</span>
        </div>
      )}
    </div>
    <div style={styles.taskButtons}>
      <button
        onClick={() => onToggle(task)}
        disabled={toggleLoading === task.id}
        style={isDone ? { ...styles.toggleBtn, background: '#2ecc71' } : styles.toggleBtn}
        aria-label={isDone ? 'Mark undone' : 'Mark done'}
      >
        {toggleLoading === task.id ? '…' : isDone ? '↩' : '✓'}
      </button>
      <button
        onClick={() => onDelete(task.id)}
        disabled={deleteLoading === task.id}
        style={styles.deleteBtn}
        aria-label="Delete"
      >
        {deleteLoading === task.id ? '…' : '✕'}
      </button>
    </div>
  </div>
));

TaskItem.displayName = 'TaskItem';

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
    
    // Optimistic update
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
        // Rollback on failure
        setTasks(prev => prev.map(task => 
          task.id === t.id ? { ...task, status: t.status } : task
        ));
      }
    } catch (err) {
      // Rollback on error
      setTasks(prev => prev.map(task => 
        task.id === t.id ? { ...task, status: t.status } : task
      ));
      console.error('Failed to toggle task:', err);
    }
    setToggleLoading(null);
  }, [token]);

  const deleteTask = useCallback(async (id: string) => {
    if (!confirm('Delete this task?')) return;
    if (!token) return;
    
    setDeleteLoading(id);
    
    // Optimistic delete - store for rollback
    const taskToDelete = tasks.find(t => t.id === id);
    const taskIndex = tasks.findIndex(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok && taskToDelete) {
        // Rollback on failure
        setTasks(prev => {
          const newTasks = [...prev];
          newTasks.splice(taskIndex, 0, taskToDelete);
          return newTasks;
        });
      }
    } catch (err) {
      // Rollback on error
      if (taskToDelete) {
        setTasks(prev => {
          const newTasks = [...prev];
          newTasks.splice(taskIndex, 0, taskToDelete);
          return newTasks;
        });
      }
      console.error('Failed to delete task:', err);
    }
    setDeleteLoading(null);
  }, [token, tasks]);

  // Memoized filtered tasks
  const { todoTasks, doneTasks } = useMemo(() => ({
    todoTasks: tasks.filter(t => t.status !== 'done'),
    doneTasks: tasks.filter(t => t.status === 'done')
  }), [tasks]);

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
              </div>
            )}

            {/* Completed Tasks */}
            {doneTasks.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>COMPLETED</div>
                <div style={styles.taskGroup}>
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
