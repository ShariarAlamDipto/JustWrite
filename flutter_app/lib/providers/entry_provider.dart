import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/entry.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';
import 'package:uuid/uuid.dart';

class EntryProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  List<Entry> _entries = [];
  bool _isLoading = false;
  String? _error;

  List<Entry> get entries => _entries;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadEntries() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _entries = await _supabaseService.getEntries();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Entry> createEntry({
    required String userId,
    required String content,
    String? title,
    int mood = 5,
    int moodIntensity = 5,
    List<String> gratitude = const [],
    Map<String, String> promptAnswers = const {},
  }) async {
    try {
      final entry = Entry(
        id: const Uuid().v4(),
        userId: userId,
        content: content,
        title: title,
        mood: mood,
        moodIntensity: moodIntensity,
        gratitude: gratitude,
        promptAnswers: promptAnswers,
        createdAt: DateTime.now(),
      );

      final created = await _supabaseService.createEntry(entry);
      _entries.insert(0, created);
      notifyListeners();
      return created;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> updateEntry(Entry entry) async {
    try {
      await _supabaseService.updateEntry(entry);
      final index = _entries.indexWhere((e) => e.id == entry.id);
      if (index != -1) {
        _entries[index] = entry;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> deleteEntry(String entryId) async {
    try {
      await _supabaseService.deleteEntry(entryId);
      _entries.removeWhere((e) => e.id == entryId);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
