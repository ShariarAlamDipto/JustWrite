// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'entry.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Entry _$EntryFromJson(Map<String, dynamic> json) => Entry(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      content: json['content'] as String,
      title: json['title'] as String?,
      summary: json['summary'] as String?,
      mood: (json['mood'] as num?)?.toInt() ?? 5,
      moodIntensity: (json['mood_intensity'] as num?)?.toInt() ?? 5,
      gratitude: (json['gratitude'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      promptAnswers: (json['prompt_answers'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(k, e as String),
          ) ??
          {},
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      aiMetadata: json['ai_metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$EntryToJson(Entry instance) => <String, dynamic>{
      'id': instance.id,
      'user_id': instance.userId,
      'content': instance.content,
      'title': instance.title,
      'summary': instance.summary,
      'mood': instance.mood,
      'mood_intensity': instance.moodIntensity,
      'gratitude': instance.gratitude,
      'prompt_answers': instance.promptAnswers,
      'created_at': instance.createdAt.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
      'ai_metadata': instance.aiMetadata,
    };
