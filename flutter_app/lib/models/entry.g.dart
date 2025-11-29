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
      source: json['source'] as String? ?? 'text',
    );

Map<String, dynamic> _$EntryToJson(Entry instance) {
  final Map<String, dynamic> data = <String, dynamic>{
    'id': instance.id,
    'user_id': instance.userId,
    'content': instance.content,
    'mood': instance.mood,
    'mood_intensity': instance.moodIntensity,
    'source': instance.source,
    'created_at': instance.createdAt.toIso8601String(),
  };
  
  // Only include optional fields if they have values
  if (instance.title != null) {
    data['title'] = instance.title;
  }
  if (instance.summary != null) {
    data['summary'] = instance.summary;
  }
  if (instance.gratitude.isNotEmpty) {
    data['gratitude'] = instance.gratitude;
  }
  if (instance.promptAnswers.isNotEmpty) {
    data['prompt_answers'] = instance.promptAnswers;
  }
  if (instance.updatedAt != null) {
    data['updated_at'] = instance.updatedAt?.toIso8601String();
  }
  if (instance.aiMetadata != null) {
    data['ai_metadata'] = instance.aiMetadata;
  }
  
  return data;
}
