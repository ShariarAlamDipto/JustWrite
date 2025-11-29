import 'package:json_annotation/json_annotation.dart';

part 'entry.g.dart';

/// Entry sources - matches database schema
class EntrySource {
  static const String text = 'text';        // Regular journal entry
  static const String brainstorm = 'brainstorm'; // From brainstorm/ideas
  static const String voice = 'voice';      // Voice input (future)
}

@JsonSerializable(fieldRename: FieldRename.snake)
class Entry {
  final String id;
  
  @JsonKey(name: 'user_id')
  final String userId;
  
  final String content;
  final String? title;
  final String? summary;
  
  @JsonKey(defaultValue: 5)
  final int mood;
  
  @JsonKey(name: 'mood_intensity', defaultValue: 5)
  final int moodIntensity;
  
  @JsonKey(defaultValue: [])
  final List<String> gratitude;
  
  @JsonKey(name: 'prompt_answers', defaultValue: {})
  final Map<String, String> promptAnswers;
  
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;
  
  @JsonKey(name: 'ai_metadata')
  final Map<String, dynamic>? aiMetadata;
  
  /// Source of the entry: 'text', 'brainstorm', 'voice'
  @JsonKey(defaultValue: 'text')
  final String source;

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
    this.source = 'text',
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
    String? source,
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
      source: source ?? this.source,
    );
  }
  
  /// Check if this is a brainstorm session
  bool get isBrainstorm => source == EntrySource.brainstorm;
  
  /// Check if this is a regular journal entry
  bool get isJournal => source == EntrySource.text;
}
