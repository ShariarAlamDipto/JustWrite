import 'package:json_annotation/json_annotation.dart';

part 'voice_entry.g.dart';

@JsonSerializable(fieldRename: FieldRename.snake)
class VoiceEntry {
  final String id;
  
  @JsonKey(name: 'user_id')
  final String userId;
  
  final String title;
  
  @JsonKey(name: 'audio_url')
  final String? audioUrl;
  
  @JsonKey(name: 'audio_duration')
  final int? audioDuration; // Duration in seconds
  
  final String? transcript;
  
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;
  
  final Map<String, dynamic>? metadata;

  VoiceEntry({
    required this.id,
    required this.userId,
    required this.title,
    this.audioUrl,
    this.audioDuration,
    this.transcript,
    required this.createdAt,
    this.updatedAt,
    this.metadata,
  });

  factory VoiceEntry.fromJson(Map<String, dynamic> json) => _$VoiceEntryFromJson(json);
  Map<String, dynamic> toJson() => _$VoiceEntryToJson(this);

  VoiceEntry copyWith({
    String? id,
    String? userId,
    String? title,
    String? audioUrl,
    int? audioDuration,
    String? transcript,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? metadata,
  }) {
    return VoiceEntry(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      audioUrl: audioUrl ?? this.audioUrl,
      audioDuration: audioDuration ?? this.audioDuration,
      transcript: transcript ?? this.transcript,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      metadata: metadata ?? this.metadata,
    );
  }

  /// Get formatted duration string (MM:SS)
  String get formattedDuration {
    if (audioDuration == null) return '0:00';
    final minutes = audioDuration! ~/ 60;
    final seconds = audioDuration! % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  /// Get formatted date string
  String get formattedDate {
    final now = DateTime.now();
    final diff = now.difference(createdAt);
    
    if (diff.inDays == 0) {
      return 'Today';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${createdAt.day}/${createdAt.month}/${createdAt.year}';
    }
  }
}
