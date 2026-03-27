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
  // Store pending change together with the note ID it belongs to,
  // so the timer callback always saves to the correct note even after switching.
  const pendingChange = useRef<{
    noteId: string;
    title: string;
    icon: string | null;
    blocks: Block[];
  } | null>(null);

  // ── Flush any pending save immediately ──────────────────────────────────────

  const flushSave = useCallback(async () => {
    if (!pendingChange.current || !user || !token) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const change = pendingChange.current;
    pendingChange.current = null;
    try {
      const res = await fetch(`/api/notes/${change.noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: change.title, icon: change.icon, blocks: change.blocks }),
      });
      if (res.ok) {
        setSaving('saved');
        setNotes(prev => prev.map(n =>
          n.id === change.noteId
            ? { ...n, title: change.title || 'Untitled', icon: change.icon }
            : n
        ));
      } else {
        setSaving('error');
      }
    } catch {
      setSaving('error');
    }
  }, [user, token]);

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
    // Flush any pending save for the previous note before switching
    await flushSave();
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
  }, [user, token, flushSave]);

  // ── Create note ─────────────────────────────────────────────────────────────

  const createNote = useCallback(async () => {
    if (!user || !token) return;
    // Flush any pending save before creating a new note
    await flushSave();
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
  }, [user, token, openNote, flushSave]);

  // ── Delete note ─────────────────────────────────────────────────────────────

  const deleteNote = useCallback(async (id: string) => {
    if (!user || !token || !confirm('Delete this note?')) return;
    // If deleting the note with a pending save, discard it
    if (pendingChange.current?.noteId === id) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      pendingChange.current = null;
    }
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

  // ── Auto-save (debounced 1.5 s) ─────────────────────────────────────────────

  const handleEditorChange = useCallback((
    title: string,
    icon: string | null,
    blocks: Block[],
  ) => {
    if (!selectedNote || !user || !token) return;

    // Always record the note ID alongside the change so the timer callback
    // saves to the correct note even if the user has switched notes.
    pendingChange.current = { noteId: selectedNote.id, title, icon, blocks };
    setSaving('saving');

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const change = pendingChange.current;
      if (!change || !user || !token) return;
      pendingChange.current = null;
      try {
        const res = await fetch(`/api/notes/${change.noteId}`, {
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
            n.id === change.noteId
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
