import React, { useState } from 'react'
import { Nav } from '@/components/Nav'
import { useAuth } from '@/lib/useAuth'
import VoiceCapture from '@/components/voice/VoiceCapture'

const priorityColors: Record<string, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
}

export default function IdeasPage() {
  const { user, token } = useAuth()
  const [freeText, setFreeText] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [addingTasks, setAddingTasks] = useState(false)
  const [savingIdea, setSavingIdea] = useState(false)

  const handleGenerate = async () => {
    if (!freeText.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ text: freeText }),
      })
      if (res.ok) {
        const json = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasksWithIds = (json.tasks || []).map((t: any, i: number) => ({
          ...t,
          id: `task-${Date.now()}-${i}`,
        }))
        setGeneratedTasks(tasksWithIds)
        setSelectedTasks(new Set(tasksWithIds.map((t: { id: string }) => t.id)))
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }

  const handleSaveAsIdea = async () => {
    if (!freeText.trim()) return
    setSavingIdea(true)
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ content: freeText.trim(), source: 'idea', is_locked: false }),
      })
      if (res.ok) {
        setFreeText('')
        alert('Idea saved')
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch {
      alert('Failed to save idea.')
    }
    setSavingIdea(false)
  }

  const toggleTask = (id: string) => {
    const next = new Set(selectedTasks)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedTasks(next)
  }

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setGeneratedTasks((prev) => prev.filter((t) => t.id !== id))
    setSelectedTasks((prev) => { const s = new Set(prev); s.delete(id); return s })
  }

  const handleAddSelected = async () => {
    if (selectedTasks.size === 0) return
    setAddingTasks(true)
    const toAdd = generatedTasks.filter((t) => selectedTasks.has(t.id))
    try {
      const results = await Promise.all(
        toAdd.map((t) =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
            body: JSON.stringify({ title: t.title, description: t.description, priority: t.priority, status: 'todo' }),
          })
        )
      )
      if (results.every((r) => r.ok)) {
        setSelectedTasks(new Set())
        setGeneratedTasks([])
        setFreeText('')
        alert(`Added ${toAdd.length} task(s)`)
      } else {
        alert('Some tasks failed. Try again.')
      }
    } catch {
      alert('Failed to add tasks.')
    }
    setAddingTasks(false)
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <div style={styles.authCard}>
            <h2 style={{ marginBottom: '0.5rem' }}>Sign in to capture ideas</h2>
            <p style={{ color: 'var(--muted)' }}>Create an account to save your ideas</p>
            <a href="/auth/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Sign in
            </a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Nav />
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>Ideas</h1>
          <p style={styles.subtitle}>Dump your thoughts, extract actionable tasks</p>
        </header>

        <section style={styles.editorSection}>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Write anything… ideas, todos, notes, random thoughts…"
            style={styles.textarea}
          />
          <div style={styles.buttonRow}>
            <VoiceCapture
              isDark={false}
              compact
              onTranscript={(text) =>
                setFreeText((prev) => prev ? `${prev}\n\n${text}` : text)
              }
            />
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

        {generatedTasks.length > 0 && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Extracted Tasks</h2>
              <span style={styles.count}>{selectedTasks.size}/{generatedTasks.length} selected</span>
            </div>
            <div style={styles.taskList}>
              {generatedTasks.map((task) => (
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
                    {task.description && <p style={styles.taskDesc}>{task.description}</p>}
                    <span style={{ ...styles.taskPriority, color: priorityColors[task.priority] || priorityColors.medium }}>
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
                onClick={() => { setGeneratedTasks([]); setSelectedTasks(new Set()) }}
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
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem 4rem' },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--fg)', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '14px', color: 'var(--muted)', margin: '0.375rem 0 0' },
  editorSection: { background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '1px solid var(--border)' },
  textarea: { width: '100%', minHeight: '160px', background: 'var(--input-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '15px', lineHeight: 1.6, resize: 'vertical' as const },
  buttonRow: { display: 'flex', gap: '0.5rem', marginTop: '1rem' },
  section: { marginBottom: '2rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' },
  sectionTitle: { fontSize: '12px', fontWeight: 600, margin: 0, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  count: { fontSize: '12px', color: 'var(--accent-bright)', background: 'var(--accent-glow)', padding: '0.125rem 0.5rem', borderRadius: '12px', fontWeight: 500 },
  taskList: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  taskItem: { display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.15s ease' },
  checkbox: { width: '20px', height: '20px', minWidth: '20px', border: '2px solid var(--border)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#ffffff', marginTop: '2px', transition: 'all 0.15s ease' },
  taskContent: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: '15px', fontWeight: 500, color: 'var(--fg)', display: 'block', lineHeight: 1.4, wordBreak: 'break-word' as const },
  taskDesc: { fontSize: '13px', color: 'var(--fg-dim)', margin: '0.375rem 0 0', lineHeight: 1.5, wordBreak: 'break-word' as const },
  taskPriority: { fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, marginTop: '0.375rem', display: 'inline-block' },
  deleteBtn: { background: 'transparent', color: 'var(--muted)', border: 'none', width: '28px', height: '28px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', padding: 0 },
  actions: { display: 'flex', gap: '0.5rem', marginTop: '1rem' },
  authCard: { textAlign: 'center' as const, padding: '3rem 2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' },
}
