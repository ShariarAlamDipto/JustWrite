import React, { useState, useEffect } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';
import { PROMPT_CATEGORIES, PromptCategory } from '../lib/prompts';

interface CustomPrompt {
  id: string;
  text: string;
  category: string;
  created_at: string;
}

export default function Prompts() {
  const { user, loading: authLoading, token } = useAuth();
  const isAuthenticated = !!user;
  
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState<string>('custom');
  const [showForm, setShowForm] = useState(false);

  // Load custom prompts
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    loadPrompts();
  }, [isAuthenticated, token]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prompts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setPrompts(json.prompts || []);
      }
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptText.trim() || !token) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: newPromptText,
          category: newPromptCategory
        })
      });
      
      if (res.ok) {
        const json = await res.json();
        setPrompts(prev => [json.prompt, ...prev]);
        setNewPromptText('');
        setNewPromptCategory('custom');
        setShowForm(false);
      }
    } catch (err) {
      console.error('Failed to create prompt:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt?')) return;
    
    try {
      const res = await fetch('/api/prompts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      
      if (res.ok) {
        setPrompts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  const getCategoryLabel = (categoryId: string) => {
    if (categoryId === 'custom') return 'Custom';
    const cat = PROMPT_CATEGORIES.find(c => c.id === categoryId);
    return cat?.label || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    const colors: Record<string, string> = {
      gratitude: '#38a169',
      reflection: '#3182ce',
      emotional_checkin: '#dd6b20',
      morning_intentions: '#805ad5',
      self_discovery: '#d69e2e',
      creative: '#e53e3e',
      custom: 'var(--accent)'
    };
    return colors[categoryId] || 'var(--accent)';
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
          <h1>Custom Prompts</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
            Sign in to create and manage your custom prompts.
          </p>
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
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Custom Prompts</h1>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="btn btn-primary"
              style={{ fontSize: '14px' }}
            >
              {showForm ? 'Cancel' : '+ New Prompt'}
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '0.5rem' }}>
            Create your own journal prompts to inspire your writing.
          </p>
        </div>

        {/* New Prompt Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '1rem' }}>Create New Prompt</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Prompt Text
              </label>
              <textarea
                value={newPromptText}
                onChange={e => setNewPromptText(e.target.value)}
                placeholder="What question would you like to reflect on?"
                className="textarea"
                style={{ minHeight: '100px' }}
                maxLength={500}
                required
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.25rem' }}>
                {newPromptText.length}/500
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Category
              </label>
              <select
                value={newPromptCategory}
                onChange={e => setNewPromptCategory(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="custom">Custom</option>
                {PROMPT_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={saving || !newPromptText.trim()}
              className="btn btn-primary"
            >
              {saving ? 'Creating...' : 'Create Prompt'}
            </button>
          </form>
        )}

        {/* Prompts List */}
        <div>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Your Prompts ({prompts.length})
          </h2>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading prompts...</p>
          ) : prompts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                No custom prompts yet.
              </p>
              <button onClick={() => setShowForm(true)} className="btn btn-primary">
                Create Your First Prompt
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {prompts.map(prompt => (
                <div key={prompt.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, marginBottom: '0.5rem', lineHeight: 1.6 }}>
                        {prompt.text}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          background: getCategoryColor(prompt.category) + '20',
                          color: getCategoryColor(prompt.category),
                          borderRadius: '4px',
                          fontWeight: 500
                        }}>
                          {getCategoryLabel(prompt.category)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(prompt.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(prompt.id)} 
                      className="btn"
                      style={{ fontSize: '12px', padding: '0.25rem 0.5rem', color: '#ff6b6b' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="card" style={{ marginTop: '2rem', background: 'var(--surface)', borderLeft: '3px solid var(--accent)' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '0.75rem' }}>Tips for Good Prompts</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <li>Ask open-ended questions that invite reflection</li>
            <li>Be specific enough to provide direction</li>
            <li>Include emotional or sensory elements</li>
            <li>Consider prompts that connect past, present, and future</li>
          </ul>
        </div>
      </main>
    </>
  );
}
