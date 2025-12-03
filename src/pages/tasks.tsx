import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';
import { encryptContent, decryptContent, isEncrypted } from '../lib/clientEncryption';

// Priority indicator colors
const priorityColors: Record<string, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
};

const priorityLabels: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// Memoized task item — clean, minimal with larger boundaries
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
    opacity: isDone ? 0.6 : 1,
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
      <div style={taskStyles.titleRow}>
        <span style={{ 
          ...taskStyles.title, 
          textDecoration: isDone ? 'line-through' : 'none',
          color: isDone ? 'var(--muted)' : 'var(--fg)',
        }}>
          {task.title}
        </span>
        {!isDone && task.priority && (
          <span style={{
            ...taskStyles.priorityBadge,
            color: priorityColors[task.priority] || priorityColors.medium,
            borderColor: priorityColors[task.priority] || priorityColors.medium,
          }}>
            {priorityLabels[task.priority] || task.priority}
          </span>
        )}
      </div>
      {!isDone && task.description && (
        <p style={taskStyles.desc}>{task.description}</p>
      )}
      {task.due && (
        <p style={taskStyles.due}>Due: {new Date(task.due).toLocaleDateString()}</p>
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
    gap: '0.875rem',
    padding: '1rem 1.25rem',
    background: 'var(--bg-card)',
    borderLeft: '3px solid var(--accent)',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    minWidth: '20px',
    border: '2px solid var(--border)',
    borderRadius: '4px',
    background: 'transparent',
    color: '#ffffff',
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
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  priorityBadge: {
    fontSize: '10px',
    padding: '1px 6px',
    borderRadius: '3px',
    border: '1px solid',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--fg-dim)',
    margin: '0.375rem 0 0',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  due: {
    fontSize: '11px',
    color: 'var(--muted)',
    margin: '0.375rem 0 0',
  },
  deleteBtn: {
    background: 'transparent',
    color: 'var(--muted)',
    border: 'none',
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
};

// Add Task Modal
interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: { title: string; description: string; priority: string }) => void;
  loading: boolean;
}

const AddTaskModal = ({ isOpen, onClose, onAdd, loading }: AddTaskModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim(), priority });
    setTitle('');
    setDescription('');
    setPriority('medium');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Task</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={modalStyles.label}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              style={{ marginTop: '0.5rem' }}
              autoFocus
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={modalStyles.label}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details (optional)"
              style={{ marginTop: '0.5rem', minHeight: '100px' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={modalStyles.label}>Priority</label>
            <div style={modalStyles.priorityGrid}>
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    ...modalStyles.priorityBtn,
                    borderColor: priority === p ? priorityColors[p] : 'var(--border)',
                    background: priority === p ? `${priorityColors[p]}20` : 'transparent',
                    color: priority === p ? priorityColors[p] : 'var(--fg-dim)',
                  }}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !title.trim()}>
              {loading ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const modalStyles: Record<string, React.CSSProperties> = {
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--fg)',
    display: 'block',
  },
  priorityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  priorityBtn: {
    padding: '0.5rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
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
        // Decrypt task titles and descriptions
        const decrypted = await Promise.all((json.tasks || []).map(async (task: any) => {
          if (user?.id) {
            if (task.title && isEncrypted(task.title)) {
              task.title = await decryptContent(task.title, user.id);
            }
            if (task.description && isEncrypted(task.description)) {
              task.description = await decryptContent(task.description, user.id);
            }
          }
          return task;
        }));
        setTasks(decrypted);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
    setLoading(false);
  }, [token, user?.id]);

  useEffect(() => {
    if (user && token) fetchTasks();
  }, [user, token, fetchTasks]);

  const addTask = useCallback(async (taskData: { title: string; description: string; priority: string }) => {
    if (!token) return;
    setAddLoading(true);
    try {
      // Encrypt task title and description
      let titleToSave = taskData.title;
      let descToSave = taskData.description;
      if (user?.id) {
        try {
          titleToSave = await encryptContent(taskData.title, user.id);
          if (descToSave) {
            descToSave = await encryptContent(taskData.description, user.id);
          }
        } catch (e) {
          console.error('Failed to encrypt task:', e);
        }
      }
      
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: titleToSave,
          description: descToSave,
          priority: taskData.priority,
          status: 'todo'
        })
      });
      if (res.ok) {
        const json = await res.json();
        // Decrypt returned task for display
        if (json.task && user?.id) {
          if (json.task.title && isEncrypted(json.task.title)) {
            json.task.title = await decryptContent(json.task.title, user.id);
          }
          if (json.task.description && isEncrypted(json.task.description)) {
            json.task.description = await decryptContent(json.task.description, user.id);
          }
        }
        setTasks(prev => [json.task, ...prev]);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
    setAddLoading(false);
  }, [token, user?.id]);

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
            <p style={styles.subtitle}>Stay organized and productive</p>
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
          <div style={styles.loadingContainer}>
            <div className="spinner" />
            <p style={styles.loading}>Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No tasks yet</p>
            <p style={styles.emptyHint}>
              Add a task or distill from journal entries
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1.25rem' }}
              onClick={() => setShowAddModal(true)}
            >
              Add Task
            </button>
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

        {/* Floating Action Button */}
        {tasks.length > 0 && (
          <button 
            className="fab" 
            onClick={() => setShowAddModal(true)}
            aria-label="Add new task"
          >
            +
          </button>
        )}

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={addTask}
          loading={addLoading}
        />
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '2.5rem 1rem 5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--fg)',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--muted)',
    margin: '0.375rem 0 0',
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
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--accent-bright)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {},
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    margin: '0 0 0.75rem',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem 2rem',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px dashed var(--border)',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: 'var(--fg)',
    margin: '0 0 0.375rem',
  },
  emptyHint: {
    fontSize: '14px',
    color: 'var(--muted)',
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    gap: '0.75rem',
  },
  loading: {
    fontSize: '13px',
    color: 'var(--muted)',
  },
  authMsg: {
    fontSize: '15px',
    color: 'var(--accent-bright)',
    textAlign: 'center',
    padding: '3rem 2rem',
  },
};
