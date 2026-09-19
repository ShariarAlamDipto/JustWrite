import 'dart:async';
import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/note.dart';
import 'package:justwrite_mobile/services/notes_service.dart';
import 'package:justwrite_mobile/utils/content_patterns.dart';

enum SaveStatus { saved, saving, error }

class NoteProvider extends ChangeNotifier {
  final _service = NotesService();

  List<Note> _notes = [];
  Note? _selectedNote;
  bool _isLoading = false;
  SaveStatus _saveStatus = SaveStatus.saved;
  String? _error;
  Timer? _saveTimer;
  DateTime? _lastFetch;

  // Matches the 60s cache used by EntryProvider / TaskProvider so re-entering
  // the Notes screen doesn't re-hit the network on every navigation.
  static const _cacheDuration = Duration(seconds: 60);
  bool get _isCacheValid =>
      _lastFetch != null && DateTime.now().difference(_lastFetch!) < _cacheDuration;

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
      for (final m in ContentPatterns.tag.allMatches(block.content)) {
        tags.add(m.group(1)!.toLowerCase());
      }
    }
    return tags.toList()..sort();
  }

  /// Extract all `[[wikilinks]]` from a note's block content.
  static List<String> extractWikilinks(Note note) {
    final links = <String>{};
    for (final block in note.blocks) {
      for (final m in ContentPatterns.wikilink.allMatches(block.content)) {
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

  Future<void> loadNotes({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid && _notes.isNotEmpty) return;
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _notes = await _service.listNotes();
      _lastFetch = DateTime.now();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Select ────────────────────────────────────────────────────────────────

  Future<void> selectNote(String id) async {
    if (_selectedNote?.id == id) return;

    // Flush any pending debounced save for the note we're leaving BEFORE we
    // change the selection, otherwise the timer would later fire against the
    // newly selected note and the previous note's edits would be lost.
    if (_selectedNote != null && (_saveTimer?.isActive ?? false)) {
      await saveNow();
    }

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
    try {
      _error = null;
      final note = await _service.createNote(title: title, icon: icon);
      if (note == null) {
        _error = 'Failed to create note. Check your connection and auth session.';
        notifyListeners();
        return null;
      }

      _notes.insert(0, note);
      _selectedNote = note;
      notifyListeners();
      return note;
    } catch (e) {
      debugPrint('[NoteProvider] createNote error: $e');
      _error = 'Failed to create note. Please try again.';
      notifyListeners();
      return null;
    }
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

    // Capture the note snapshot so the timer persists THIS note even if the
    // selection changes before it fires.
    final noteToSave = _selectedNote!;
    _saveTimer?.cancel();
    _saveStatus = SaveStatus.saving;
    _saveTimer = Timer(
      const Duration(milliseconds: 1500),
      () => _persistNote(noteToSave),
    );
  }

  Future<void> _persistNote([Note? target]) async {
    final note = target ?? _selectedNote;
    if (note == null) return;
    try {
      final updated = await _service.updateNote(
        note.id,
        title: note.title,
        icon: note.icon,
        blocks: note.blocks,
      );
      if (updated != null) {
        // Only move the selection forward if we're still on the same note;
        // otherwise just refresh its entry in the list.
        if (_selectedNote?.id == updated.id) _selectedNote = updated;
        final idx = _notes.indexWhere((n) => n.id == updated.id);
        if (idx >= 0) _notes[idx] = updated;
        _error = null;
        _saveStatus = SaveStatus.saved;
      } else {
        _error = 'Failed to save note changes.';
        _saveStatus = SaveStatus.error;
      }
    } catch (_) {
      _error = 'Failed to save note changes.';
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
    _error = null;
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
    } else {
      _error = 'Failed to update note pin status.';
      notifyListeners();
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  Future<void> deleteNote(String id) async {
    _error = null;
    final ok = await _service.deleteNote(id);
    if (!ok) {
      _error = 'Failed to delete note.';
      notifyListeners();
      return;
    }

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
