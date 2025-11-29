import React, { useState, useEffect, useCallback, memo } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

// Mood level mapping
const getMoodLabel = (mood: number) => {
  if (mood <= 20) return 'Low';
  if (mood <= 40) return 'Below Average';
  if (mood <= 60) return 'Neutral';
  if (mood <= 80) return 'Good';
  return 'Great';
};

// Simple hash function for PIN verification (not crypto-secure, but sufficient for local privacy)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// Entry Card Component
const EntryCard = memo(({ entry, onClick }: { entry: any; onClick: () => void }) => {
  const date = new Date(entry.created_at);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  return (
    <div className="card entry-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {dateStr} at {timeStr}
        </span>
        {entry.mood && (
          <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
            {getMoodLabel(entry.mood)}
          </span>
        )}
      </div>
      <p style={{ 
        margin: 0, 
        fontSize: '14px',
        lineHeight: 1.5,
        color: 'var(--text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical'
      }}>
        {entry.content}
      </p>
      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--surface)', borderRadius: '4px', color: 'var(--text-muted)' }}>
          Private
        </span>
      </div>
    </div>
  );
});

EntryCard.displayName = 'EntryCard';

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
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button onClick={onClose} className="btn" style={{ fontSize: '18px', padding: '0.25rem 0.5rem' }}>×</button>
        </div>

        {entry.mood && (
          <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'var(--surface)', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mood: </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent)' }}>{getMoodLabel(entry.mood)}</span>
          </div>
        )}

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="textarea"
            style={{ minHeight: '200px', marginBottom: '1rem' }}
          />
        ) : (
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: 1.7, 
            marginBottom: '1rem',
            padding: '1rem',
            background: 'var(--surface)',
            borderRadius: '8px'
          }}>
            {entry.content}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isEditing ? (
            <>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setIsEditing(false); setEditContent(entry.content); }} className="btn">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn">Edit</button>
              <button onClick={handleCopy} className="btn">{copied ? 'Copied!' : 'Copy'}</button>
              <button onClick={handleDelete} className="btn" style={{ color: '#ff6b6b' }}>Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

EntryDetailModal.displayName = 'EntryDetailModal';

// PIN Setup Modal
const PinSetupModal = ({ isOpen, onClose, onSetPin }: { isOpen: boolean; onClose: () => void; onSetPin: (pin: string) => void }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('PIN must be at least 4 characters');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    onSetPin(pin);
    setPin('');
    setConfirmPin('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Set Up Private PIN</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Create a PIN to protect your private journal entries. This PIN is stored locally on your device.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter PIN (min 4 characters)"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="input"
            style={{ marginBottom: '0.75rem' }}
          />
          <input
            type="password"
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value)}
            className="input"
            style={{ marginBottom: '0.75rem' }}
          />
          {error && <p style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '0.75rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">Set PIN</button>
            <button type="button" onClick={onClose} className="btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// PIN Entry Modal
const PinEntryModal = ({ isOpen, onClose, onVerify }: { isOpen: boolean; onClose: () => void; onVerify: (pin: string) => boolean }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onVerify(pin)) {
      setPin('');
      setError('');
      onClose();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Enter PIN</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Enter your PIN to access private entries.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="input"
            style={{ marginBottom: '0.75rem' }}
            autoFocus
          />
          {error && <p style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '0.75rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">Unlock</button>
            <button type="button" onClick={onClose} className="btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Mood Slider Component
const MoodSlider = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mood</span>
        <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>{getMoodLabel(value)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mood-slider"
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default function LockedJournal() {
  const { user, loading: authLoading, token } = useAuth();
  const isAuthenticated = !!user;
  
  // States
  const [entries, setEntries] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(50);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  
  // PIN/Lock states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  // Check for existing PIN on mount
  useEffect(() => {
    const storedPinHash = localStorage.getItem('justwrite_locked_pin');
    if (storedPinHash) {
      setHasPin(true);
      setShowPinEntry(true);
    } else {
      setShowPinSetup(true);
    }
  }, []);

  // Load entries when unlocked
  useEffect(() => {
    if (!isAuthenticated || !token || !isUnlocked) return;
    loadEntries();
  }, [isAuthenticated, token, isUnlocked]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entries?locked=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setEntries(json.entries || []);
      }
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = (pin: string) => {
    const pinHash = hashPin(pin);
    localStorage.setItem('justwrite_locked_pin', pinHash);
    setHasPin(true);
    setIsUnlocked(true);
  };

  const handleVerifyPin = (pin: string): boolean => {
    const storedHash = localStorage.getItem('justwrite_locked_pin');
    const inputHash = hashPin(pin);
    if (storedHash === inputHash) {
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const handleResetPin = () => {
    if (confirm('Reset your PIN? You will need to set a new one.')) {
      localStorage.removeItem('justwrite_locked_pin');
      setHasPin(false);
      setIsUnlocked(false);
      setShowPinSetup(true);
    }
  };

  const handleSave = async () => {
    if (!content.trim() || !token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          mood,
          is_locked: true
        })
      });
      if (res.ok) {
        const json = await res.json();
        setEntries(prev => [json.entry, ...prev]);
        setContent('');
        setMood(50);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEntryUpdate = (updated: any) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEntry(updated);
  };

  const handleEntryDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  if (authLoading) {
    return (
      <>
        <Nav />
        <main className="container" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <p>Loading...</p>
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Nav />
        <main className="container" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <h1>Private Journal</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Sign in to access your private entries.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Private Journal</h1>
            {isUnlocked && (
              <button onClick={handleResetPin} className="btn" style={{ fontSize: '12px' }}>
                Reset PIN
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '0.5rem' }}>
            Your most personal thoughts, protected by PIN.
          </p>
        </div>

        {/* PIN Modals */}
        <PinSetupModal 
          isOpen={showPinSetup} 
          onClose={() => {}} 
          onSetPin={handleSetPin} 
        />
        <PinEntryModal 
          isOpen={showPinEntry && !isUnlocked} 
          onClose={() => {}} 
          onVerify={handleVerifyPin} 
        />

        {/* Entry Detail Modal */}
        <EntryDetailModal
          entry={selectedEntry}
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleEntryUpdate}
          onDelete={handleEntryDelete}
          token={token || ''}
        />

        {/* Main Content - Only show when unlocked */}
        {isUnlocked && (
          <>
            {/* New Entry Editor */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <MoodSlider value={mood} onChange={setMood} />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your private thoughts here..."
                className="textarea"
                style={{ minHeight: '150px', marginBottom: '1rem' }}
              />
              <button 
                onClick={handleSave} 
                disabled={saving || !content.trim()}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : 'Save Private Entry'}
              </button>
            </div>

            {/* Entries List */}
            <div>
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                Private Entries ({entries.length})
              </h2>
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading entries...</p>
              ) : entries.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No private entries yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {entries.map(entry => (
                    <EntryCard 
                      key={entry.id} 
                      entry={entry} 
                      onClick={() => setSelectedEntry(entry)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
