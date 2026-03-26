import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:justwrite_mobile/models/note.dart';

/// CRUD service for the [notes] Supabase table.
class NotesService {
  static final NotesService _instance = NotesService._internal();
  factory NotesService() => _instance;
  NotesService._internal();

  final _supabase = Supabase.instance.client;
  String? get _userId => _supabase.auth.currentUser?.id;

  bool _isMissingColumnError(Object error) {
    if (error is! PostgrestException) return false;
    final message = error.message.toLowerCase();
    return message.contains('column') && message.contains('does not exist');
  }

  String? _extractMissingColumn(Object error) {
    if (error is! PostgrestException) return null;
    final regex = RegExp(r'column\s+"([^"]+)"', caseSensitive: false);
    final match = regex.firstMatch(error.message);
    return match?.group(1);
  }

  bool _isRemovableInsertColumn(String column) {
    return {
      'icon',
      'cover_url',
      'blocks',
      'parent_id',
      'is_pinned',
      'is_locked',
      'created_at',
      'updated_at',
    }.contains(column);
  }

  bool _isRemovableUpdateColumn(String column) {
    return {
      'icon',
      'cover_url',
      'blocks',
      'parent_id',
      'is_pinned',
      'is_locked',
      'updated_at',
    }.contains(column);
  }

  List<Note> _safeParseNotes(List<dynamic> rows) {
    return rows
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .where((row) => row['id'] is String && row['user_id'] is String)
        .map(Note.fromJson)
        .toList();
  }

