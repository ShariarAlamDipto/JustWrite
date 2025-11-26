import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import DistillView from '../components/DistillView';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

// Memoized entry card component for better list performance
const EntryCard = memo(function EntryCard({ 
  entry, 
  onDistill, 
  onView, 
  isDistilling 
}: { 
  entry: any; 
  onDistill: (id: string) => void; 
  onView: (entry: any) => void; 
  isDistilling: boolean;
}) {
  return (
    <div style={cardStyles.entryCard}>
      <div style={cardStyles.entryTime}>
        {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </div>
      <div style={cardStyles.entryPreview}>
        {entry.content.slice(0, 150) + (entry.content.length > 150 ? '…' : '')}
      </div>
      <div style={cardStyles.entryActions}>
        <button
          onClick={() => onDistill(entry.id)}
          disabled={isDistilling}
          style={{
            ...cardStyles.btnSmall,
            background: isDistilling ? 'var(--muted)' : 'var(--accent)',
            color: 'var(--bg)',
          }}
        >
          {isDistilling ? '…' : 'DISTILL'}
        </button>
        {entry.summary && (
          <button onClick={() => onView(entry)} style={cardStyles.btnSmall}>
            VIEW
          </button>
        )}
      </div>
    </div>
  );
});

// Card styles extracted for reuse
const cardStyles: Record<string, React.CSSProperties> = {
  entryCard: {
    background: 'var(--bg)',
    border: '2px solid var(--muted)',
    padding: '0.75rem',
    transition: 'all 0.2s',
  },
  entryTime: {
    fontSize: '0.55rem',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  },
  entryPreview: {
    fontSize: '0.65rem',
    lineHeight: 1.6,
    color: 'var(--fg)',
    marginBottom: '0.75rem',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  entryActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  btnSmall: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.6rem 0.85rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '40px',
  },
};

export default function Home() {
  const { user, loading: authLoading, token } = useAuth();
  const [content, setContent] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [distillLoading, setDistillLoading] = useState<string | null>(null);
  const [distillData, setDistillData] = useState<any>(null);
  const [distillOpen, setDistillOpen] = useState(false);

  useEffect(() => { 
    if (user && token) fetchEntries();
  }, [user, token]);

  // Memoized fetch function
  const fetchEntries = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [token]);

  // Memoized create function
  const createEntry = useCallback(async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ content: content.trim() })
      });
      if (res.ok) {
        const json = await res.json();
        setContent('');
        // Add new entry to the top of the list (optimistic update)
        setEntries(prev => [json.entry, ...prev]);
      } else {
        const err = await res.json();
        console.error('Failed to create entry:', err.error);
        alert(`Error saving entry: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to create entry:', err);
      alert('Failed to save entry. Please try again.');
    }
    setSaving(false);
  }, [content, token]);

  // Optimized distill - fetch tasks and entry in parallel
  const distill = useCallback(async (entryId: string) => {
    setDistillLoading(entryId);
    try {
      // Run distill and fetch tasks in parallel for speed
      const [distillRes, tasksRes] = await Promise.all([
        fetch('/api/distill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
          },
          body: JSON.stringify({ entryId })
        }),
        fetch('/api/tasks', {
          headers: { 'Authorization': `Bearer ${token || ''}` }
        })
      ]);

      if (distillRes.ok) {
        const json = await distillRes.json();
        const tJson = await tasksRes.json();
        const entryTasks = (tJson.tasks || []).filter((t: any) => t.entry_id === entryId);
        
        // Use local entry data instead of refetching
        const entry = entries.find((e: any) => e.id === entryId);
        
        setDistillData({ 
          entry: { ...entry, summary: json.summary }, 
          summary: json.summary, 
          tasks: json.tasks || entryTasks 
        });
        setDistillOpen(true);
        
        // Update entry in local state with summary (optimistic update)
        setEntries(prev => prev.map(e => 
          e.id === entryId ? { ...e, summary: json.summary } : e
        ));
      } else {
        const err = await distillRes.json();
        alert(`Distill failed: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to distill:', err);
      alert('Failed to distill entry. Please try again.');
    }
    setDistillLoading(null);
  }, [token, entries]);

  // Memoized view handler
  const handleView = useCallback((entry: any) => {
    setDistillData({ entry, summary: entry.summary, tasks: [] });
    setDistillOpen(true);
  }, []);

  // Memoized close handler
  const handleClose = useCallback(() => {
    setDistillOpen(false);
  }, []);

  const addToTodo = useCallback(async (tasks: any[]) => {
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
  }, [token]);

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
          <div style={styles.welcomeBox}>
            <h1 style={styles.welcomeTitle}>JUSTWRITE</h1>
            <p style={styles.welcomeText}>
              Convert thoughts into actionable tasks.
            </p>
            <a href="/auth/login" style={styles.signInBtn}>
              SIGN IN TO START
            </a>
          </div>
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
            rows={5}
            style={styles.textarea}
          />
          <button
            onClick={createEntry}
            disabled={saving || !content.trim()}
            style={{
              ...styles.btnPrimary,
              opacity: saving || !content.trim() ? 0.5 : 1,
            }}
          >
            {saving ? 'SAVING…' : 'SAVE ENTRY'}
          </button>
        </div>

        {/* Recent Entries */}
        <div style={styles.section}>
          <label style={styles.label}>
            RECENT ENTRIES {loading ? '' : `(${entries.length})`}
          </label>
          {loading ? (
            <p style={styles.loadingSmall}>Loading entries...</p>
          ) : entries.length === 0 ? (
            <p style={styles.empty}>No entries yet. Start writing!</p>
          ) : (
            <div style={styles.entryList}>
              {entries.map(e => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onDistill={distill}
                  onView={handleView}
                  isDistilling={distillLoading === e.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DistillView
        open={distillOpen}
        onClose={handleClose}
        entry={distillData?.entry || { content: '', created_at: new Date().toISOString() }}
        summary={distillData?.summary}
        tasks={distillData?.tasks || []}
        onSave={addToTodo}
      />
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
  textarea: {
    width: '100%',
    minHeight: '120px',
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
  btnSmall: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.6rem 0.85rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '40px',
  },
  entryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  entryCard: {
    background: 'var(--bg)',
    border: '2px solid var(--muted)',
    padding: '0.75rem',
    transition: 'all 0.2s',
  },
  entryTime: {
    fontSize: '0.55rem',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  },
  entryPreview: {
    fontSize: '0.65rem',
    lineHeight: 1.6,
    color: 'var(--fg)',
    marginBottom: '0.75rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  entryActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  empty: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '2rem 1rem',
  },
  loading: {
    fontSize: '0.7rem',
    color: 'var(--fg)',
    textAlign: 'center',
    padding: '2rem',
  },
  loadingSmall: {
    fontSize: '0.6rem',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '1rem',
  },
  welcomeBox: {
    textAlign: 'center',
    padding: '3rem 1rem',
    border: '2px solid var(--accent)',
    marginTop: '2rem',
  },
  welcomeTitle: {
    fontSize: '1.2rem',
    color: 'var(--accent)',
    marginBottom: '1rem',
  },
  welcomeText: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    marginBottom: '1.5rem',
  },
  signInBtn: {
    display: 'inline-block',
    background: 'var(--accent)',
    color: 'var(--bg)',
    padding: '0.85rem 1.5rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.55rem',
    textDecoration: 'none',
    fontWeight: 700,
  },
};
