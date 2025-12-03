import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:uuid/uuid.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../models/voice_entry.dart';

/// Service for recording, playing, and managing voice entries locally
class VoiceService {
  static final VoiceService _instance = VoiceService._internal();
  factory VoiceService() => _instance;
  VoiceService._internal();

  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  final AudioPlayer _player = AudioPlayer();
  final _uuid = const Uuid();
  bool _recorderInitialized = false;
  
  // Local database
  Database? _database;
  String? _voiceStorageDir;

  // Recording state
  bool _isRecording = false;
  String? _currentRecordingPath;
  DateTime? _recordingStartTime;

  // Playback state
  bool _isPlaying = false;
  String? _currentPlayingId;

  // Stream controllers for state updates
  final _recordingStateController = StreamController<bool>.broadcast();
  final _playbackStateController = StreamController<PlaybackState>.broadcast();
  final _recordingDurationController = StreamController<Duration>.broadcast();

  Timer? _durationTimer;

  // Getters
  bool get isRecording => _isRecording;
  bool get isPlaying => _isPlaying;
  String? get currentPlayingId => _currentPlayingId;
  Stream<bool> get recordingState => _recordingStateController.stream;
  Stream<PlaybackState> get playbackState => _playbackStateController.stream;
  Stream<Duration> get recordingDuration => _recordingDurationController.stream;

  /// Initialize the local database
  Future<Database> _getDatabase() async {
    if (_database != null) return _database!;

    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'voice_entries.db');

