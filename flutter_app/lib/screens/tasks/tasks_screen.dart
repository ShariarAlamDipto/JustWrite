import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/models/task.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    
    return Consumer<TaskProvider>(
      builder: (context, taskProvider, _) {
        if (taskProvider.isLoading) {
          return const Center(
            child: CircularProgressIndicator(strokeWidth: 2),
          );
        }

        return DefaultTabController(
          length: 2,
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark 
                      ? AppTheme.darkCard 
                      : AppTheme.greyLight.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: TabBar(
                  padding: const EdgeInsets.all(4),
                  indicator: BoxDecoration(
                    color: isDark ? AppTheme.navyLight : AppTheme.navy,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  labelColor: Colors.white,
                  unselectedLabelColor: AppTheme.grey,
                  dividerColor: Colors.transparent,
                  tabs: [
                    Tab(text: 'Pending (${taskProvider.pendingTasks.length})'),
                    Tab(text: 'Done (${taskProvider.completedTasks.length})'),
                  ],
                ),
              ),
              Expanded(
                child: TabBarView(
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _TaskList(tasks: taskProvider.pendingTasks, isDark: isDark),
                    _TaskList(tasks: taskProvider.completedTasks, isDark: isDark),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _TaskList extends StatelessWidget {
  final List<Task> tasks;
  final bool isDark;

  const _TaskList({required this.tasks, required this.isDark});

  void _showAddTaskDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String priority = 'medium';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppTheme.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Add New Task',
                style: Theme.of(context).textTheme.displaySmall,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: titleController,
                autofocus: true,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                ),
                decoration: InputDecoration(
                  hintText: 'Task title',
                  hintStyle: TextStyle(
                    color: isDark ? Colors.white54 : Colors.grey,
                  ),
                  filled: true,
                  fillColor: isDark ? AppTheme.darkCard : AppTheme.greyLight.withValues(alpha: 0.3),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                maxLines: 3,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                ),
                decoration: InputDecoration(
                  hintText: 'Description (optional)',
                  hintStyle: TextStyle(
                    color: isDark ? Colors.white54 : Colors.grey,
                  ),
                  filled: true,
                  fillColor: isDark ? AppTheme.darkCard : AppTheme.greyLight.withValues(alpha: 0.3),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'PRIORITY',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 8),
              Row(
                children: ['low', 'medium', 'high'].map((p) {
                  final isSelected = priority == p;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setModalState(() => priority = p),
                      child: Container(
                        margin: EdgeInsets.only(right: p != 'high' ? 8 : 0),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? _getPriorityColor(p)
                              : (isDark ? AppTheme.darkCard : AppTheme.greyLight),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? _getPriorityColor(p)
                                : Colors.transparent,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            p.toUpperCase(),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected
                                  ? Colors.white
                                  : (isDark ? Colors.white70 : AppTheme.grey),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (titleController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter a task title')),
                      );
                      return;
                    }
                    
                    final auth = context.read<AuthProvider>();
                    final taskProvider = context.read<TaskProvider>();
                    
                    await taskProvider.createTask(
                      userId: auth.user!.id,
                      title: titleController.text.trim(),
                      description: descController.text.trim(),
                      priority: priority,
                    );
                    
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Task added')),
                      );
                    }
                  },
                  child: const Text('ADD TASK'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return const Color(0xFFdc2626);
      case 'medium':
        return AppTheme.navy;
      default:
        return AppTheme.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: tasks.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        size: 48,
                        color: isDark ? AppTheme.greyLight : AppTheme.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'All clear',
                        style: Theme.of(context).textTheme.displaySmall,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'No tasks here',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: tasks.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) => _TaskCard(task: tasks[index], isDark: isDark),
                ),
        ),
        // Add task button at bottom
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showAddTaskDialog(context),
              icon: const Icon(Icons.add),
              label: const Text('ADD TASK'),
            ),
          ),
        ),
      ],
    );
  }
}

class _TaskCard extends StatelessWidget {
  final Task task;
  final bool isDark;

  const _TaskCard({required this.task, required this.isDark});

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return const Color(0xFFdc2626);
      case 'medium':
        return isDark ? AppTheme.navyLight : AppTheme.navy;
      default:
        return AppTheme.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final taskProvider = context.read<TaskProvider>();

    return Dismissible(
      key: Key(task.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        taskProvider.deleteTask(task.id);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task deleted')),
        );
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: const Color(0xFFdc2626),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkCard : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? AppTheme.greyDark : AppTheme.greyLight,
          ),
        ),
        child: InkWell(
          onTap: () => _showTaskDetail(context, task),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Checkbox
                GestureDetector(
                  onTap: () => taskProvider.toggleTaskStatus(task),
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: task.isDone 
                          ? (isDark ? AppTheme.navyLight : AppTheme.navy) 
                          : Colors.transparent,
                      border: Border.all(
                        color: task.isDone 
                            ? (isDark ? AppTheme.navyLight : AppTheme.navy) 
                            : AppTheme.grey,
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: task.isDone
                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                        : null,
                  ),
                ),
                const SizedBox(width: 12),
                // Content - expanded to take full width
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.title,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                          decoration: task.isDone ? TextDecoration.lineThrough : null,
                          color: task.isDone 
                              ? AppTheme.grey 
                              : (isDark ? Colors.white : AppTheme.black),
                        ),
                        // No maxLines - show full text
                      ),
                      if (task.description.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          task.description,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isDark ? Colors.white70 : AppTheme.grey,
                          ),
                          // No maxLines - show full description
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getPriorityColor(task.priority).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              task.priority.toUpperCase(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: _getPriorityColor(task.priority),
                              ),
                            ),
                          ),
                          if (task.dueDate != null) ...[
                            const SizedBox(width: 12),
                            Icon(
                              Icons.schedule, 
                              size: 14, 
                              color: isDark ? Colors.white70 : AppTheme.grey,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              task.dueDate!.toString().split(' ')[0],
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: isDark ? Colors.white70 : AppTheme.grey,
                              ),
                            ),
                          ],
                          const Spacer(),
                          // Delete button
                          IconButton(
                            icon: Icon(
                              Icons.delete_outline,
                              size: 20,
                              color: isDark ? Colors.white54 : AppTheme.grey,
                            ),
                            onPressed: () {
                              taskProvider.deleteTask(task.id);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Task deleted')),
                              );
                            },
                            tooltip: 'Delete task',
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showTaskDetail(BuildContext context, Task task) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppTheme.darkSurface : Colors.white,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              task.title,
              style: Theme.of(context).textTheme.displaySmall,
            ),
            const SizedBox(height: 16),
            if (task.description.isNotEmpty) ...[
              Text(
                task.description,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
            ],
            if (task.ifThenPlan != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark 
                      ? AppTheme.darkCard 
                      : AppTheme.greyLight.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'IF-THEN PLAN',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      task.ifThenPlan!,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      context.read<TaskProvider>().toggleTaskStatus(task);
                      Navigator.pop(context);
                    },
                    child: Text(task.isDone ? 'MARK AS PENDING' : 'MARK AS DONE'),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: () {
                    context.read<TaskProvider>().deleteTask(task.id);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Task deleted')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFdc2626),
                  ),
                  child: const Icon(Icons.delete_outline),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