  Future<Map<String, dynamic>?> _insertWithColumnFallback(Map<String, dynamic> payload) async {
    final mutablePayload = Map<String, dynamic>.from(payload);
    var attemptedPortableFallback = false;
    var sawSchemaMismatch = false;
    var attempts = 0;
    final maxAttempts = payload.length + 4;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        final data = await _supabase
            .from('notes')
            .insert(mutablePayload)
            .select()
            .single();
        return Map<String, dynamic>.from(data);
      } catch (e) {
        final missingColumn = _extractMissingColumn(e);
        if (_isMissingColumnError(e) &&
            missingColumn != null &&
            mutablePayload.containsKey(missingColumn) &&
            _isRemovableInsertColumn(missingColumn)) {
          sawSchemaMismatch = true;
          mutablePayload.remove(missingColumn);
          continue;
        }

        // Try one portable fallback payload before failing, but only for schema-mismatch errors.
        if ((sawSchemaMismatch || _isMissingColumnError(e)) && !attemptedPortableFallback) {
          attemptedPortableFallback = true;
          mutablePayload
            ..clear()
            ..addAll({
              'user_id': payload['user_id'],
              'title': payload['title'] ?? 'Untitled',
            });
          continue;
        }

        rethrow;
      }
    }

    return null;
  }

  Future<Map<String, dynamic>?> _updateWithColumnFallback(
    String id,
    String userId,
    Map<String, dynamic> updates,
  ) async {
    final mutableUpdates = Map<String, dynamic>.from(updates);

    for (var i = 0; i < 6; i++) {
      try {
        final data = await _supabase
            .from('notes')
            .update(mutableUpdates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        return Map<String, dynamic>.from(data);
      } catch (e) {
        final missingColumn = _extractMissingColumn(e);
        if (_isMissingColumnError(e) &&
            missingColumn != null &&
            mutableUpdates.containsKey(missingColumn) &&
            _isRemovableUpdateColumn(missingColumn)) {
          mutableUpdates.remove(missingColumn);
          continue;
        }
        rethrow;
      }
    }

    return null;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  Future<List<Note>> listNotes() async {
    final userId = _userId;
    if (userId == null) return [];
    try {
      final data = await _supabase
          .from('notes')
          .select()
          .eq('user_id', userId)
          .is_('parent_id', null)
          .order('is_pinned', ascending: false)
          .order('updated_at', ascending: false);
      return _safeParseNotes(data as List);
    } catch (e) {
      // Compatibility fallback for older schemas lacking sort/filter columns.
      try {
        PostgrestFilterBuilder<dynamic>? fallbackQuery = _supabase
            .from('notes')
            .select()
            .eq('user_id', userId);

        // parent_id can be absent on legacy schemas; only use filter when available.
        final missingColumn = _extractMissingColumn(e);
        if (missingColumn != 'parent_id') {
          fallbackQuery = fallbackQuery.is_('parent_id', null);
        }

        final fallbackData = await fallbackQuery.order('updated_at', ascending: false);
        return _safeParseNotes(fallbackData as List);
      } catch (inner) {
        // Last fallback: user-scoped select without ordering or parent filter assumptions.
        try {
          final minimalData = await _supabase
              .from('notes')
              .select()
              .eq('user_id', userId);
          return _safeParseNotes(minimalData as List);
        } catch (last) {
          debugPrint('[NotesService] listNotes error: $e');
          debugPrint('[NotesService] listNotes fallback error: $inner');
          debugPrint('[NotesService] listNotes minimal fallback error: $last');
          return [];
        }
      }
    }
  }

  // ── Get ───────────────────────────────────────────────────────────────────

  Future<Note?> getNoteById(String id) async {
    final userId = _userId;
    if (userId == null) return null;
    try {
      final data = await _supabase
          .from('notes')
          .select()
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();
      if (data == null) return null;
      return Note.fromJson(Map<String, dynamic>.from(data));
    } catch (e) {
      debugPrint('[NotesService] getNoteById error: $e');
      return null;
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────

  Future<Note?> createNote({String title = 'Untitled', String icon = '📝'}) async {
    final userId = _userId;
    if (userId == null) return null;
    try {
      final now = DateTime.now().toIso8601String();
      final data = await _insertWithColumnFallback({
        'user_id': userId,
        'title': title,
        'icon': icon,
        'blocks': [],
        'is_pinned': false,
        'is_locked': false,
        'created_at': now,
        'updated_at': now,
      });
      if (data == null) return null;
      return Note.fromJson(Map<String, dynamic>.from(data));
    } catch (e) {
      debugPrint('[NotesService] createNote error: $e');
      return null;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────

  Future<Note?> updateNote(
    String id, {
    String? title,
    String? icon,
    List<NoteBlock>? blocks,
    bool? isPinned,
    bool? isLocked,
  }) async {
    final userId = _userId;
    if (userId == null) return null;
    try {
      final updates = <String, dynamic>{
        'updated_at': DateTime.now().toIso8601String(),
      };
      if (title != null) updates['title'] = title;
      if (icon != null) updates['icon'] = icon;
      if (blocks != null) updates['blocks'] = blocks.map((b) => b.toJson()).toList();
      if (isPinned != null) updates['is_pinned'] = isPinned;
      if (isLocked != null) updates['is_locked'] = isLocked;

      final data = await _updateWithColumnFallback(id, userId, updates);
      if (data == null) return null;

      // Keep backlinks table in sync whenever block content changes
      if (blocks != null) {
        saveWikilinks(id, blocks).catchError((_) {});
      }

      return Note.fromJson(Map<String, dynamic>.from(data));
    } catch (e) {
      debugPrint('[NotesService] updateNote error: $e');
      return null;
    }
  }

  // ── Wikilinks ─────────────────────────────────────────────────────────────

  /// Extract [[wikilink]] titles from a list of note blocks.
  List<String> _extractWikilinks(List<NoteBlock> blocks) {
    final links = <String>{};
    final pattern = RegExp(r'\[\[([^\]]+)\]\]');
    for (final block in blocks) {
      for (final m in pattern.allMatches(block.content)) {
        final title = m.group(1)?.trim();
        if (title != null && title.isNotEmpty) links.add(title);
      }
    }
    return links.toList();
  }

  /// Save [[wikilink]] edges to the content_links table (mirrors web API logic).
  /// Called after every note update that touches block content.
  Future<void> saveWikilinks(String fromNoteId, List<NoteBlock> blocks) async {
    final userId = _userId;
    if (userId == null) return;

    final targetTitles = _extractWikilinks(blocks);

    // Always delete stale wikilinks from this note first
    try {
      await _supabase
          .from('content_links')
          .delete()
          .eq('from_id', fromNoteId)
          .eq('link_type', 'wikilink');
    } catch (_) {
      // content_links table may not exist yet; skip silently
      return;
    }

    if (targetTitles.isEmpty) return;

    try {
      // Resolve target note IDs by title
      final targets = await _supabase
          .from('notes')
          .select('id, title')
          .eq('user_id', userId)
          .in_('title', targetTitles) as List;

      if (targets.isEmpty) return;

      final rows = targets.map((t) {
        final row = Map<String, dynamic>.from(t as Map);
        return {
          'user_id': userId,
          'from_type': 'note',
          'from_id': fromNoteId,
          'to_type': 'note',
          'to_id': row['id'] as String,
          'link_type': 'wikilink',
          'weight': 1.0,
        };
      }).toList();

      await _supabase.from('content_links').insert(rows);
    } catch (e) {
      debugPrint('[NotesService] saveWikilinks error: $e');
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  Future<bool> deleteNote(String id) async {
    final userId = _userId;
    if (userId == null) return false;
    try {
      await _supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
      return true;
    } catch (e) {
      debugPrint('[NotesService] deleteNote error: $e');
      return false;
    }
  }
}
