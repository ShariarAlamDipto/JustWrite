import React, { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIExtractedTasksProps {
  tasks: Task[];
  onAddTasks: (tasks: Task[]) => Promise<void>;
}

export default function AIExtractedTasks({ tasks, onAddTasks }: AIExtractedTasksProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(
    new Set(tasks.map(t => t.id))
  );
  const [adding, setAdding] = useState(false);
  const [ifThenPlans, setIfThenPlans] = useState<Record<string, string>>({});

  function toggleTask(id: string) {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTasks(newSelected);
  }

  async function handleAddSelected() {
    if (selectedTasks.size === 0) return;
    setAdding(true);

    const tasksToAdd = tasks.filter(t => selectedTasks.has(t.id));
    await onAddTasks(tasksToAdd);

    setAdding(false);
    setSelectedTasks(new Set());
    setIfThenPlans({});
  }

  const priorityColors: Record<string, string> = {
    high: '#ff3bff',
    medium: 'var(--accent)',
    low: 'var(--muted)',
  };

  return (
    <div style={styles.container}>
      <p style={styles.intro}>
        Review AI-extracted tasks. Click to select, add implementation intention for priority
        tasks.
      </p>

      <div style={styles.tasksList}>
        {tasks.map(task => (
          <div
            key={task.id}
            style={{
              ...styles.taskCard,
              background: selectedTasks.has(task.id)
                ? 'rgba(0, 255, 213, 0.1)'
                : 'transparent',
              borderColor: selectedTasks.has(task.id)
                ? 'var(--accent)'
                : 'var(--muted)',
            }}
          >
            <button
              onClick={() => toggleTask(task.id)}
              style={styles.checkbox}
            >
              {selectedTasks.has(task.id) ? '☑' : '☐'}
            </button>

            <div style={styles.taskContent}>
              <div style={styles.taskHeader}>
                <span
                  style={{
                    ...styles.priority,
                    color: priorityColors[task.priority],
                  }}
                >
                  {task.priority.toUpperCase()}
                </span>
                <span style={styles.title}>{task.title}</span>
              </div>

              {task.description && (
                <p style={styles.description}>{task.description}</p>
              )}

              {selectedTasks.has(task.id) && (
                <div style={styles.ifThenSection}>
                  <label style={styles.ifThenLabel}>
                    If-Then Plan (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., If I start work, then I will fix the bug first"
                    value={ifThenPlans[task.id] || ''}
                    onChange={e =>
                      setIfThenPlans(prev => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    style={styles.ifThenInput}
                  />
                  <p style={styles.ifThenHint}>
                    Implementation intentions increase follow-through
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.actions}>
        <button
          onClick={handleAddSelected}
          disabled={adding || selectedTasks.size === 0}
          style={{
            ...styles.btnPrimary,
            opacity: adding || selectedTasks.size === 0 ? 0.6 : 1,
          }}
        >
          {adding
            ? 'ADDING…'
            : `ADD TO TO-DO LIST (${selectedTasks.size}/${tasks.length})`}
        </button>

        <p style={styles.hint}>
          Selected tasks will be added to your to-do board. Review before adding.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  intro: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    margin: 0,
    lineHeight: 1.5,
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  taskCard: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    padding: '1rem',
    border: '2px solid var(--muted)',
    background: 'transparent',
    transition: 'all 0.2s',
  },
  checkbox: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: 0,
    marginTop: '2px',
    flexShrink: 0,
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskHeader: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
  },
  priority: {
    fontSize: '0.55rem',
    fontWeight: 700,
    flexShrink: 0,
    letterSpacing: '0.05em',
  },
  title: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--fg)',
    lineHeight: 1.3,
  },
  description: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    lineHeight: 1.4,
    margin: 0,
  },
  ifThenSection: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(0, 255, 213, 0.05)',
    border: '1px solid var(--accent)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  ifThenLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--accent)',
    margin: 0,
  },
  ifThenInput: {
    width: '100%',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--accent)',
    padding: '0.5rem',
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    lineHeight: 1.4,
  },
  ifThenHint: {
    fontSize: '0.6rem',
    color: 'var(--muted)',
    margin: 0,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.2s',
    width: '100%',
  },
  hint: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    margin: 0,
  },
};
