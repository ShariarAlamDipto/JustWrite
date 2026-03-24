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
import 'package:justwrite_mobile/services/sync_service.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

// Desktop-only imports — guarded by kIsWeb / platform checks at runtime
import 'package:justwrite_mobile/desktop/desktop_shell.dart';
import 'package:justwrite_mobile/desktop/window_setup.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final isDesktop = !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.windows ||
          defaultTargetPlatform == TargetPlatform.macOS ||
          defaultTargetPlatform == TargetPlatform.linux);

  // Mobile-only: configure system UI overlays
  if (!isDesktop && !kIsWeb) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ));
  }

  // Desktop-only: set up window frame + Mica/Acrylic effect
  if (isDesktop) {
    await setupDesktopWindow();
  }

  // Load environment variables
  await dotenv.load(fileName: '.env');

  // Initialize Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
    debug: false,
  );

  // Initialize offline sync service
  await SyncService().initialize();

  // Mobile-only: device security check
  if (!isDesktop && !kIsWeb) {
    final securityService = SecurityService();
    final isCompromised = await securityService.isDeviceCompromised();
    if (isCompromised && !kDebugMode) {
      runApp(const SecurityWarningApp());
      return;
    }
  }

  runApp(JustWriteApp(isDesktop: isDesktop));
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
                const Icon(Icons.security, size: 80, color: Colors.red),
                const SizedBox(height: 24),
                const Text(
                  'Security Warning',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 16),
                const Text(
                  'This device appears to be rooted or jailbroken. '
                  'For your security, JustWrite cannot run on compromised devices.\n\n'
                  'Your journal entries contain personal data that could be at risk.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.white70, height: 1.5),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => SystemNavigator.pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  ),
                  child: const Text('Close App', style: TextStyle(fontSize: 16, color: Colors.white)),
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
  final bool isDesktop;
  const JustWriteApp({super.key, required this.isDesktop});

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
                  // Desktop gets the Windows-style two-pane shell
                  return isDesktop ? const DesktopShell() : const HomeScreen();
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
