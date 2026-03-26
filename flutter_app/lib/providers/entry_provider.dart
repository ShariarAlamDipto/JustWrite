import 'package:flutter/foundation.dart';
import 'package:justwrite_mobile/models/entry.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';
import 'package:justwrite_mobile/services/compression_service.dart';
import 'package:justwrite_mobile/services/encryption_service.dart';
import 'package:uuid/uuid.dart';

// Top-level function required by compute() — runs in a background isolate.
// Decrypts and decompresses all entry content without blocking the UI thread.
List<Map<String, dynamic>> _decryptEntriesBatch(Map<String, dynamic> params) {
  final entries = (params['entries'] as List).cast<Map<String, dynamic>>();
  final userId = params['userId'] as String;
  final encryption = EncryptionService();
  final compression = CompressionService();

  return entries.map((json) {
    String content = (json['content'] as String?) ?? '';

    try {
      if (encryption.isEncrypted(content)) {
        content = encryption.decrypt(content, userId);
      }
      content = compression.decompress(content);
    } catch (_) {
      // Keep original content on failure — avoids data loss
    }

    return Map<String, dynamic>.from(json)..['content'] = content;
  }).toList();
}

class EntryProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  final _compressionService = CompressionService();
  final _encryptionService = EncryptionService();
  List<Entry> _entries = [];
  bool _isLoading = false;
  String? _error;
  DateTime? _lastFetch;
  bool _isCreating = false;
  
  // Cached filtered lists
  List<Entry>? _cachedJournal;
  List<Entry>? _cachedBrainstorm;
  
  // Cache duration: 60 seconds
  static const _cacheDuration = Duration(seconds: 60);

  List<Entry> get entries => _entries;
  
  /// Get only journal entries (source = 'text', not locked) - cached.
  /// Locked entries are private/biometric-protected (created via web locked journal)
  /// and must never appear in the main journal feed.
  List<Entry> get journalEntries {
    _cachedJournal ??= _entries
        .where((e) => e.source == EntrySource.text && !e.isLocked)
        .toList();
    return _cachedJournal!;
  }

  /// Get only brainstorm sessions (source = 'brainstorm') - cached
  List<Entry> get brainstormEntries {
    _cachedBrainstorm ??= _entries.where((e) => e.source == EntrySource.brainstorm).toList();
    return _cachedBrainstorm!;
  }
  
  void _invalidateFilterCache() {
    _cachedJournal = null;
    _cachedBrainstorm = null;
  }
  
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

    // Prevent duplicate loading
    if (_isLoading) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Fetch raw JSON (avoids double-parse) — limited to 50 most-recent entries
      final rawMaps = await _supabaseService.getRawEntries();
      if (rawMaps.isEmpty) {
        _entries = [];
        _lastFetch = DateTime.now();
        _invalidateFilterCache();
        return;
      }

      // userId is embedded in every row — grab from first entry
      final userId = rawMaps.first['user_id'] as String? ?? '';

      // Offload all PBKDF2+AES-GCM work to a background isolate.
      // This is critical: 600k PBKDF2 iterations per entry would freeze
      // the UI thread for seconds if run on the main isolate.
      final decryptedMaps = userId.isNotEmpty
          ? await compute(_decryptEntriesBatch, {'entries': rawMaps, 'userId': userId})
          : rawMaps;

      _entries = decryptedMaps.map((m) => Entry.fromJson(m)).toList();
      _invalidateFilterCache();
      _lastFetch = DateTime.now();
    } catch (e) {
      _error = e.toString();
    } finally {
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
    // Prevent concurrent creates that could cause crashes
    if (_isCreating) {
      throw Exception('Entry creation already in progress');
    }
    _isCreating = true;
    
    debugPrint('[EntryProvider] Creating entry...');
    
    try {
      // Only encrypt Journal entries (source = 'text'), not Ideas/Brainstorm
      // This allows Ideas to be viewed on any device without encryption key
      String processedContent;
      final isJournal = source == 'text' || source == EntrySource.text;
      
      if (isJournal) {
        // Journal entries: compress then encrypt for privacy
        processedContent = _compressionService.compress(content);
        processedContent = _encryptionService.encrypt(processedContent, userId);
      } else {
        // Ideas/Brainstorm: only compress for storage efficiency (no encryption)
        processedContent = _compressionService.compress(content);
      }
      
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
        createdAt: DateTime.now().toUtc(),
      );
      
      final created = await _supabaseService.createEntry(entry);
      debugPrint('[EntryProvider] Entry created: ${created.id}');
      
      // Store decrypted and decompressed version in local cache for display
      final displayEntry = created.copyWith(
        content: content, // Use original unencrypted content for display
      );
      _entries.insert(0, displayEntry);
      _invalidateFilterCache();
      notifyListeners();
      return displayEntry;
    } catch (e, stackTrace) {
      debugPrint('[EntryProvider] Error: $e');
      debugPrint('[EntryProvider] Stack: $stackTrace');
      _error = e.toString();
      notifyListeners();
      rethrow;
    } finally {
      _isCreating = false;
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
      // Only encrypt Journal entries (source = 'text'), not Ideas/Brainstorm
      final isJournal = entry.source == EntrySource.text || entry.source.toString() == 'text';
      String processedContent;
      
      if (isJournal) {
        // Journal entries: compress then encrypt for privacy
        processedContent = _compressionService.compress(entry.content);
        processedContent = _encryptionService.encrypt(processedContent, entry.userId);
      } else {
        // Ideas/Brainstorm: only compress (no encryption)
        processedContent = _compressionService.compress(entry.content);
      }
      
      final processedEntry = entry.copyWith(
        content: processedContent,
      );
      
      await _supabaseService.updateEntry(processedEntry);
      
      // Update local cache with decrypted version
      final index = _entries.indexWhere((e) => e.id == entry.id);
      if (index != -1) {
        _entries[index] = entry; // Keep decrypted in cache
        _invalidateFilterCache();
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
    _invalidateFilterCache();
    notifyListeners();
    
    try {
      await _supabaseService.deleteEntry(entryId);
    } catch (e) {
      // Rollback on failure
      _entries.insert(removedIndex, removedEntry);
      _invalidateFilterCache();
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
