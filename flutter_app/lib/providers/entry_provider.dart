import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/entry.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';
import 'package:uuid/uuid.dart';

class EntryProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  List<Entry> _entries = [];
  bool _isLoading = false;
  String? _error;
  DateTime? _lastFetch;
  
  // Cache duration: 30 seconds
  static const _cacheDuration = Duration(seconds: 30);

  List<Entry> get entries => _entries;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Check if cache is valid
  bool get _isCacheValid => 
    _lastFetch != null && 
    DateTime.now().difference(_lastFetch!) < _cacheDuration;

  Future<void> loadEntries({bool forceRefresh = false}) async {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && _isCacheValid && _entries.isNotEmpty) {
      return;
    }
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _entries = await _supabaseService.getEntries();
      _lastFetch = DateTime.now();
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
      // Optimistic update: add to local cache immediately
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
    // Optimistic delete: remove from local cache first
    final removedEntry = _entries.firstWhere((e) => e.id == entryId);
    final removedIndex = _entries.indexWhere((e) => e.id == entryId);
    _entries.removeWhere((e) => e.id == entryId);
    notifyListeners();
    
    try {
      await _supabaseService.deleteEntry(entryId);
    } catch (e) {
      // Rollback on failure
      _entries.insert(removedIndex, removedEntry);
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
  
  // Invalidate cache to force refresh on next load
  void invalidateCache() {
    _lastFetch = null;
  }
}
