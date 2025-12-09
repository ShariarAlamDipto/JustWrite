import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/task.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';
import 'package:uuid/uuid.dart';

class TaskProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  List<Task> _tasks = [];
  bool _isLoading = false;
  String? _error;
  DateTime? _lastFetch;
  bool _isCreating = false;
  
  // Cached filtered lists - only recompute when tasks change
  List<Task>? _cachedPending;
  List<Task>? _cachedCompleted;
  
  // Cache duration: 60 seconds
  static const _cacheDuration = Duration(seconds: 60);

  List<Task> get tasks => _tasks;
  
  // Cached computed properties - avoid repeated filtering
  List<Task> get pendingTasks {
    _cachedPending ??= _tasks.where((t) => !t.isDone).toList();
    return _cachedPending!;
  }
  
  List<Task> get completedTasks {
    _cachedCompleted ??= _tasks.where((t) => t.isDone).toList();
    return _cachedCompleted!;
  }
  
  // Invalidate cached lists when tasks change
  void _invalidateCache() {
    _cachedPending = null;
    _cachedCompleted = null;
  }
  
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  // Check if cache is valid
  bool get _isCacheValid => 
    _lastFetch != null && 
    DateTime.now().difference(_lastFetch!) < _cacheDuration;

  Future<void> loadTasks({bool forceRefresh = false}) async {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && _isCacheValid && _tasks.isNotEmpty) {
      return;
    }
    
    // Prevent duplicate loading
    if (_isLoading) return;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _tasks = await _supabaseService.getTasks();
      _lastFetch = DateTime.now();
      _invalidateCache(); // Clear cached filtered lists
    } catch (e) {
      _error = e.toString();
    } finally {
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
    // Prevent concurrent creates with a short wait
    if (_isCreating) {
      await Future.delayed(const Duration(milliseconds: 50));
      if (_isCreating) {
        throw Exception('Task creation in progress');
      }
    }
    _isCreating = true;
    
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
      _invalidateCache(); // Clear cached filtered lists
      notifyListeners();
      return created;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    } finally {
      _isCreating = false;
    }
  }

  Future<void> toggleTaskStatus(Task task) async {
    final updatedTask = task.copyWith(
      status: task.isDone ? 'todo' : 'done',
      updatedAt: DateTime.now(),
    );

    // Optimistic update
    final index = _tasks.indexWhere((t) => t.id == task.id);
    if (index != -1) {
      _tasks[index] = updatedTask;
      _invalidateCache();
      notifyListeners();
    }

    try {
      await _supabaseService.updateTask(updatedTask);
    } catch (e) {
      // Rollback on failure
      if (index != -1) {
        _tasks[index] = task;
        _invalidateCache();
        notifyListeners();
      }
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
        _invalidateCache();
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> deleteTask(String taskId) async {
    // Optimistic delete
    final removedTask = _tasks.firstWhere((t) => t.id == taskId);
    final removedIndex = _tasks.indexWhere((t) => t.id == taskId);
    _tasks.removeWhere((t) => t.id == taskId);
    _invalidateCache();
    notifyListeners();
    
    try {
      await _supabaseService.deleteTask(taskId);
    } catch (e) {
      // Rollback on failure
      _tasks.insert(removedIndex, removedTask);
      _invalidateCache();
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
  
  // Invalidate cache to force refresh on next load
  void invalidateCache() {
    _lastFetch = null;
  }
}
