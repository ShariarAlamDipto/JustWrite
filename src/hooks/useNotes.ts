import { useState, useCallback, useRef } from 'react';
import type { Block } from '@/components/notes/BlockEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoteListItem {
  id: string;
  title: string;
  icon: string | null;
  parent_id: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  updated_at: string;
}

export interface NoteDetail extends NoteListItem {
  blocks: Block[];
  cover_url: string | null;
  backlinks?: { id: string; title: string; icon: string | null }[];
}

export type SaveStatus = 'saved' | 'saving' | 'error';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotes(user: { id: string } | null, token: string | null) {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingNote, setLoadingNote] = useState(false);
  const [saving, setSaving] = useState<SaveStatus>('saved');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChange = useRef<{ title: string; icon: string | null; blocks: Block[] } | null>(null);

  // ── Load notes list ─────────────────────────────────────────────────────────

  const loadNotes = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await fetch('/api/notes?parent_id=null', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { notes } = await res.json();
        setNotes(notes || []);
      }
    } finally {
      setLoadingList(false);
    }
  }, [user, token]);

  // ── Open a note ─────────────────────────────────────────────────────────────

  const openNote = useCallback(async (id: string) => {
    if (!user || !token) return;
    setLoadingNote(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { note } = await res.json();
        setSelectedNote(note);
      }
    } finally {
      setLoadingNote(false);
    }
  }, [user, token]);

  // ── Create note ─────────────────────────────────────────────────────────────

  const createNote = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'Untitled', blocks: [] }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Failed to create note' }));
        alert(payload.error || 'Failed to create note');
        return;
      }

      const { note } = await res.json();
      setNotes(prev => [note, ...prev]);
      await openNote(note.id);
    } catch {
      alert('Failed to create note. Please try again.');
    }
  }, [user, token, openNote]);

  // ── Delete note ─────────────────────────────────────────────────────────────

  const deleteNote = useCallback(async (id: string) => {
    if (!user || !token || !confirm('Delete this note?')) return;
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== id));
      setSelectedNote(prev => prev?.id === id ? null : prev);
    }
  }, [user, token]);

  // ── Pin / unpin ─────────────────────────────────────────────────────────────

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    if (!user || !token) return;
    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_pinned: !pinned }),
    });
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !pinned } : n));
  }, [user, token]);

  // ── Auto-save (debounced, 1.5s) ─────────────────────────────────────────────

  const handleEditorChange = useCallback((
    title: string,
    icon: string | null,
    blocks: Block[]
  ) => {
    if (!selectedNote || !user || !token) return;
    pendingChange.current = { title, icon, blocks };
    setSaving('saving');

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const change = pendingChange.current;
      if (!change || !selectedNote || !user || !token) return;
      try {
        const res = await fetch(`/api/notes/${selectedNote.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: change.title, icon: change.icon, blocks: change.blocks }),
        });
        if (res.ok) {
          setSaving('saved');
          setNotes(prev => prev.map(n =>
            n.id === selectedNote.id
              ? { ...n, title: change.title || 'Untitled', icon: change.icon }
              : n
          ));
        } else {
          setSaving('error');
        }
      } catch {
        setSaving('error');
      }
    }, 1500);
  }, [selectedNote, user, token]);

  return {
    notes,
    selectedNote,
    loadingList,
    loadingNote,
    saving,
    loadNotes,
    openNote,
    createNote,
    deleteNote,
    togglePin,
    handleEditorChange,
  };
}
