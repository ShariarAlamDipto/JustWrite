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

  // ── Static helpers ────────────────────────────────────────────────────────

  /// Extract all `#tags` from a note's block content.
  static List<String> extractTags(Note note) {
    final tags = <String>{};
    for (final block in note.blocks) {
      final matches = RegExp(r'#(\w+)').allMatches(block.content);
      for (final m in matches) {
        tags.add(m.group(1)!.toLowerCase());
      }
    }
    return tags.toList()..sort();
  }

  /// Extract all `[[wikilinks]]` from a note's block content.
  static List<String> extractWikilinks(Note note) {
    final links = <String>{};
    for (final block in note.blocks) {
      final matches = RegExp(r'\[\[([^\]]+)\]\]').allMatches(block.content);
      for (final m in matches) {
        links.add(m.group(1)!.trim());
      }
    }
    return links.toList();
  }

  // ── Computed getters ──────────────────────────────────────────────────────

  /// All unique tags across all notes with their counts.
  Map<String, int> get tagCounts {
    final counts = <String, int>{};
    for (final note in _notes) {
      for (final tag in extractTags(note)) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return Map.fromEntries(
      counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value)),
    );
  }

  /// Notes that contain `[[current note title]]` as backlinks to [targetNote].
  List<Note> getBacklinks(Note targetNote) {
    final title = targetNote.title.toLowerCase().trim();
    if (title.isEmpty) return [];
    return _notes.where((n) {
      if (n.id == targetNote.id) return false;
      for (final block in n.blocks) {
        if (block.content.toLowerCase().contains('[[$title]]')) return true;
      }
      return false;
    }).toList();
  }

  /// Notes that the given note links to (outgoing links).
  List<Note> getOutgoingLinks(Note source) {
    final links = extractWikilinks(source);
    return links
        .map((title) {
          try {
            return _notes.firstWhere(
              (n) => n.title.toLowerCase() == title.toLowerCase(),
            );
          } catch (_) {
            return null;
          }
        })
        .whereType<Note>()
        .toList();
  }

  // ── Search + filter ───────────────────────────────────────────────────────

  /// Filter notes by query (title + block content) and optional tag.
  List<Note> filtered(String query, {String? tagFilter}) {
    var result = _notes.toList();

    // Apply tag filter first
    if (tagFilter != null && tagFilter.isNotEmpty) {
      result = result.where((n) => extractTags(n).contains(tagFilter)).toList();
    }

    if (query.isEmpty) return result;

    final q = query.toLowerCase();
    return result.where((n) {
      if (n.title.toLowerCase().contains(q)) return true;
      for (final block in n.blocks) {
        if (block.content.toLowerCase().contains(q)) return true;
      }
      return false;
    }).toList();
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
    // Optimistic: show cached note immediately (safe null-check)
    final cached = _notes.where((n) => n.id == id).firstOrNull;
    if (cached != null) {
      _selectedNote = cached;
      notifyListeners();
    }

    // Fetch full note with blocks from remote
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

  Future<Note?> createNote({String title = 'Untitled', String icon = '📝'}) async {
    final note = await _service.createNote(title: title, icon: icon);
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
