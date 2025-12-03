import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../models/voice_entry.dart';

/// Service for recording, playing, and managing voice entries
class VoiceService {
  static final VoiceService _instance = VoiceService._internal();
  factory VoiceService() => _instance;
  VoiceService._internal();

  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  final AudioPlayer _player = AudioPlayer();
  final _uuid = const Uuid();
  bool _recorderInitialized = false;
  
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

  SupabaseClient get _supabase => Supabase.instance.client;

  /// Initialize the recorder
  Future<void> _initRecorder() async {
    if (_recorderInitialized) return;
    await _recorder.openRecorder();
    _recorderInitialized = true;
  }

  /// Check if recording permission is granted
  Future<bool> hasPermission() async {
    try {
      await _initRecorder();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Start recording audio
  Future<bool> startRecording() async {
    try {
      if (_isRecording) return false;
      
      await _initRecorder();

      // Get temp directory for recording
      final directory = await getTemporaryDirectory();
      final fileName = 'voice_${DateTime.now().millisecondsSinceEpoch}.aac';
      _currentRecordingPath = '${directory.path}/$fileName';

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

      debugPrint('[VoiceService] Recording started: $_currentRecordingPath');
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
      
      // Delete the temp file
      if (_currentRecordingPath != null) {
        final file = File(_currentRecordingPath!);
        if (await file.exists()) {
          await file.delete();
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

  /// Upload audio file to Supabase Storage and create voice entry
  Future<VoiceEntry?> saveVoiceEntry({
    required String title,
    required String filePath,
    int? duration,
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        debugPrint('[VoiceService] No user logged in');
        return null;
      }

      final file = File(filePath);
      if (!await file.exists()) {
        debugPrint('[VoiceService] File not found: $filePath');
        return null;
      }

      // Generate unique file name
      final fileExt = filePath.split('.').last;
      final fileName = '${user.id}/${_uuid.v4()}.$fileExt';
      
      // Upload to Supabase Storage
      final fileBytes = await file.readAsBytes();
      final uploadPath = await _supabase.storage
          .from('voice-recordings')
          .uploadBinary(fileName, fileBytes, fileOptions: const FileOptions(
            contentType: 'audio/aac',
          ));
      
      debugPrint('[VoiceService] Uploaded to: $uploadPath');
      
      // Get public URL (or signed URL for private bucket)
      final audioUrl = _supabase.storage
          .from('voice-recordings')
          .getPublicUrl(fileName);

      // Create voice entry in database
      final entryData = {
        'user_id': user.id,
        'title': title,
        'audio_url': audioUrl,
        'audio_duration': duration,
        'metadata': {
          'file_name': fileName,
          'file_size': fileBytes.length,
          'format': fileExt,
        },
      };

      final response = await _supabase
          .from('voice_entries')
          .insert(entryData)
          .select()
          .single();

      // Clean up temp file
      await file.delete();

      return VoiceEntry.fromJson(response);
    } catch (e) {
      debugPrint('[VoiceService] Error saving voice entry: $e');
      return null;
    }
  }

  /// Load all voice entries for current user
  Future<List<VoiceEntry>> loadVoiceEntries() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return [];

      final response = await _supabase
          .from('voice_entries')
          .select()
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => VoiceEntry.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('[VoiceService] Error loading voice entries: $e');
      return [];
    }
  }

  /// Delete a voice entry
  Future<bool> deleteVoiceEntry(VoiceEntry entry) async {
    try {
      // Delete from storage first
      if (entry.metadata?['file_name'] != null) {
        await _supabase.storage
            .from('voice-recordings')
            .remove([entry.metadata!['file_name']]);
      }

      // Delete from database
      await _supabase
          .from('voice_entries')
          .delete()
          .eq('id', entry.id);

      return true;
    } catch (e) {
      debugPrint('[VoiceService] Error deleting voice entry: $e');
      return false;
    }
  }

  /// Play audio from URL
  Future<void> playAudio(String url, String entryId) async {
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
      
      // Play new audio
      await _player.play(UrlSource(url));
      _isPlaying = true;
      _currentPlayingId = entryId;
      _playbackStateController.add(PlaybackState(isPlaying: true, entryId: entryId));

      // Listen for completion
      _player.onPlayerComplete.listen((_) {
        _isPlaying = false;
        _currentPlayingId = null;
        _playbackStateController.add(PlaybackState(isPlaying: false, entryId: null));
      });
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
      final updates = <String, dynamic>{};
      if (title != null) updates['title'] = title;
      if (transcript != null) updates['transcript'] = transcript;
      
      if (updates.isEmpty) return null;

      final response = await _supabase
          .from('voice_entries')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

      return VoiceEntry.fromJson(response);
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
  }
}

/// Playback state model
class PlaybackState {
  final bool isPlaying;
  final String? entryId;
  
  PlaybackState({required this.isPlaying, this.entryId});
}
