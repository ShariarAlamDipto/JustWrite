import 'package:json_annotation/json_annotation.dart';

part 'task.g.dart';

@JsonSerializable()
class Task {
  final String id;
  final String userId;
  final String title;
  final String description;
  final String priority; // high, medium, low
  final String status; // todo, done
  final String? entryId;
  final String? ifThenPlan;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? dueDate;

  Task({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    this.entryId,
    this.ifThenPlan,
    required this.createdAt,
    this.updatedAt,
    this.dueDate,
  });

  factory Task.fromJson(Map<String, dynamic> json) => _$TaskFromJson(json);
  Map<String, dynamic> toJson() => _$TaskToJson(this);

  Task copyWith({
    String? id,
    String? userId,
    String? title,
    String? description,
    String? priority,
    String? status,
    String? entryId,
    String? ifThenPlan,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? dueDate,
  }) {
    return Task(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      description: description ?? this.description,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      entryId: entryId ?? this.entryId,
      ifThenPlan: ifThenPlan ?? this.ifThenPlan,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      dueDate: dueDate ?? this.dueDate,
    );
  }

  bool get isDone => status == 'done';
}
