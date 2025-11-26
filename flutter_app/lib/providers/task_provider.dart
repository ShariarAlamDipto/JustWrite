import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/task.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';
import 'package:uuid/uuid.dart';

class TaskProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  List<Task> _tasks = [];
  bool _isLoading = false;
  String? _error;

  List<Task> get tasks => _tasks;
  List<Task> get pendingTasks => _tasks.where((t) => !t.isDone).toList();
  List<Task> get completedTasks => _tasks.where((t) => t.isDone).toList();
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadTasks() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _tasks = await _supabaseService.getTasks();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Task> createTask({
    required String userId,
    required String title,
    required String description,
    String priority = 'medium',
    String? entryId,
    String? ifThenPlan,
    DateTime? dueDate,
  }) async {
    try {
      final task = Task(
        id: const Uuid().v4(),
        userId: userId,
        title: title,
        description: description,
        priority: priority,
        status: 'todo',
        entryId: entryId,
        ifThenPlan: ifThenPlan,
        createdAt: DateTime.now(),
        dueDate: dueDate,
      );

      final created = await _supabaseService.createTask(task);
      _tasks.insert(0, created);
      notifyListeners();
      return created;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> toggleTaskStatus(Task task) async {
    final updatedTask = task.copyWith(
      status: task.isDone ? 'todo' : 'done',
      updatedAt: DateTime.now(),
    );

    try {
      await _supabaseService.updateTask(updatedTask);
      final index = _tasks.indexWhere((t) => t.id == task.id);
      if (index != -1) {
        _tasks[index] = updatedTask;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> updateTask(Task task) async {
    try {
      await _supabaseService.updateTask(task);
      final index = _tasks.indexWhere((t) => t.id == task.id);
      if (index != -1) {
        _tasks[index] = task;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> deleteTask(String taskId) async {
    try {
      await _supabaseService.deleteTask(taskId);
      _tasks.removeWhere((t) => t.id == taskId);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<List<Task>> loadTasksByEntry(String entryId) async {
    try {
      return await _supabaseService.getTasksByEntry(entryId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