    _database = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE voice_entries (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            audio_path TEXT,
            audio_duration INTEGER,
            transcript TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            metadata TEXT
          )
        ''');
        debugPrint('[VoiceService] Database created');
      },
    );

    return _database!;
  }

  /// Get the voice storage directory
  Future<String> _getVoiceStorageDir() async {
    if (_voiceStorageDir != null) return _voiceStorageDir!;

    final appDir = await getApplicationDocumentsDirectory();
    final voiceDir = Directory(p.join(appDir.path, 'voice_recordings'));
    
    if (!await voiceDir.exists()) {
      await voiceDir.create(recursive: true);
    }
    
    _voiceStorageDir = voiceDir.path;
    return _voiceStorageDir!;
  }

  /// Initialize the recorder
  Future<void> _initRecorder() async {
    if (_recorderInitialized) return;
    await _recorder.openRecorder();
    _recorderInitialized = true;
    debugPrint('[VoiceService] Recorder initialized');
  }

  /// Request microphone permission
  Future<bool> _requestPermission() async {
    final status = await Permission.microphone.status;
    debugPrint('[VoiceService] Microphone permission status: $status');

    if (status.isGranted) {
      return true;
    }

    if (status.isDenied) {
      final result = await Permission.microphone.request();
      debugPrint('[VoiceService] Permission request result: $result');
      return result.isGranted;
    }

    if (status.isPermanentlyDenied) {
      debugPrint('[VoiceService] Permission permanently denied, opening settings');
      await openAppSettings();
      return false;
    }

    return false;
  }

  /// Check if recording permission is granted
  Future<bool> hasPermission() async {
    try {
      final hasPermission = await _requestPermission();
      if (!hasPermission) {
        debugPrint('[VoiceService] No microphone permission');
        return false;
      }
      await _initRecorder();
      return true;
    } catch (e) {
      debugPrint('[VoiceService] Error checking permission: $e');
      return false;
    }
  }

  /// Start recording audio
  Future<bool> startRecording() async {
    try {
      if (_isRecording) return false;

      // Check permission first
      final hasPermission = await _requestPermission();
      if (!hasPermission) {
        debugPrint('[VoiceService] Cannot start recording - no permission');
        return false;
      }

      await _initRecorder();

      // Get storage directory for recording
      final storageDir = await _getVoiceStorageDir();
      final fileName = 'voice_${DateTime.now().millisecondsSinceEpoch}.aac';
      _currentRecordingPath = p.join(storageDir, fileName);

      debugPrint('[VoiceService] Starting recording to: $_currentRecordingPath');

      // Start recording with optimal settings
      await _recorder.startRecorder(
        toFile: _currentRecordingPath!,
        codec: Codec.aacADTS,
        bitRate: 128000,
        sampleRate: 44100,
      );

      _isRecording = true;
      _recordingStartTime = DateTime.now();
      _recordingStateController.add(true);

      // Start duration timer
      _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (_recordingStartTime != null) {
          final duration = DateTime.now().difference(_recordingStartTime!);
          _recordingDurationController.add(duration);
        }
      });

      debugPrint('[VoiceService] Recording started successfully!');
      return true;
    } catch (e) {
      debugPrint('[VoiceService] Error starting recording: $e');
      return false;
    }
  }

  /// Stop recording and return the file path
  Future<String?> stopRecording() async {
    try {
      if (!_isRecording) return null;

      _durationTimer?.cancel();
      _durationTimer = null;

      final path = await _recorder.stopRecorder();
      _isRecording = false;
      _recordingStateController.add(false);

      debugPrint('[VoiceService] Recording stopped: $path');
      return path ?? _currentRecordingPath;
    } catch (e) {
      debugPrint('[VoiceService] Error stopping recording: $e');
      _isRecording = false;
      _recordingStateController.add(false);
      return null;
    }
  }

  /// Cancel recording without saving
  Future<void> cancelRecording() async {
    try {
      _durationTimer?.cancel();
      _durationTimer = null;

      if (_isRecording) {
        await _recorder.stopRecorder();
      }

      // Delete the file
      if (_currentRecordingPath != null) {
        final file = File(_currentRecordingPath!);
        if (await file.exists()) {
          await file.delete();
          debugPrint('[VoiceService] Deleted cancelled recording');
        }
      }

      _isRecording = false;
      _currentRecordingPath = null;
      _recordingStartTime = null;
      _recordingStateController.add(false);
    } catch (e) {
      debugPrint('[VoiceService] Error canceling recording: $e');
    }
  }

  /// Get recording duration
  Duration? getRecordingDuration() {
    if (_recordingStartTime == null) return null;
    return DateTime.now().difference(_recordingStartTime!);
  }

  /// Save voice entry locally
  Future<VoiceEntry?> saveVoiceEntry({
    required String title,
    required String filePath,
    int? duration,
  }) async {
    try {
      final file = File(filePath);
      if (!await file.exists()) {
        debugPrint('[VoiceService] File not found: $filePath');
        return null;
      }

      final db = await _getDatabase();
      final id = _uuid.v4();
      final now = DateTime.now();
      
      // Get file size for metadata
      final fileSize = await file.length();

      final entryMap = {
        'id': id,
        'user_id': 'local_user', // Local storage doesn't need real user
        'title': title,
        'audio_path': filePath,
        'audio_duration': duration,
        'transcript': null,
        'created_at': now.toIso8601String(),
        'updated_at': null,
        'metadata': '{"file_size": $fileSize, "format": "aac"}',
      };

      await db.insert('voice_entries', entryMap);
      debugPrint('[VoiceService] Voice entry saved locally: $id');

      // Convert to VoiceEntry model
      return VoiceEntry(
        id: id,
        userId: 'local_user',
        title: title,
        audioUrl: filePath, // Use local path as URL
        audioDuration: duration,
        transcript: null,
        createdAt: now,
        updatedAt: null,
        metadata: {'file_size': fileSize, 'format': 'aac'},
      );
    } catch (e) {
      debugPrint('[VoiceService] Error saving voice entry: $e');
      return null;
    }
  }

  /// Load all voice entries from local storage
  Future<List<VoiceEntry>> loadVoiceEntries() async {
    try {
      final db = await _getDatabase();
      final results = await db.query(
        'voice_entries',
        orderBy: 'created_at DESC',
      );

      debugPrint('[VoiceService] Loaded ${results.length} voice entries');

      return results.map((row) {
        return VoiceEntry(
          id: row['id'] as String,
          userId: row['user_id'] as String,
          title: row['title'] as String,
          audioUrl: row['audio_path'] as String?, // Local path
          audioDuration: row['audio_duration'] as int?,
          transcript: row['transcript'] as String?,
          createdAt: DateTime.parse(row['created_at'] as String),
          updatedAt: row['updated_at'] != null
              ? DateTime.parse(row['updated_at'] as String)
              : null,
          metadata: row['metadata'] != null
              ? Map<String, dynamic>.from(
                  _parseMetadata(row['metadata'] as String))
              : null,
        );
      }).toList();
    } catch (e) {
      debugPrint('[VoiceService] Error loading voice entries: $e');
      return [];
    }
  }

  /// Parse metadata JSON string
  Map<String, dynamic> _parseMetadata(String json) {
    try {
      // Simple JSON parsing for metadata
      final cleaned = json.replaceAll('{', '').replaceAll('}', '');
      final pairs = cleaned.split(',');
      final result = <String, dynamic>{};
      for (final pair in pairs) {
        final parts = pair.split(':');
        if (parts.length == 2) {
          final key = parts[0].trim().replaceAll('"', '');
          final value = parts[1].trim().replaceAll('"', '');
          // Try to parse as int
          final intValue = int.tryParse(value);
          result[key] = intValue ?? value;
        }
      }
      return result;
    } catch (e) {
      return {};
    }
  }

  /// Delete a voice entry
  Future<bool> deleteVoiceEntry(VoiceEntry entry) async {
    try {
      // Delete the audio file
      if (entry.audioUrl != null) {
        final file = File(entry.audioUrl!);
        if (await file.exists()) {
          await file.delete();
          debugPrint('[VoiceService] Deleted audio file: ${entry.audioUrl}');
        }
      }

      // Delete from database
      final db = await _getDatabase();
      await db.delete(
        'voice_entries',
        where: 'id = ?',
        whereArgs: [entry.id],
      );

      debugPrint('[VoiceService] Deleted voice entry: ${entry.id}');
      return true;
    } catch (e) {
      debugPrint('[VoiceService] Error deleting voice entry: $e');
      return false;
    }
  }

  /// Play audio from local file
  Future<void> playAudio(String path, String entryId) async {
    try {
      if (_isPlaying && _currentPlayingId == entryId) {
        // Pause if same audio is playing
        await _player.pause();
        _isPlaying = false;
        _playbackStateController.add(PlaybackState(isPlaying: false, entryId: entryId));
        return;
      }

      // Stop any current playback
      await _player.stop();

      // Check if file exists
      final file = File(path);
      if (!await file.exists()) {
        debugPrint('[VoiceService] Audio file not found: $path');
        return;
      }

      // Play from local file
      await _player.play(DeviceFileSource(path));
      _isPlaying = true;
      _currentPlayingId = entryId;
      _playbackStateController.add(PlaybackState(isPlaying: true, entryId: entryId));

      // Listen for completion
      _player.onPlayerComplete.listen((_) {
        _isPlaying = false;
        _currentPlayingId = null;
        _playbackStateController.add(PlaybackState(isPlaying: false, entryId: null));
      });
      
      debugPrint('[VoiceService] Playing audio: $path');
    } catch (e) {
      debugPrint('[VoiceService] Error playing audio: $e');
    }
  }

  /// Stop playback
  Future<void> stopPlayback() async {
    await _player.stop();
    _isPlaying = false;
    _currentPlayingId = null;
    _playbackStateController.add(PlaybackState(isPlaying: false, entryId: null));
  }

  /// Update voice entry title
  Future<VoiceEntry?> updateVoiceEntry(String id, {String? title, String? transcript}) async {
    try {
      final db = await _getDatabase();
      final updates = <String, dynamic>{
        'updated_at': DateTime.now().toIso8601String(),
      };
      if (title != null) updates['title'] = title;
      if (transcript != null) updates['transcript'] = transcript;

      await db.update(
        'voice_entries',
        updates,
        where: 'id = ?',
        whereArgs: [id],
      );

      // Reload the entry
      final results = await db.query(
        'voice_entries',
        where: 'id = ?',
        whereArgs: [id],
      );

      if (results.isEmpty) return null;

      final row = results.first;
      return VoiceEntry(
        id: row['id'] as String,
        userId: row['user_id'] as String,
        title: row['title'] as String,
        audioUrl: row['audio_path'] as String?,
        audioDuration: row['audio_duration'] as int?,
        transcript: row['transcript'] as String?,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: row['updated_at'] != null
            ? DateTime.parse(row['updated_at'] as String)
            : null,
        metadata: null,
      );
    } catch (e) {
      debugPrint('[VoiceService] Error updating voice entry: $e');
      return null;
    }
  }

  /// Dispose resources
  void dispose() {
    _durationTimer?.cancel();
    _recorder.closeRecorder();
    _player.dispose();
    _recordingStateController.close();
    _playbackStateController.close();
    _recordingDurationController.close();
    _database?.close();
  }
}

/// Playback state model
class PlaybackState {
  final bool isPlaying;
  final String? entryId;

  PlaybackState({required this.isPlaying, this.entryId});
}
