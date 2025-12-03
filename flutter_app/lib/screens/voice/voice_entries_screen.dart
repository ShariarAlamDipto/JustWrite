import 'package:flutter/material.dart';
import 'dart:async';
import '../../models/voice_entry.dart';
import '../../services/voice_service.dart';

// Accent color for voice recording
const Color _accentCyan = Color(0xFF00ffd5);

class VoiceEntriesScreen extends StatefulWidget {
  const VoiceEntriesScreen({super.key});

  @override
  State<VoiceEntriesScreen> createState() => _VoiceEntriesScreenState();
}

class _VoiceEntriesScreenState extends State<VoiceEntriesScreen> {
  final VoiceService _voiceService = VoiceService();
  List<VoiceEntry> _entries = [];
  bool _isLoading = true;
  bool _isRecording = false;
  Duration _recordingDuration = Duration.zero;
  StreamSubscription<Duration>? _durationSub;
  StreamSubscription<PlaybackState>? _playbackSub;
  String? _currentPlayingId;

  @override
  void initState() {
    super.initState();
    _loadEntries();
    _setupListeners();
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
    final hasPermission = await _voiceService.hasPermission();
    if (!hasPermission) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission required')),
        );
      }
      return;
    }

    final started = await _voiceService.startRecording();
    if (started && mounted) {
      setState(() {
        _isRecording = true;
        _recordingDuration = Duration.zero;
      });
    }
  }

  Future<void> _stopRecording() async {
    final path = await _voiceService.stopRecording();
    if (path == null) {
      setState(() => _isRecording = false);
      return;
    }

    if (!mounted) return;

    // Show dialog to name the recording
    final title = await _showTitleDialog();
    if (title == null || title.isEmpty) {
      await _voiceService.cancelRecording();
      setState(() => _isRecording = false);
      return;
    }

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
        const SnackBar(content: Text('Voice entry saved!')),
      );
    }
  }

  Future<String?> _showTitleDialog() async {
    final controller = TextEditingController(
      text: 'Voice Note ${DateTime.now().day}/${DateTime.now().month}',
    );
    
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Name your recording'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter a title...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, null),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteEntry(VoiceEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete voice entry?'),
        content: Text('Are you sure you want to delete "${entry.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Voice entry deleted')),
        );
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice Entries'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadEntries,
          ),
        ],
      ),
      body: Column(
        children: [
          // Recording control
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[900] : Colors.grey[100],
              border: Border(
                bottom: BorderSide(
                  color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                ),
              ),
            ),
            child: Column(
              children: [
                // Recording indicator
                if (_isRecording) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Recording... ${_formatDuration(_recordingDuration)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
                
                // Record button
                GestureDetector(
                  onTap: _isRecording ? _stopRecording : _startRecording,
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: _isRecording ? Colors.red : _accentCyan,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (_isRecording ? Colors.red : _accentCyan)
                              .withOpacity(0.4),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Icon(
                      _isRecording ? Icons.stop : Icons.mic,
                      size: 40,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _isRecording ? 'Tap to stop' : 'Tap to record',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          
          // Entries list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _entries.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.mic_none,
                              size: 64,
                              color: isDark ? Colors.grey[700] : Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No voice entries yet',
                              style: TextStyle(
                                fontSize: 18,
                                color: isDark ? Colors.grey[500] : Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Tap the microphone to start recording',
                              style: TextStyle(
                                color: isDark ? Colors.grey[600] : Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _entries.length,
                        itemBuilder: (context, index) {
                          final entry = _entries[index];
                          final isPlaying = _currentPlayingId == entry.id;
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: GestureDetector(
                                onTap: entry.audioUrl != null
                                    ? () => _voiceService.playAudio(
                                        entry.audioUrl!,
                                        entry.id,
                                      )
                                    : null,
                                child: Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: isPlaying
                                        ? _accentCyan
                                        : (isDark ? Colors.grey[800] : Colors.grey[200]),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    isPlaying ? Icons.pause : Icons.play_arrow,
                                    color: isPlaying
                                        ? Colors.white
                                        : (isDark ? Colors.white : Colors.black),
                                  ),
                                ),
                              ),
                              title: Text(
                                entry.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.access_time,
                                        size: 14,
                                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        entry.formattedDuration,
                                        style: TextStyle(
                                          color: isDark ? Colors.grey[500] : Colors.grey[600],
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Icon(
                                        Icons.calendar_today,
                                        size: 14,
                                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        entry.formattedDate,
                                        style: TextStyle(
                                          color: isDark ? Colors.grey[500] : Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (entry.transcript != null) ...[
                                    const SizedBox(height: 8),
                                    Text(
                                      entry.transcript!,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: isDark ? Colors.grey[400] : Colors.grey[700],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline),
                                onPressed: () => _deleteEntry(entry),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
