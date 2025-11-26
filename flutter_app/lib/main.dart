import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:app_links/app_links.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/screens/auth/login_screen.dart';
import 'package:justwrite_mobile/screens/home/home_screen.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  await dotenv.load(fileName: '.env');

  print('🚀 Initializing Supabase...');
  print('📍 URL: ${dotenv.env['SUPABASE_URL']}');

  // Initialize Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  print('✅ Supabase initialized');

  runApp(const JustWriteApp());
}

class JustWriteApp extends StatefulWidget {
  const JustWriteApp({Key? key}) : super(key: key);

  @override
  State<JustWriteApp> createState() => _JustWriteAppState();
}

class _JustWriteAppState extends State<JustWriteApp> {
  late final AppLinks _appLinks;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  Future<void> _initDeepLinks() async {
    _appLinks = AppLinks();

    // Handle links when app is already running
    _appLinks.uriLinkStream.listen((Uri uri) {
      print('🔗 Deep link received: $uri');
      _handleDeepLink(uri);
    });

    // Handle initial link (app opened from link)
    try {
      final initialUri = await _appLinks.getInitialAppLink();
      if (initialUri != null) {
        print('🔗 Initial deep link: $initialUri');
        _handleDeepLink(initialUri);
      }
    } catch (e) {
      print('❌ Error getting initial link: $e');
    }
  }

  void _handleDeepLink(Uri uri) {
    print('🔐 Processing auth callback: $uri');
    print('🔐 Scheme: ${uri.scheme}, Host: ${uri.host}, Path: ${uri.path}');
    print('🔐 Query params: ${uri.queryParameters}');
    
    // Check if this is an auth callback
    if (uri.scheme == 'justwrite' || uri.scheme == 'io.supabase.justwrite') {
      print('✅ Valid auth callback detected');
      // Supabase Flutter handles the auth callback automatically
      // Just need to refresh the auth state
      Supabase.instance.client.auth.refreshSession();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => EntryProvider()),
        ChangeNotifierProvider(create: (_) => TaskProvider()),
      ],
      child: MaterialApp(
        title: 'JustWrite',
        theme: AppTheme.darkTheme,
        home: Consumer<AuthProvider>(
          builder: (context, authProvider, _) {
            if (authProvider.isLoading) {
              return const Scaffold(
                body: Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00ffd5)),
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
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
