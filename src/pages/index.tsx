import React, { useState, useEffect } from 'react';
import DistillView from '../components/DistillView';
import { useSocket } from '../lib/useSocket';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

export default function Home() {
  const { user, loading: authLoading, token } = useAuth();
  const [content, setContent] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [distillLoading, setDistillLoading] = useState<string | null>(null);
  const [distillData, setDistillData] = useState<any>(null);
  const [distillOpen, setDistillOpen] = useState(false);
  const { socket, isConnected } = useSocket();

  useEffect(() => { 
    if (user && token) fetchEntries();
  }, [user, token]);

  // Listen for real-time entry creation
  useEffect(() => {
    if (!socket) return;
    socket.on('entry:created', (newEntry: any) => {
      setEntries(prev => [newEntry, ...prev]);
    });
    socket.on('task:updated', () => {
      fetchEntries();
    });
    return () => {
      socket.off('entry:created');
      socket.off('task:updated');
    };
  }, [socket]);

  async function fetchEntries() {
    try {
      const res = await fetch('/api/entries', {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        const json = await res.json();
        setEntries(json.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  }

  async function createEntry() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const json = await res.json();
        setContent('');
        socket?.emit('entry:created', json.entry);
        await fetchEntries();
      } else {
        const err = await res.json();
        console.error('Failed to create entry:', err.error);
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to create entry:', err);
    }
    setLoading(false);
  }

  async function distill(entryId: string) {
    setDistillLoading(entryId);
    try {
      const res = await fetch('/api/distill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ entryId })
      });
      if (res.ok) {
        const json = await res.json();

        // Fetch tasks for this entry
        const tRes = await fetch('/api/tasks', {
          headers: { 'Authorization': `Bearer ${token || ''}` }
        });
        const tJson = await tRes.json();
        const entryTasks = (tJson.tasks || []).filter((t: any) => t.entry_id === entryId);

        const dbRes = await fetch('/api/entries', {
          headers: { 'Authorization': `Bearer ${token || ''}` }
        });
        const dbJson = await dbRes.json();
        const entry = (dbJson.entries || []).find((e: any) => e.id === entryId);

        setDistillData({ entry, summary: json.summary, tasks: entryTasks });
        setDistillOpen(true);
        await fetchEntries();
      }
    } catch (err) {
      console.error('Failed to distill:', err);
    }
    setDistillLoading(null);
  }

  async function addToTodo(tasks: any[]) {
    try {
      await Promise.all(
        tasks.map((t: any) =>
          fetch(`/api/tasks/${t.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`
            },
            body: JSON.stringify({ status: 'todo' })
          })
        )
      );
      setDistillOpen(false);
      setTimeout(() => window.location.href = '/tasks', 500);
    } catch (err) {
      console.error('Failed to add tasks:', err);
    }
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
          <p style={styles.error}>Please sign in to create entries.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={styles.container}>
        <div style={styles.section}>
          <h1 style={styles.title}>JUSTWRITE</h1>
          <p style={styles.subtitle}>Convert thoughts into actionable tasks</p>
        </div>

        {/* Entry Editor */}
        <div style={styles.section}>
          <label style={styles.label}>NEW ENTRY</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your thoughts here…"
            rows={6}
            style={styles.textarea}
          />
          <div style={styles.buttonGroup}>
            <button
              onClick={createEntry}
              disabled={loading || !content.trim()}
              style={styles.btnPrimary}
            >
              {loading ? 'SAVING…' : 'SAVE ENTRY'}
            </button>
            {isConnected && <span style={styles.connectionStatus}>● LIVE</span>}
          </div>
        </div>

        {/* Recent Entries */}
        <div style={styles.section}>
          <label style={styles.label}>RECENT ENTRIES ({entries.length})</label>
          {entries.length === 0 ? (
            <p style={styles.empty}>No entries yet. Start writing!</p>
          ) : (
            <div style={styles.entryList}>
              {entries.map(e => (
                <div key={e.id} style={styles.entryCard}>
                  <div style={styles.entryTime}>
                    {new Date(e.created_at).toLocaleString()}
                  </div>
                  <div style={styles.entryPreview}>
                    {e.content.slice(0, 180) + (e.content.length > 180 ? '…' : '')}
                  </div>
                  <div style={styles.entryActions}>
                    <button
                      onClick={() => distill(e.id)}
                      disabled={distillLoading === e.id}
                      style={{
                        ...styles.btnSmall,
                        background: distillLoading === e.id ? 'var(--muted)' : 'var(--accent)',
                      }}
                    >
                      {distillLoading === e.id ? '…' : 'DISTILL'}
                    </button>
                    {e.summary && (
                      <button
                        onClick={() => {
                          setDistillData({ entry: e, summary: e.summary, tasks: [] });
                          setDistillOpen(true);
                        }}
                        style={styles.btnSmall}
                      >
                        VIEW
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DistillView
        open={distillOpen}
        onClose={() => setDistillOpen(false)}
        entry={distillData?.entry || { content: '', created_at: new Date().toISOString() }}
        summary={distillData?.summary}
        tasks={distillData?.tasks || []}
        onSave={(tasks: any[]) => addToTodo(tasks)}
      />
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
    minHeight: '150px',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--muted)',
    padding: '1rem',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    lineHeight: 1.6,
    resize: 'vertical',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    marginTop: '0.75rem',
  },
  btnPrimary: {
    flex: 1,
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.2s',
  },
  btnSmall: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.5rem 0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.6rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  connectionStatus: {
    fontSize: '0.6rem',
    color: 'var(--accent)',
    animation: 'glow-pulse 2s ease-in-out infinite',
  },
  entryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  entryCard: {
    background: 'var(--bg)',
    border: '2px solid var(--muted)',
    padding: '1rem',
    transition: 'all 0.2s',
  },
  entryCardHover: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 10px rgba(0, 255, 213, 0.2)',
  },
  entryTime: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  },
  entryPreview: {
    fontSize: '0.75rem',
    lineHeight: 1.6,
    color: 'var(--fg)',
    marginBottom: '0.75rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  entryActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  empty: {
    fontSize: '0.75rem',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '2rem 1rem',
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
