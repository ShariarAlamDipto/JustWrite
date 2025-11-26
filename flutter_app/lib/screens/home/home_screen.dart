import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/screens/entry/entry_screen.dart';
import 'package:justwrite_mobile/screens/tasks/tasks_screen.dart';
import 'package:justwrite_mobile/screens/journal/journal_screen.dart';
import 'package:justwrite_mobile/screens/brainstorm/brainstorm_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  
  // Lazy-loaded screens - only created when first accessed
  final Map<int, Widget> _cachedScreens = {};

  // Screen builders for lazy loading
  Widget _buildScreen(int index) {
    // Return cached screen if already built
    if (_cachedScreens.containsKey(index)) {
      return _cachedScreens[index]!;
    }
    
    // Create screen on first access
    final Widget screen;
    switch (index) {
      case 0:
        screen = const JournalScreen();
        break;
      case 1:
        screen = const EntryScreen();
        break;
      case 2:
        screen = const BrainstormScreen();
        break;
      case 3:
        screen = const TasksScreen();
        break;
      default:
        screen = const JournalScreen();
    }
    
    // Cache for reuse
    _cachedScreens[index] = screen;
    return screen;
  }

  @override
  void initState() {
    super.initState();
    // Load data after the widget is built to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Load in parallel for faster startup
      Future.wait([
        context.read<EntryProvider>().loadEntries(),
        context.read<TaskProvider>().loadTasks(),
      ]);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('JUSTWRITE'),
        elevation: 0,
        actions: [
          PopupMenuButton(
            itemBuilder: (context) => [
              PopupMenuItem(
                child: const Text('Sign Out'),
                onTap: () async {
                  await context.read<AuthProvider>().signOut();
                },
              ),
            ],
            icon: const Icon(Icons.menu),
          ),
        ],
      ),
      // Use IndexedStack to preserve state of visited screens
      body: IndexedStack(
        index: _selectedIndex,
        children: List.generate(4, (index) {
          // Only build screens that have been visited
          if (index == _selectedIndex || _cachedScreens.containsKey(index)) {
            return _buildScreen(index);
          }
          // Return empty placeholder for unvisited screens
          return const SizedBox.shrink();
        }),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Journal',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.edit),
            label: 'Entry',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.lightbulb),
            label: 'Brainstorm',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.check_circle),
            label: 'Tasks',
          ),
        ],
      ),
    );
  }
}
