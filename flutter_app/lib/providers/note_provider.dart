import 'dart:async';
import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/note.dart';
import 'package:justwrite_mobile/services/notes_service.dart';

enum SaveStatus { saved, saving, error }

class NoteProvider extends ChangeNotifier {
  final _service = NotesService();

  List<Note> _notes = [];
  Note? _selectedNote;
  bool _isLoading = false;
  SaveStatus _saveStatus = SaveStatus.saved;
  String? _error;
  Timer? _saveTimer;

  List<Note> get notes => _notes;
  Note? get selectedNote => _selectedNote;
  bool get isLoading => _isLoading;
  SaveStatus get saveStatus => _saveStatus;
  String? get error => _error;

  List<Note> filtered(String query) {
    if (query.isEmpty) return _notes;
    final q = query.toLowerCase();
    return _notes
        .where((n) =>
            n.title.toLowerCase().contains(q) ||
            n.snippet.toLowerCase().contains(q))
        .toList();
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  Future<void> loadNotes() async {
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _notes = await _service.listNotes();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Select ────────────────────────────────────────────────────────────────

  Future<void> selectNote(String id) async {
    // Optimistic: show from list immediately
    final cached = _notes.firstWhere((n) => n.id == id, orElse: () => _notes.first);
    _selectedNote = cached;
    notifyListeners();

    // Fetch full note with blocks
    final full = await _service.getNoteById(id);
    if (full != null) {
      _selectedNote = full;
      final idx = _notes.indexWhere((n) => n.id == id);
      if (idx >= 0) _notes[idx] = full;
      notifyListeners();
    }
  }

  void clearSelection() {
    _selectedNote = null;
    notifyListeners();
  }

  // ── Create ────────────────────────────────────────────────────────────────

  Future<Note?> createNote() async {
    final note = await _service.createNote();
    if (note != null) {
      _notes.insert(0, note);
      _selectedNote = note;
      notifyListeners();
    }
    return note;
  }

  // ── Update (with debounced save) ──────────────────────────────────────────

  void updateContent({String? title, String? icon, List<NoteBlock>? blocks}) {
    if (_selectedNote == null) return;
    _selectedNote = _selectedNote!.copyWith(
      title: title,
      icon: icon,
      blocks: blocks,
      updatedAt: DateTime.now(),
    );
    final idx = _notes.indexWhere((n) => n.id == _selectedNote!.id);
    if (idx >= 0) _notes[idx] = _selectedNote!;
    notifyListeners();

    _saveTimer?.cancel();
    _saveStatus = SaveStatus.saving;
    _saveTimer = Timer(const Duration(milliseconds: 1500), _persistNote);
  }

  Future<void> _persistNote() async {
    final note = _selectedNote;
    if (note == null) return;
    try {
      final updated = await _service.updateNote(
        note.id,
        title: note.title,
        icon: note.icon,
        blocks: note.blocks,
      );
      if (updated != null) {
        _selectedNote = updated;
        final idx = _notes.indexWhere((n) => n.id == updated.id);
        if (idx >= 0) _notes[idx] = updated;
      }
      _saveStatus = SaveStatus.saved;
    } catch (_) {
      _saveStatus = SaveStatus.error;
    }
    notifyListeners();
  }

  /// Force an immediate save (e.g. before navigating away).
  Future<void> saveNow() async {
    _saveTimer?.cancel();
    await _persistNote();
  }

  // ── Pin / Unpin ───────────────────────────────────────────────────────────

  Future<void> togglePin(String id) async {
    final idx = _notes.indexWhere((n) => n.id == id);
    if (idx < 0) return;
    final note = _notes[idx];
    final updated = await _service.updateNote(id, isPinned: !note.isPinned);
    if (updated != null) {
      _notes[idx] = updated;
      if (_selectedNote?.id == id) _selectedNote = updated;
      _notes.sort((a, b) {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt.compareTo(a.updatedAt);
      });
      notifyListeners();
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  Future<void> deleteNote(String id) async {
    await _service.deleteNote(id);
    _notes.removeWhere((n) => n.id == id);
    if (_selectedNote?.id == id) _selectedNote = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    super.dispose();
  }
}
