import React, { useState, useEffect, useCallback, memo } from 'react';
import DistillView from '../components/DistillView';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';
import { getRandomPrompt, PROMPT_CATEGORIES, ACTIVITY_TAGS, JournalPrompt } from '../lib/prompts';

// Mood level mapping (no emojis)
const getMoodLabel = (mood: number) => {
  if (mood <= 20) return 'Low';
  if (mood <= 40) return 'Below Average';
  if (mood <= 60) return 'Neutral';
  if (mood <= 80) return 'Good';
  return 'Great';
};

// Entry Detail Modal
interface EntryDetailModalProps {
  entry: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (entry: any) => void;
  onDelete: (id: string) => void;
  token: string;
}

const EntryDetailModal = memo(({ entry, isOpen, onClose, onUpdate, onDelete, token }: EntryDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry?.content || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (entry) setEditContent(entry.content);
  }, [entry]);

  if (!isOpen || !entry) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editContent })
      });
      if (res.ok) {
        const json = await res.json();
        onUpdate(json.entry);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to update:', err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onDelete(entry.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const date = new Date(entry.created_at);
  const isIdea = entry.source === 'idea' || entry.source === 'brainstorm';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div>
            <span className={`entry-type-badge ${isIdea ? 'entry-type-idea' : 'entry-type-journal'}`}>
              {isIdea ? 'Idea' : 'Journal'}
            </span>
            <span style={{ marginLeft: '0.75rem', color: 'var(--muted)', fontSize: '13px' }}>
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Mood display - only for non-idea entries */}
        {!isIdea && entry.mood !== undefined && entry.mood !== null && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '13px', color: 'var(--fg-dim)' }}>Mood: {getMoodLabel(entry.mood)}</span>
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            style={{ minHeight: '200px', marginBottom: '1rem' }}
            autoFocus
          />
        ) : (
          <div style={{
            background: 'var(--input-bg)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
            maxHeight: '300px',
            overflow: 'auto',
          }}>
            {entry.content}
          </div>
        )}

        {/* Summary if exists */}
        {entry.summary && (
          <div style={{
            background: 'var(--accent-glow)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            borderLeft: '3px solid var(--accent)',
          }}>
            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--accent)' }}>AI Summary</strong>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--fg-dim)' }}>{entry.summary}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isEditing ? (
            <>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn" onClick={() => { setIsEditing(false); setEditContent(entry.content); }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setIsEditing(true)}>
                Edit
              </button>
              <button className="btn" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

EntryDetailModal.displayName = 'EntryDetailModal';

// Memoized entry card — minimal, clean design
const EntryCard = memo(function EntryCard({ 
  entry, 
  onClick, 
}: { 
  entry: any; 
  onClick: (entry: any) => void; 
}) {
  const date = new Date(entry.created_at);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const isIdea = entry.source === 'idea' || entry.source === 'brainstorm';
  
  return (
    <div style={cardStyles.card} onClick={() => onClick(entry)}>
      <div style={cardStyles.meta}>
        <span className={`entry-type-badge ${isIdea ? 'entry-type-idea' : 'entry-type-journal'}`}>
          {isIdea ? 'Idea' : 'Journal'}
        </span>
        <span style={cardStyles.date}>{dateStr}</span>
        <span style={cardStyles.time}>{timeStr}</span>
        {!isIdea && entry.mood !== undefined && entry.mood !== null && (
          <span style={cardStyles.mood}>{getMoodLabel(entry.mood)}</span>
        )}
      </div>
      <p style={cardStyles.preview}>
        {entry.content.slice(0, 150)}{entry.content.length > 150 ? '…' : ''}
      </p>
    </div>
  );
});

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem 1.25rem',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.625rem',
    fontSize: '12px',
    flexWrap: 'wrap',
  },
  date: {
    color: 'var(--fg)',
    fontWeight: 500,
  },
  time: {
    color: 'var(--muted)',
  },
  mood: {
    color: 'var(--fg-dim)',
    fontSize: '12px',
  },
  badge: {
    color: 'var(--success)',
    marginLeft: 'auto',
    fontSize: '11px',
    fontWeight: 500,
  },
  preview: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--fg-dim)',
    margin: '0 0 0.75rem',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
};

