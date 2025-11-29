// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'task.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Task _$TaskFromJson(Map<String, dynamic> json) => Task(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      priority: json['priority'] as String,
      status: json['status'] as String,
      entryId: json['entry_id'] as String?,
      ifThenPlan: json['if_then_plan'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      dueDate: json['due_date'] == null
          ? null
          : DateTime.parse(json['due_date'] as String),
    );

Map<String, dynamic> _$TaskToJson(Task instance) {
  final Map<String, dynamic> data = <String, dynamic>{
    'id': instance.id,
    'user_id': instance.userId,
    'title': instance.title,
    'description': instance.description,
    'priority': instance.priority,
    'status': instance.status,
    'created_at': instance.createdAt.toIso8601String(),
  };
  
  // Only include optional fields if they have values
  if (instance.entryId != null) {
    data['entry_id'] = instance.entryId;
  }
  if (instance.ifThenPlan != null) {
    data['if_then_plan'] = instance.ifThenPlan;
  }
  if (instance.updatedAt != null) {
    data['updated_at'] = instance.updatedAt?.toIso8601String();
  }
  // Note: due_date may not exist in database schema - only include if set
  if (instance.dueDate != null) {
    data['due_date'] = instance.dueDate?.toIso8601String();
  }
  
  return data;
}
