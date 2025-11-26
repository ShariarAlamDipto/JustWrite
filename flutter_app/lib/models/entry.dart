import 'package:json_annotation/json_annotation.dart';

part 'entry.g.dart';

@JsonSerializable()
class Entry {
  final String id;
  final String userId;
  final String content;
  final String? title;
  final String? summary;
  final int mood;
  final int moodIntensity;
  final List<String> gratitude;
  final Map<String, String> promptAnswers;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final Map<String, dynamic>? aiMetadata;

  Entry({
    required this.id,
    required this.userId,
    required this.content,
    this.title,
    this.summary,
    required this.mood,
    required this.moodIntensity,
    required this.gratitude,
    required this.promptAnswers,
    required this.createdAt,
    this.updatedAt,
    this.aiMetadata,
  });

  factory Entry.fromJson(Map<String, dynamic> json) => _$EntryFromJson(json);
  Map<String, dynamic> toJson() => _$EntryToJson(this);

  Entry copyWith({
    String? id,
    String? userId,
    String? content,
    String? title,
    String? summary,
    int? mood,
    int? moodIntensity,
    List<String>? gratitude,
    Map<String, String>? promptAnswers,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? aiMetadata,
  }) {
    return Entry(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      content: content ?? this.content,
      title: title ?? this.title,
      summary: summary ?? this.summary,
      mood: mood ?? this.mood,
      moodIntensity: moodIntensity ?? this.moodIntensity,
      gratitude: gratitude ?? this.gratitude,
      promptAnswers: promptAnswers ?? this.promptAnswers,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      aiMetadata: aiMetadata ?? this.aiMetadata,
    );
  }
}
