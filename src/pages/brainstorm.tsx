import React, { useState } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

// Priority colors
const priorityColors: Record<string, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
};

export default function BrainstormPage() {
  const { user, loading: authLoading, token } = useAuth();
  const [freeText, setFreeText] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [addingTasks, setAddingTasks] = useState(false);
  const [savingIdea, setSavingIdea] = useState(false);

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

  const handleSaveAsIdea = async () => {
    if (!freeText.trim()) return;
    setSavingIdea(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ 
          content: freeText.trim(), 
          source: 'idea',
          is_locked: false
          // Note: no mood field for ideas
        })
      });
      if (res.ok) {
        setFreeText('');
        alert('Idea saved to Journal');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      alert('Failed to save idea.');
    }
    setSavingIdea(false);
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
        alert(`Added ${tasksToAdd.length} task(s)`);
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <div style={styles.authCard}>
            <h2 style={{ marginBottom: '0.5rem' }}>Sign in to brainstorm</h2>
            <p style={{ color: 'var(--muted)' }}>Create an account to save your ideas</p>
            <a href="/auth/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Sign in
            </a>
          </div>
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
          <h1 style={styles.title}>Ideas</h1>
          <p style={styles.subtitle}>Dump your thoughts, extract actionable tasks</p>
        </header>

        {/* Input */}
        <section style={styles.editorSection}>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder="Write anything… ideas, todos, notes, random thoughts…"
            style={styles.textarea}
          />
          
          <div style={styles.buttonRow}>
            <button
              onClick={handleSaveAsIdea}
              disabled={savingIdea || !freeText.trim()}
              className="btn"
              style={{ flex: 1 }}
            >
              {savingIdea ? 'Saving…' : 'Save Idea'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !freeText.trim()}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              {loading ? 'Analyzing…' : 'Extract Tasks'}
            </button>
          </div>
        </section>

        {/* Generated Tasks */}
        {generatedTasks.length > 0 && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Extracted Tasks</h2>
              <span style={styles.count}>{selectedTasks.size}/{generatedTasks.length} selected</span>
            </div>
            
            <div style={styles.taskList}>
              {generatedTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    ...styles.taskItem,
                    borderColor: selectedTasks.has(task.id) ? 'var(--accent)' : 'var(--border)',
                    background: selectedTasks.has(task.id) ? 'var(--accent-glow)' : 'var(--bg-card)',
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
                    <span style={{
                      ...styles.taskPriority,
                      color: priorityColors[task.priority] || priorityColors.medium,
                    }}>
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
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                {addingTasks ? 'Adding…' : `Add ${selectedTasks.size} Task${selectedTasks.size !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => {
                  setGeneratedTasks([]);
                  setSelectedTasks(new Set());
                }}
                className="btn"
                style={{ flex: 1 }}
              >
                Clear
              </button>
            </div>
          </section>
        )}

        
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '2.5rem 1rem 4rem',
  },
  header: {
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
  editorSection: {
    background: 'var(--bg-card)',
    padding: '1.25rem',
    borderRadius: 'var(--radius-lg)',
    marginBottom: '2rem',
    border: '1px solid var(--border)',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    margin: 0,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  count: {
    fontSize: '12px',
    color: 'var(--accent-bright)',
    background: 'var(--accent-glow)',
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontWeight: 500,
  },
  textarea: {
    width: '100%',
    minHeight: '160px',
    background: 'var(--input-bg)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.875rem',
    padding: '1rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    minWidth: '20px',
    border: '2px solid var(--border)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#ffffff',
    marginTop: '2px',
    transition: 'all 0.15s ease',
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--fg)',
    display: 'block',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  taskDesc: {
    fontSize: '13px',
    color: 'var(--fg-dim)',
    margin: '0.375rem 0 0',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  taskPriority: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginTop: '0.375rem',
    display: 'inline-block',
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
  actions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  tips: {
    padding: '1.25rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  tipTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--fg)',
    margin: '0 0 0.75rem',
  },
  tipList: {
    fontSize: '13px',
    color: 'var(--fg-dim)',
    lineHeight: 1.8,
    margin: 0,
    paddingLeft: '1.25rem',
  },
  authCard: {
    textAlign: 'center',
    padding: '3rem 2rem',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  },
};
