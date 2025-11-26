import React, { useState, useEffect, useCallback, memo } from 'react';
import DistillView from '../components/DistillView';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

// Memoized entry card — minimal, clean design
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
  const date = new Date(entry.created_at);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.meta}>
        <span style={cardStyles.date}>{dateStr}</span>
        <span style={cardStyles.time}>{timeStr}</span>
        {entry.summary && <span style={cardStyles.badge}>✓</span>}
      </div>
      <p style={cardStyles.preview}>
        {entry.content.slice(0, 120)}{entry.content.length > 120 ? '…' : ''}
      </p>
      <div style={cardStyles.actions}>
        <button
          onClick={() => onDistill(entry.id)}
          disabled={isDistilling}
          style={{
            ...cardStyles.btn,
            ...cardStyles.btnPrimary,
            opacity: isDistilling ? 0.5 : 1,
          }}
        >
          {isDistilling ? '•••' : 'Distill'}
        </button>
        {entry.summary && (
          <button onClick={() => onView(entry)} style={cardStyles.btn}>
            View
          </button>
        )}
      </div>
    </div>
  );
});

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '1rem',
    transition: 'border-color 0.15s ease',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    fontSize: '8px',
  },
  date: {
    color: 'var(--accent)',
    letterSpacing: '0.05em',
  },
  time: {
    color: 'var(--muted)',
  },
  badge: {
    color: 'var(--success)',
    marginLeft: 'auto',
  },
  preview: {
    fontSize: '11px',
    lineHeight: 1.7,
    color: 'var(--fg-dim)',
    margin: '0 0 1rem',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  btn: {
    background: 'transparent',
    color: 'var(--fg-dim)',
    border: '1px solid var(--border)',
    padding: '0.5rem 0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '7px',
    cursor: 'pointer',
    borderRadius: '2px',
    transition: 'all 0.15s ease',
    letterSpacing: '0.05em',
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
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
        setEntries(prev => [json.entry, ...prev]);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      alert('Failed to save. Try again.');
    }
    setSaving(false);
  }, [content, token]);

  const distill = useCallback(async (entryId: string) => {
    setDistillLoading(entryId);
    try {
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
        const entry = entries.find((e: any) => e.id === entryId);
        
        setDistillData({ 
          entry: { ...entry, summary: json.summary }, 
          summary: json.summary, 
          tasks: json.tasks || entryTasks 
        });
        setDistillOpen(true);
        setEntries(prev => prev.map(e => 
          e.id === entryId ? { ...e, summary: json.summary } : e
        ));
      } else {
        const err = await distillRes.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (err) {
      alert('Failed to distill. Try again.');
    }
    setDistillLoading(null);
  }, [token, entries]);

  const handleView = useCallback((entry: any) => {
    setDistillData({ entry, summary: entry.summary, tasks: [] });
    setDistillOpen(true);
  }, []);

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
      setTimeout(() => window.location.href = '/tasks', 300);
    } catch (err) {
      console.error('Failed to add tasks:', err);
    }
  }, [token]);

  // Loading state
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

  // Not signed in
  if (!user) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <div style={styles.hero}>
            <h1 style={styles.heroTitle}>JustWrite</h1>
            <p style={styles.heroSubtitle}>
              Turn your thoughts into action
            </p>
            <div style={styles.heroFeatures}>
              <span>📝 Journal</span>
              <span>→</span>
              <span>🤖 AI Distill</span>
              <span>→</span>
              <span>✓ Tasks</span>
            </div>
            <a href="/auth/login" style={styles.heroBtn}>
              Get started
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
          <h1 style={styles.title}>Journal</h1>
          <p style={styles.subtitle}>Write freely. Distill into tasks.</p>
        </header>

        {/* Editor */}
        <section style={styles.section}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
            style={styles.textarea}
          />
          <button
            onClick={createEntry}
            disabled={saving || !content.trim()}
            style={{
              ...styles.saveBtn,
              opacity: saving || !content.trim() ? 0.4 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </section>

        {/* Entries */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Entries</h2>
            {!loading && <span style={styles.count}>{entries.length}</span>}
          </div>
          
          {loading ? (
            <p style={styles.emptyText}>Loading…</p>
          ) : entries.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No entries yet</p>
              <p style={styles.emptyHint}>Start writing above ↑</p>
            </div>
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
        </section>
      </main>

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
    gap: '0.5rem',
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
    minHeight: '160px',
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
  saveBtn: {
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
  entryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  empty: {
    textAlign: 'center',
    padding: '2.5rem 1rem',
    border: '1px dashed var(--border)',
    borderRadius: '4px',
  },
  emptyText: {
    fontSize: '9px',
    color: 'var(--muted)',
    margin: 0,
  },
  emptyHint: {
    fontSize: '8px',
    color: 'var(--muted)',
    margin: '0.5rem 0 0',
    opacity: 0.7,
  },
  loading: {
    fontSize: '9px',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  // Hero (unauthenticated)
  hero: {
    textAlign: 'center',
    padding: '3rem 1rem',
    marginTop: '2rem',
  },
  heroTitle: {
    fontSize: '18px',
    color: 'var(--accent)',
    margin: '0 0 0.75rem',
    letterSpacing: '0.15em',
  },
  heroSubtitle: {
    fontSize: '10px',
    color: 'var(--fg-dim)',
    margin: '0 0 1.5rem',
    letterSpacing: '0.05em',
  },
  heroFeatures: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    fontSize: '9px',
    color: 'var(--muted)',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  heroBtn: {
    display: 'inline-block',
    background: 'var(--accent)',
    color: 'var(--bg)',
    padding: '0.875rem 1.5rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '9px',
    textDecoration: 'none',
    borderRadius: '4px',
    letterSpacing: '0.08em',
    transition: 'all 0.15s ease',
  },
};