export default function Home() {
  const { user, loading: authLoading, token } = useAuth();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(50);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [distillLoading, setDistillLoading] = useState<string | null>(null);
  const [distillData, setDistillData] = useState<any>(null);
  const [distillOpen, setDistillOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Daily prompts state (3 prompts)
  const [dailyPrompts, setDailyPrompts] = useState<JournalPrompt[]>([]);
  const [promptAnswers, setPromptAnswers] = useState<string[]>(['', '', '']);
  
  // Stats state
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { 
    if (user && token) {
      fetchEntries();
      fetchStats();
      // Set today's prompts (3 random ones)
      setDailyPrompts([getRandomPrompt(), getRandomPrompt(), getRandomPrompt()]);
    }
  }, [user, token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token]);

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
    // Combine free text with prompt answers
    const allAnswers = promptAnswers.filter(a => a.trim()).map((answer, idx) => 
      dailyPrompts[idx] ? `**${dailyPrompts[idx].text}**\n${answer}` : answer
    );
    const fullContent = [content.trim(), ...allAnswers].filter(Boolean).join('\n\n');
    
    if (!fullContent) {
      setSaving(false);
      return;
    }
    
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ 
          content: fullContent, 
          mood, 
          source: 'text',
          is_locked: false
        })
      });
      if (res.ok) {
        const json = await res.json();
        setContent('');
        setMood(50);
        setPromptAnswers(['', '', '']);
        setEntries(prev => [json.entry, ...prev]);
        // Refresh stats after new entry
        fetchStats();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      alert('Failed to save. Try again.');
    }
    setSaving(false);
  }, [content, mood, token, promptAnswers, dailyPrompts, fetchStats]);

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

  const handleEntryClick = useCallback((entry: any) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  }, []);

  const handleEntryUpdate = useCallback((updatedEntry: any) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    setSelectedEntry(updatedEntry);
  }, []);

  const handleEntryDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleClose = useCallback(() => {
    setDistillOpen(false);
  }, []);

  // Handle prompt selection - refresh all 3 prompts
  const handleSurpriseMe = useCallback(() => {
    setDailyPrompts([getRandomPrompt(), getRandomPrompt(), getRandomPrompt()]);
    setPromptAnswers(['', '', '']);
  }, []);

  // Handle prompt answer change
  const handlePromptAnswerChange = useCallback((index: number, value: string) => {
    setPromptAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = value;
      return newAnswers;
    });
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
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
              <span>Journal</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span>AI Distill</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span>Tasks</span>
            </div>
            <a href="/auth/login" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
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
        {/* Header with Stats */}
        <header style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={styles.title}>Journal</h1>
              <p style={styles.subtitle}>Write freely, distill into tasks.</p>
            </div>
            {stats && (
              <div style={styles.statsWidget}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{stats.stats.currentStreak}</span>
                  <span style={styles.statLabel}>day streak</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>Lv {stats.level.current}</span>
                  <span style={styles.statLabel}>{stats.level.title}</span>
                </div>
              </div>
            )}
          </div>
          {stats?.motivationalMessage && (
            <p style={styles.motivational}>{stats.motivationalMessage}</p>
          )}
        </header>

        {/* Daily Prompts - 3 questions with answer areas */}
        {dailyPrompts.length > 0 && (
          <section style={styles.promptSection}>
            <div style={styles.promptHeader}>
              <span style={styles.promptLabel}>Today&apos;s Prompts</span>
              <button 
                className="btn btn-sm" 
                onClick={handleSurpriseMe}
                style={{ fontSize: '12px' }}
              >
                Surprise me
              </button>
            </div>
            
            <div style={styles.promptList}>
              {dailyPrompts.map((prompt, idx) => (
                <div key={prompt.id + idx} style={styles.promptCard}>
                  <span style={styles.promptCategory}>
                    {PROMPT_CATEGORIES.find(c => c.id === prompt.category)?.label}
                  </span>
                  <p style={styles.promptText}>{prompt.text}</p>
                  <textarea
                    value={promptAnswers[idx]}
                    onChange={(e) => handlePromptAnswerChange(idx, e.target.value)}
                    placeholder="Write your answer here..."
                    style={styles.promptAnswerArea}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Editor */}
        <section style={styles.editorSection}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
            style={styles.textarea}
          />
          
          {/* Mood Slider */}
          <div style={styles.moodSection}>
            <label style={styles.moodLabel}>
              <span>Mood</span>
              <span style={{ marginLeft: '0.5rem', fontWeight: 500 }}>{getMoodLabel(mood)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={mood}
              onChange={e => setMood(Number(e.target.value))}
              className="mood-slider"
            />
          </div>
          
          <button
            onClick={createEntry}
            disabled={saving || !content.trim()}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </section>

        {/* Entries */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Your Entries</h2>
            {!loading && <span style={styles.count}>{entries.length}</span>}
          </div>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : entries.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>No entries yet</p>
              <p style={styles.emptyHint}>Start writing above to create your first journal entry</p>
            </div>
          ) : (
            <div style={styles.entryList}>
              {entries.map(e => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onClick={handleEntryClick}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Entry Detail Modal */}
      <EntryDetailModal
        entry={selectedEntry}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdate={handleEntryUpdate}
        onDelete={handleEntryDelete}
        token={token || ''}
      />

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
    maxWidth: '680px',
    margin: '0 auto',
    padding: '1.5rem 1rem 4rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: 'clamp(22px, 5vw, 28px)',
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
    padding: '1rem',
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
    gap: '0.5rem',
    marginBottom: '1rem',
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
    minHeight: '120px',
    background: 'var(--input-bg)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.875rem',
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical',
  },
  moodSection: {
    marginTop: '0.875rem',
    padding: '0.75rem',
    background: 'var(--bg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  moodLabel: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.5rem',
    fontSize: '13px',
    color: 'var(--fg-dim)',
  },
  entryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  empty: {
    textAlign: 'center',
    padding: '2.5rem 1.5rem',
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
  // Hero (unauthenticated)
  hero: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    marginTop: '2rem',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  },
  heroTitle: {
    fontSize: 'clamp(28px, 8vw, 42px)',
    fontWeight: 700,
    color: 'var(--fg)',
    margin: '0 0 0.75rem',
    letterSpacing: '-0.03em',
  },
  heroSubtitle: {
    fontSize: '15px',
    color: 'var(--fg-dim)',
    margin: '0 0 1.5rem',
  },
  heroFeatures: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    fontSize: '13px',
    color: 'var(--fg-dim)',
    flexWrap: 'wrap',
  },
  // Stats widget
  statsWidget: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.125rem',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--accent-bright)',
  },
  statLabel: {
    fontSize: '10px',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  motivational: {
    fontSize: '13px',
    color: 'var(--fg-dim)',
    marginTop: '0.75rem',
    fontStyle: 'italic',
  },
  // Prompt section
  promptSection: {
    marginBottom: '1.5rem',
  },
  promptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  promptLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  promptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  promptCard: {
    background: 'var(--bg-card)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid var(--accent)',
  },
  promptCategory: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--accent-bright)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  promptText: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: 'var(--fg)',
    margin: '0.625rem 0',
  },
  promptAnswerArea: {
    width: '100%',
    minHeight: '80px',
    background: 'var(--input-bg)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    fontSize: '14px',
    lineHeight: 1.6,
    resize: 'vertical',
    marginTop: '0.5rem',
  },
};
