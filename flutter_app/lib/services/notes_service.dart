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
      return (data as List)
          .map((row) => Note.fromJson(Map<String, dynamic>.from(row)))
          .toList();
    } catch (e) {
      debugPrint('[NotesService] listNotes error: $e');
      return [];
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
      final data = await _supabase.from('notes').insert({
        'user_id': userId,
        'title': title,
        'icon': icon,
        'blocks': [],
        'is_pinned': false,
        'is_locked': false,
        'created_at': now,
        'updated_at': now,
      }).select().single();
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

      final data = await _supabase
          .from('notes')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
      return Note.fromJson(Map<String, dynamic>.from(data));
    } catch (e) {
      debugPrint('[NotesService] updateNote error: $e');
      return null;
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
