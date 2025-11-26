// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'entry.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Entry _$EntryFromJson(Map<String, dynamic> json) => Entry(
      id: json['id'] as String,
      userId: json['userId'] as String,
      content: json['content'] as String,
      title: json['title'] as String?,
      summary: json['summary'] as String?,
      mood: (json['mood'] as num).toInt(),
      moodIntensity: (json['moodIntensity'] as num).toInt(),
      gratitude:
          (json['gratitude'] as List<dynamic>).map((e) => e as String).toList(),
      promptAnswers: Map<String, String>.from(json['promptAnswers'] as Map),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
      aiMetadata: json['aiMetadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$EntryToJson(Entry instance) => <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'content': instance.content,
      'title': instance.title,
      'summary': instance.summary,
      'mood': instance.mood,
      'moodIntensity': instance.moodIntensity,
      'gratitude': instance.gratitude,
      'promptAnswers': instance.promptAnswers,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
      'aiMetadata': instance.aiMetadata,
    };
