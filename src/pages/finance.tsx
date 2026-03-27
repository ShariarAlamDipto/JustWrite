import React, { useState, useEffect, useCallback } from 'react'
import { Nav } from '@/components/Nav'
import { useAuth } from '@/lib/useAuth'

// ── Types ───────────────────────────────────────────────────────────────────
interface Txn {
  id: string
  kind: 'income' | 'expense'
  amount: number
  category?: string
  note?: string
  created_at: string
}

interface DayLog {
  id: string
  date: string
  status: 'open' | 'closed'
  start_spendable: number
  end_spendable?: number
  start_reserve: number
  end_reserve?: number
  notes?: string
  finance_txns: Txn[]
}

// ── Formatting helpers ──────────────────────────────────────────────────────
const fmt = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

const todayISO = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Quick Add Modal ─────────────────────────────────────────────────────────
function QuickAddModal({
  kind,
  onSave,
  onClose,
}: {
  kind: 'income' | 'expense'
  onSave: (amount: number, category: string, note: string) => Promise<void>
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setErr('Enter a valid amount'); return }
    setSaving(true)
    setErr('')
    try {
      await onSave(amt, category, note)
      onClose()
    } catch {
      setErr('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modal.backdrop} onClick={onClose}>
      <div style={modal.card} onClick={(e) => e.stopPropagation()}>
        <div style={modal.header}>
          <span style={{ fontWeight: 600, fontSize: '16px', color: kind === 'expense' ? '#e53e3e' : '#38a169' }}>
            + {kind === 'expense' ? 'Expense' : 'Income'}
          </span>
          <button style={modal.close} onClick={onClose}>×</button>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '0.75rem' }}>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setErr('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            style={{ ...modal.input, fontSize: '24px', fontWeight: 600, textAlign: 'center' }}
          />
          {err && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '0.25rem', textAlign: 'center' }}>{err}</p>}
        </div>

        {/* Progressive disclosure: details */}
        <button
          onClick={() => setShowDetails((v) => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', padding: '0 0 0.5rem', fontFamily: 'inherit' }}
        >
          {showDetails ? '▲ Hide details' : '▼ Add details (optional)'}
        </button>

        {showDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              placeholder="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={modal.input}
            />
            <input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={modal.input}
            />
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !amount.trim()}
          className="btn btn-primary"
          style={{ width: '100%', opacity: !amount.trim() ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : `Save ${kind}`}
        </button>
      </div>
    </div>
  )
}

const modal: Record<string, React.CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom)' },
  card: { background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '1.5rem', width: '100%', maxWidth: '480px', border: '1px solid var(--border)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  close: { background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '22px', cursor: 'pointer', padding: 0, lineHeight: 1 },
  input: { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--fg)', padding: '0.75rem', fontSize: '15px', fontFamily: 'inherit', outline: 'none' },
}

