import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/entry.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';
import 'package:justwrite_mobile/services/compression_service.dart';
import 'package:justwrite_mobile/services/encryption_service.dart';
import 'package:uuid/uuid.dart';

class EntryProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  final _compressionService = CompressionService();
  final _encryptionService = EncryptionService();
  List<Entry> _entries = [];
  bool _isLoading = false;
  String? _error;
  DateTime? _lastFetch;
  
  // Cache duration: 30 seconds
  static const _cacheDuration = Duration(seconds: 30);

  List<Entry> get entries => _entries;
  
  /// Get only journal entries (source = 'text')
  List<Entry> get journalEntries => 
      _entries.where((e) => e.source == EntrySource.text).toList();
  
  /// Get only brainstorm sessions (source = 'brainstorm')
  List<Entry> get brainstormEntries => 
      _entries.where((e) => e.source == EntrySource.brainstorm).toList();
  
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
      final rawEntries = await _supabaseService.getEntries();
      // Decrypt and decompress content when loading
      _entries = rawEntries.map((e) {
        // First decrypt (if encrypted), then decompress (if compressed)
        String content = e.content;
        content = _encryptionService.decrypt(content, e.userId);
        content = _compressionService.decompress(content);
        return e.copyWith(content: content);
      }).toList();
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
    String? summary,
    int mood = 5,
    int moodIntensity = 5,
    List<String> gratitude = const [],
    Map<String, String> promptAnswers = const {},
    Map<String, dynamic>? aiMetadata,
    String source = 'text',
  }) async {
    debugPrint('[EntryProvider] ===== CREATE ENTRY =====');
    debugPrint('[EntryProvider] userId: $userId');
    debugPrint('[EntryProvider] content length: ${content.length}');
    debugPrint('[EntryProvider] title: $title');
    debugPrint('[EntryProvider] summary: $summary');
    debugPrint('[EntryProvider] mood: $mood, intensity: $moodIntensity');
    debugPrint('[EntryProvider] gratitude: $gratitude');
    debugPrint('[EntryProvider] promptAnswers: $promptAnswers');
    debugPrint('[EntryProvider] aiMetadata: $aiMetadata');
    debugPrint('[EntryProvider] source: $source');
    
    try {
      // First compress, then encrypt content for secure storage
      String processedContent = _compressionService.compress(content);
      processedContent = _encryptionService.encrypt(processedContent, userId);
      debugPrint('[EntryProvider] Processed content length: ${processedContent.length}');
      
      final entry = Entry(
        id: const Uuid().v4(),
        userId: userId,
        content: processedContent,
        title: title,
        summary: summary,
        mood: mood,
        moodIntensity: moodIntensity,
        gratitude: gratitude,
        promptAnswers: promptAnswers,
        aiMetadata: aiMetadata,
        source: source,
        createdAt: DateTime.now(),
      );

      debugPrint('[EntryProvider] Entry JSON to save: ${entry.toJson()}');
      
      final created = await _supabaseService.createEntry(entry);
      debugPrint('[EntryProvider] Entry created successfully with id: ${created.id}');
      
      // Store decrypted and decompressed version in local cache for display
      final displayEntry = created.copyWith(
        content: content, // Use original unencrypted content for display
      );
      _entries.insert(0, displayEntry);
      notifyListeners();
      debugPrint('[EntryProvider] ===== ENTRY SAVED =====');
      return displayEntry;
    } catch (e, stackTrace) {
      debugPrint('[EntryProvider] ERROR saving entry: $e');
      debugPrint('[EntryProvider] Stack: $stackTrace');
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }
  
  /// Create a brainstorm session entry with extracted tasks info
  Future<Entry> createBrainstormEntry({
    required String userId,
    required String content,
    required String summary,
    required List<Map<String, dynamic>> extractedTasks,
  }) async {
    // Store extracted tasks and summary in ai_metadata
    final aiMetadata = {
      'extracted_tasks': extractedTasks,
      'task_count': extractedTasks.length,
      'processed_at': DateTime.now().toIso8601String(),
    };
    
    return createEntry(
      userId: userId,
      content: content,
      title: 'Brainstorm Session',
      summary: summary,
      source: EntrySource.brainstorm,
      aiMetadata: aiMetadata,
      mood: 5, // Neutral mood for brainstorm
      moodIntensity: 5,
    );
  }

  Future<void> updateEntry(Entry entry) async {
    try {
      // Compress and encrypt content before updating
      String processedContent = _compressionService.compress(entry.content);
      processedContent = _encryptionService.encrypt(processedContent, entry.userId);
      
      final encryptedEntry = entry.copyWith(
        content: processedContent,
      );
      
      await _supabaseService.updateEntry(encryptedEntry);
      
      // Update local cache with decrypted version
      final index = _entries.indexWhere((e) => e.id == entry.id);
      if (index != -1) {
        _entries[index] = entry; // Keep decrypted in cache
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
