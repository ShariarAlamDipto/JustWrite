import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/screens/entry/entry_screen.dart';
import 'package:justwrite_mobile/screens/tasks/tasks_screen.dart';
import 'package:justwrite_mobile/screens/journal/journal_screen.dart';
import 'package:justwrite_mobile/screens/brainstorm/brainstorm_screen.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  // Screens built once and kept alive via IndexedStack
  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    // Build screens once to preserve state across tab switches
    _screens = const [
      JournalScreen(),
      EntryScreen(),
      BrainstormScreen(),
      TasksScreen(),
    ];
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.wait([
        context.read<EntryProvider>().loadEntries(),
        context.read<TaskProvider>().loadTasks(),
      ]);
    });
  }

  void _showSettingsMenu() {
    final themeProvider = context.read<ThemeProvider>();
    final isDark = themeProvider.isDarkMode;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.navy : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          final isDark = themeProvider.isDarkMode;
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.greyLight : AppTheme.grey,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  ListTile(
                    leading: Icon(
                      isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                      color: isDark ? Colors.white : AppTheme.navy,
                    ),
                    title: Text(
                      isDark ? 'Light Mode' : 'Dark Mode',
                      style: TextStyle(
                        fontFamily: 'Times New Roman',
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    trailing: Switch(
                      value: isDark,
                      onChanged: (_) => themeProvider.toggleTheme(),
                      activeThumbColor: AppTheme.navy,
                      activeTrackColor: AppTheme.navyLight,
                    ),
                    onTap: () => themeProvider.toggleTheme(),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: Icon(
                      Icons.logout_outlined,
                      color: isDark ? Colors.white : AppTheme.navy,
                    ),
                    title: Text(
                      'Sign Out',
                      style: TextStyle(
                        fontFamily: 'Times New Roman',
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      context.read<AuthProvider>().signOut();
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        return Scaffold(
          appBar: AppBar(
            title: const Text('JUSTWRITE'),
            actions: [
              IconButton(
                icon: Icon(
                  isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                  size: 20,
                ),
                onPressed: () => themeProvider.toggleTheme(),
                tooltip: isDark ? 'Light Mode' : 'Dark Mode',
              ),
              IconButton(
                icon: const Icon(Icons.settings_outlined, size: 20),
                onPressed: _showSettingsMenu,
                tooltip: 'Settings',
              ),
            ],
          ),
          body: IndexedStack(
            index: _selectedIndex,
            children: _screens,
          ),
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
                ),
              ),
            ),
            child: BottomNavigationBar(
              currentIndex: _selectedIndex,
              onTap: (index) => setState(() => _selectedIndex = index),
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.book_outlined),
                  activeIcon: Icon(Icons.book),
                  label: 'Journal',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.edit_outlined),
                  activeIcon: Icon(Icons.edit),
                  label: 'Write',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.lightbulb_outline),
                  activeIcon: Icon(Icons.lightbulb),
                  label: 'Ideas',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.check_circle_outline),
                  activeIcon: Icon(Icons.check_circle),
                  label: 'Tasks',
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