// ── Start/Close Day Modal ───────────────────────────────────────────────────
function DaySetupModal({
  mode,
  day,
  onSave,
  onClose,
}: {
  mode: 'start' | 'close'
  day: DayLog | null
  onSave: (spendable: number, reserve: number) => Promise<void>
  onClose: () => void
}) {
  const [spendable, setSpendable] = useState(
    mode === 'close' ? (day?.end_spendable?.toString() ?? '') : (day?.end_spendable?.toString() ?? '')
  )
  const [reserve, setReserve] = useState(
    mode === 'close' ? (day?.end_reserve?.toString() ?? '') : ''
  )
  const [saving, setSaving] = useState(false)

  // For "close" mode: compute reconciliation
  const loggedIncome = day?.finance_txns.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const loggedExpense = day?.finance_txns.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const expectedEnd = mode === 'close' && day ? day.start_spendable + loggedIncome - loggedExpense : null
  const actualEnd = parseFloat(spendable) || null
  const diff = expectedEnd != null && actualEnd != null ? actualEnd - expectedEnd : null

  const handleSave = async () => {
    const s = parseFloat(spendable)
    const r = parseFloat(reserve || '0')
    if (isNaN(s)) return
    setSaving(true)
    try { await onSave(s, r); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div style={modal.backdrop} onClick={onClose}>
      <div style={modal.card} onClick={(e) => e.stopPropagation()}>
        <div style={modal.header}>
          <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--fg)' }}>
            {mode === 'start' ? 'Start Today' : 'Close Day'}
          </span>
          <button style={modal.close} onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>
              {mode === 'start' ? 'Starting' : 'Ending'} Spendable
            </label>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={spendable}
              onChange={(e) => setSpendable(e.target.value)}
              style={modal.input}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>
              {mode === 'start' ? 'Starting' : 'Ending'} Reserve / Stored
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
              style={modal.input}
            />
          </div>
        </div>

        {/* Reconciliation panel (close mode only) */}
        {mode === 'close' && expectedEnd != null && (
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Reconciliation
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Expected end (from log)</span>
                <span style={{ color: 'var(--fg)' }}>{fmt(expectedEnd)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Actual end (entered)</span>
                <span style={{ color: 'var(--fg)' }}>{actualEnd != null ? fmt(actualEnd) : '—'}</span>
              </div>
              {diff != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid var(--border)', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--muted)' }}>Difference</span>
                  <span style={{ fontWeight: 600, color: diff === 0 ? '#38a169' : diff > 0 ? '#3182ce' : '#e53e3e' }}>
                    {diff > 0 ? '+' : ''}{fmt(diff)}
                  </span>
                </div>
              )}
            </div>
            {diff != null && diff !== 0 && (
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '0.5rem' }}>
                {diff < 0 ? 'Some expenses may be unlogged.' : 'Some income may be unlogged.'}
              </p>
            )}
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !spendable.trim()} className="btn btn-primary" style={{ width: '100%' }}>
          {saving ? 'Saving…' : mode === 'start' ? 'Start Day' : 'Close Day'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
type Tab = 'today' | 'history'

export default function FinancePage() {
  const { user, token } = useAuth()
  const [days, setDays] = useState<DayLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')
  const [quickAdd, setQuickAdd] = useState<'income' | 'expense' | null>(null)
  const [dayModal, setDayModal] = useState<'start' | 'close' | null>(null)

  const today = todayISO()
  const todayLog = days.find((d) => d.date === today) ?? null

  const loadDays = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/finance/days', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const { days } = await res.json()
        setDays(days ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { if (user && token) loadDays() }, [user, token, loadDays])

  // ── Today's totals ──────────────────────────────────────────────────────
  const income = todayLog?.finance_txns.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const expense = todayLog?.finance_txns.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const netToday = income - expense

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleStartDay = async (spendable: number, reserve: number) => {
    const res = await fetch('/api/finance/days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ date: today, start_spendable: spendable, start_reserve: reserve }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to start day')
    }
    await loadDays()
  }

  const handleCloseDay = async (spendable: number, reserve: number) => {
    if (!todayLog) return
    const res = await fetch('/api/finance/days', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ id: todayLog.id, end_spendable: spendable, end_reserve: reserve, status: 'closed' }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to close day')
    }
    await loadDays()
  }

  const handleAddTxn = async (amount: number, category: string, note: string) => {
    if (!todayLog) return
    const res = await fetch('/api/finance/txns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ day_id: todayLog.id, kind: quickAdd, amount, category, note }),
    })
    if (res.ok) await loadDays()
  }

  const handleDeleteTxn = async (id: string) => {
    await fetch(`/api/finance/txns/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
    await loadDays()
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main style={styles.main}>
          <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Sign in to track finances</h2>
            <a href="/auth/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>Sign in</a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Nav />
      <main style={styles.main}>
        {/* Header */}
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={styles.title}>Finance</h1>
          <p style={styles.subtitle}>Journal-style daily money tracker</p>
        </header>

        {/* Tabs */}
        <div style={styles.tabs}>
          {(['today', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...styles.tab,
                color: tab === t ? 'var(--accent-bright)' : 'var(--muted)',
                borderBottom: tab === t ? '2px solid var(--accent-bright)' : '2px solid transparent',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        ) : tab === 'today' ? (
          <TodayView
            day={todayLog}
            today={today}
            income={income}
            expense={expense}
            netToday={netToday}
            onStartDay={() => setDayModal('start')}
            onCloseDay={() => setDayModal('close')}
            onAddExpense={() => setQuickAdd('expense')}
            onAddIncome={() => setQuickAdd('income')}
            onDeleteTxn={handleDeleteTxn}
          />
        ) : (
          <HistoryView days={days} today={today} />
        )}
      </main>

      {/* Modals */}
      {quickAdd && todayLog && (
        <QuickAddModal kind={quickAdd} onSave={handleAddTxn} onClose={() => setQuickAdd(null)} />
      )}
      {dayModal === 'start' && (
        <DaySetupModal mode="start" day={todayLog} onSave={handleStartDay} onClose={() => setDayModal(null)} />
      )}
      {dayModal === 'close' && todayLog && (
        <DaySetupModal mode="close" day={todayLog} onSave={handleCloseDay} onClose={() => setDayModal(null)} />
      )}
    </>
  )
}

// ── Today View ──────────────────────────────────────────────────────────────
function TodayView({
  day, today, income, expense, netToday,
  onStartDay, onCloseDay, onAddExpense, onAddIncome, onDeleteTxn,
}: {
  day: DayLog | null
  today: string
  income: number
  expense: number
  netToday: number
  onStartDay: () => void
  onCloseDay: () => void
  onAddExpense: () => void
  onAddIncome: () => void
  onDeleteTxn: (id: string) => void
}) {
  const txns = day?.finance_txns ?? []
  const sorted = [...txns].sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (!day) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
        <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--fg)', marginBottom: '0.5rem' }}>{fmtDate(today)}</p>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '1.5rem' }}>
          Start with today's balance. Log nothing else if you don't want to — you can still close the day and see what changed.
        </p>
        <button onClick={onStartDay} className="btn btn-primary">Start today</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Day Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{fmtDate(today)}</p>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
              background: day.status === 'closed' ? 'rgba(56,161,105,0.15)' : 'rgba(49,130,206,0.12)',
              color: day.status === 'closed' ? '#38a169' : '#3182ce',
            }}>
              {day.status === 'closed' ? 'Closed' : 'Open'}
            </span>
          </div>
          {day.status === 'open' && (
            <button onClick={onCloseDay} className="btn" style={{ fontSize: '13px' }}>Close day</button>
          )}
        </div>

        {/* Balance grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <BalanceItem label="Start Spendable" value={day.start_spendable} />
          <BalanceItem label="Start Reserve" value={day.start_reserve} />
          {day.status === 'closed' && <BalanceItem label="End Spendable" value={day.end_spendable} />}
          {day.status === 'closed' && <BalanceItem label="End Reserve" value={day.end_reserve} />}
        </div>

        {/* Net today */}
        {txns.length > 0 && (
          <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Logged today</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: netToday >= 0 ? '#38a169' : '#e53e3e' }}>
              {netToday >= 0 ? '+' : ''}{fmt(netToday)}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {day.status === 'open' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onAddExpense}
            className="btn"
            style={{ flex: 1, borderColor: 'rgba(229,62,62,0.3)', color: '#e53e3e' }}
          >
            − Expense
          </button>
          <button
            onClick={onAddIncome}
            className="btn"
            style={{ flex: 1, borderColor: 'rgba(56,161,105,0.3)', color: '#38a169' }}
          >
            + Income
          </button>
        </div>
      )}

      {/* Transaction log */}
      {sorted.length > 0 && (
        <section>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Today&apos;s Log</span>
            <span style={styles.count}>{sorted.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sorted.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, minWidth: '70px', color: t.kind === 'expense' ? '#e53e3e' : '#38a169', textAlign: 'right' }}>
                  {t.kind === 'expense' ? '−' : '+'}{fmt(t.amount)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {t.category && <span style={{ fontSize: '11px', color: 'var(--accent-bright)', marginRight: '0.5rem' }}>{t.category}</span>}
                  {t.note && <span style={{ fontSize: '13px', color: 'var(--fg-dim)' }}>{t.note}</span>}
                  {!t.category && !t.note && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t.kind}</span>}
                </div>
                <button
                  onClick={() => onDeleteTxn(t.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px 6px', fontSize: '16px' }}
                  aria-label="Delete"
                >×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No transactions yet */}
      {day.status === 'open' && sorted.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '1rem 0' }}>
          No entries yet. Tap − Expense or + Income to log, or skip logging — close tonight.
        </p>
      )}
    </div>
  )
}

function BalanceItem({ label, value }: { label: string; value?: number | null }) {
  return (
    <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{fmt(value)}</p>
    </div>
  )
}

// ── History View ────────────────────────────────────────────────────────────
function HistoryView({ days, today }: { days: DayLog[]; today: string }) {
  const past = days.filter((d) => d.date !== today)

  if (past.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)', color: 'var(--muted)' }}>
        <p>No past days yet. Close today&apos;s day to see it here.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {past.map((day) => {
        const expense = day.finance_txns.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0)
        const income = day.finance_txns.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0)
        const net = income - expense
        const endKnown = day.end_spendable != null
        return (
          <div key={day.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '10px',
                  background: day.status === 'closed' ? 'rgba(56,161,105,0.12)' : 'rgba(229,62,62,0.1)',
                  color: day.status === 'closed' ? '#38a169' : '#e53e3e',
                }}>
                  {day.status === 'closed' ? 'Closed' : 'Open'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {endKnown && <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>{fmt(day.end_spendable)}</p>}
                {day.finance_txns.length > 0 && (
                  <p style={{ fontSize: '12px', color: net >= 0 ? '#38a169' : '#e53e3e', margin: '0.1rem 0 0' }}>
                    {net >= 0 ? '+' : ''}{fmt(net)} net · {day.finance_txns.length} entries
                  </p>
                )}
              </div>
            </div>
            {endKnown && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '12px', color: 'var(--muted)' }}>
                <span>Start: {fmt(day.start_spendable)}</span>
                <span>End: {fmt(day.end_spendable)}</span>
                {day.start_reserve > 0 && <span>Reserve: {fmt(day.end_reserve ?? day.start_reserve)}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem 4rem' },
  title: { fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--fg)', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '14px', color: 'var(--muted)', margin: '0.375rem 0 0' },
  tabs: { display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' },
  tab: { background: 'transparent', border: 'none', padding: '0.625rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', transition: 'all 0.15s ease' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' },
  sectionTitle: { fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  count: { fontSize: '12px', color: 'var(--accent-bright)', background: 'var(--accent-glow)', padding: '0.125rem 0.5rem', borderRadius: '12px', fontWeight: 500 },
}
