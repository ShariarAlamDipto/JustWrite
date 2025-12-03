// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'voice_entry.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

VoiceEntry _$VoiceEntryFromJson(Map<String, dynamic> json) => VoiceEntry(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String,
      audioUrl: json['audio_url'] as String?,
      audioDuration: (json['audio_duration'] as num?)?.toInt(),
      transcript: json['transcript'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$VoiceEntryToJson(VoiceEntry instance) =>
    <String, dynamic>{
      'id': instance.id,
      'user_id': instance.userId,
      'title': instance.title,
      'audio_url': instance.audioUrl,
      'audio_duration': instance.audioDuration,
      'transcript': instance.transcript,
      'created_at': instance.createdAt.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
      'metadata': instance.metadata,
    };
