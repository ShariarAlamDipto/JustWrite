import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/screens/auth/login_screen.dart';
import 'package:justwrite_mobile/screens/home/home_screen.dart';
import 'package:justwrite_mobile/screens/voice/voice_entries_screen.dart';
import 'package:justwrite_mobile/services/security_service.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set status bar style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));

  // Load environment variables
  await dotenv.load(fileName: '.env');

  // Initialize Supabase with persistent session
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
    debug: false, // SECURITY: Never enable debug in production
  );

  // SECURITY: Perform device security check
  final securityService = SecurityService();
  final isCompromised = await securityService.isDeviceCompromised();
  
  if (isCompromised && !kDebugMode) {
    // In production, show security warning
    runApp(const SecurityWarningApp());
    return;
  }

  runApp(const JustWriteApp());
}

/// SECURITY: App shown when device is detected as compromised (rooted/jailbroken)
class SecurityWarningApp extends StatelessWidget {
  const SecurityWarningApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JustWrite',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.security,
                  size: 80,
                  color: Colors.red,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Security Warning',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'This device appears to be rooted or jailbroken. '
                  'For your security, JustWrite cannot run on compromised devices.\n\n'
                  'Your journal entries contain personal data that could be at risk.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => SystemNavigator.pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  ),
                  child: const Text(
                    'Close App',
                    style: TextStyle(fontSize: 16, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class JustWriteApp extends StatelessWidget {
  const JustWriteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => EntryProvider()),
        ChangeNotifierProvider(create: (_) => TaskProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            title: 'JustWrite',
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeProvider.isDarkMode ? ThemeMode.dark : ThemeMode.light,
            debugShowCheckedModeBanner: false,
            home: Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                if (authProvider.isLoading) {
                  return Scaffold(
                    backgroundColor: themeProvider.isDarkMode ? AppTheme.darkBg : Colors.white,
                    body: Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          themeProvider.isDarkMode ? AppTheme.navyLight : AppTheme.navy,
                        ),
                      ),
                    ),
                  );
                }

                if (authProvider.user != null) {
                  return const HomeScreen();
                }

                return const LoginScreen();
              },
            ),
            routes: {
              '/voice': (context) => const VoiceEntriesScreen(),
            },
          );
        },
      ),
    );
  }
}
