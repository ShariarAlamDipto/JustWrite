import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import '../../models/voice_entry.dart';
import '../../services/voice_service.dart';

// Theme colors
const Color _accentCyan = Color(0xFF00ffd5);
const Color _bgDark = Color(0xFF0a0a0a);
const Color _cardDark = Color(0xFF141414);
const Color _textMuted = Color(0xFF666666);

class VoiceEntriesScreen extends StatefulWidget {
  const VoiceEntriesScreen({super.key});

  @override
  State<VoiceEntriesScreen> createState() => _VoiceEntriesScreenState();
}

class _VoiceEntriesScreenState extends State<VoiceEntriesScreen>
    with SingleTickerProviderStateMixin {
  final VoiceService _voiceService = VoiceService();
  List<VoiceEntry> _entries = [];
  bool _isLoading = true;
  bool _isRecording = false;
  Duration _recordingDuration = Duration.zero;
  StreamSubscription<Duration>? _durationSub;
  StreamSubscription<PlaybackState>? _playbackSub;
  String? _currentPlayingId;
  
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _loadEntries();
    _setupListeners();
    
    // Pulse animation for recording indicator
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _pulseController.repeat(reverse: true);
  }

  void _setupListeners() {
    _durationSub = _voiceService.recordingDuration.listen((duration) {
      if (mounted) {
        setState(() => _recordingDuration = duration);
      }
    });

    _playbackSub = _voiceService.playbackState.listen((state) {
      if (mounted) {
        setState(() => _currentPlayingId = state.isPlaying ? state.entryId : null);
      }
    });
  }

  Future<void> _loadEntries() async {
    setState(() => _isLoading = true);
    final entries = await _voiceService.loadVoiceEntries();
    if (mounted) {
      setState(() {
        _entries = entries;
        _isLoading = false;
      });
    }
  }

  Future<void> _startRecording() async {
    debugPrint('[VoiceEntriesScreen] Starting recording...');
    final hasPermission = await _voiceService.hasPermission();
    debugPrint('[VoiceEntriesScreen] Has permission: $hasPermission');

    if (!hasPermission) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Microphone permission required'),
            backgroundColor: Colors.red[700],
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
      return;
    }

    final started = await _voiceService.startRecording();
    debugPrint('[VoiceEntriesScreen] Recording started: $started');

    if (started && mounted) {
      setState(() {
        _isRecording = true;
        _recordingDuration = Duration.zero;
      });
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Failed to start recording'),
          backgroundColor: Colors.red[700],
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  Future<void> _stopAndSaveRecording() async {
    final path = await _voiceService.stopRecording();
    if (path == null) {
      setState(() => _isRecording = false);
      return;
    }

    if (!mounted) return;

    // Auto-generate title with timestamp
    final now = DateTime.now();
    final title = 'Voice ${now.day}/${now.month} ${now.hour}:${now.minute.toString().padLeft(2, '0')}';

    setState(() => _isRecording = false);

    // Save the voice entry
    final entry = await _voiceService.saveVoiceEntry(
      title: title,
      filePath: path,
      duration: _recordingDuration.inSeconds,
    );

    if (entry != null && mounted) {
      setState(() {
        _entries.insert(0, entry);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Saved'),
          backgroundColor: _accentCyan.withOpacity(0.9),
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _cancelRecording() async {
    await _voiceService.cancelRecording();
    setState(() => _isRecording = false);
  }

  Future<void> _deleteEntry(VoiceEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: _cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete?', style: TextStyle(color: Colors.white)),
        content: Text(
          'Delete "${entry.title}"?',
          style: const TextStyle(color: _textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: TextStyle(color: Colors.grey[400])),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _voiceService.deleteVoiceEntry(entry);
      if (success && mounted) {
        setState(() {
          _entries.removeWhere((e) => e.id == entry.id);
        });
      }
    }
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _durationSub?.cancel();
    _playbackSub?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgDark,
      appBar: AppBar(
        backgroundColor: _bgDark,
        elevation: 0,
        title: const Text(
          'Voice',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w500,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          // Main content
          _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: _accentCyan),
                )
              : _entries.isEmpty
                  ? _buildEmptyState()
                  : _buildEntriesList(),

          // Recording overlay
          if (_isRecording) _buildRecordingOverlay(),

          // FAB area
          if (!_isRecording)
            Positioned(
              right: 24,
              bottom: 32,
              child: _buildRecordFAB(),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.mic_none_rounded,
            size: 72,
            color: Colors.grey[800],
          ),
          const SizedBox(height: 16),
          Text(
            'No voice entries',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the mic to start',
            style: TextStyle(
              color: Colors.grey[700],
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 100), // Space for FAB
        ],
      ),
    );
  }

  Widget _buildEntriesList() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      itemCount: _entries.length,
      itemBuilder: (context, index) {
        final entry = _entries[index];
        final isPlaying = _currentPlayingId == entry.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: _cardDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isPlaying ? _accentCyan.withOpacity(0.5) : Colors.transparent,
              width: 1,
            ),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: entry.audioUrl != null
                ? () => _voiceService.playAudio(entry.audioUrl!, entry.id)
                : null,
            onLongPress: () => _deleteEntry(entry),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Play button
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isPlaying ? _accentCyan : const Color(0xFF1a1a1a),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      color: isPlaying ? _bgDark : Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  // Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          entry.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              entry.formattedDuration,
                              style: const TextStyle(
                                color: _textMuted,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              entry.formattedDate,
                              style: const TextStyle(
                                color: _textMuted,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Delete
                  IconButton(
                    icon: Icon(Icons.close, color: Colors.grey[700], size: 20),
                    onPressed: () => _deleteEntry(entry),
                    splashRadius: 20,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildRecordFAB() {
    return GestureDetector(
      onTap: _startRecording,
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: _accentCyan,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: _accentCyan.withOpacity(0.4),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: const Icon(
          Icons.mic_rounded,
          size: 28,
          color: _bgDark,
        ),
      ),
    );
  }

  Widget _buildRecordingOverlay() {
    return Container(
      color: _bgDark.withOpacity(0.95),
      child: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),
            // Animated recording indicator
            AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _pulseAnimation.value,
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.red.withOpacity(0.15),
                    ),
                    child: Center(
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.red,
                        ),
                        child: const Icon(
                          Icons.mic_rounded,
                          size: 40,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 32),
            // Duration
            Text(
              _formatDuration(_recordingDuration),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 48,
                fontWeight: FontWeight.w300,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Recording...',
              style: TextStyle(
                color: _textMuted,
                fontSize: 14,
              ),
            ),
            const Spacer(),
            // Action buttons
            Padding(
              padding: const EdgeInsets.only(bottom: 60),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Cancel button
                  GestureDetector(
                    onTap: _cancelRecording,
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF1a1a1a),
                        border: Border.all(color: Colors.grey[800]!, width: 1),
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                  // Stop & Save button
                  GestureDetector(
                    onTap: _stopAndSaveRecording,
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _accentCyan,
                        boxShadow: [
                          BoxShadow(
                            color: _accentCyan.withOpacity(0.4),
                            blurRadius: 20,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.check_rounded,
                        color: _bgDark,
                        size: 36,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
