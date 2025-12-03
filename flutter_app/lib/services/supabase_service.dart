import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:justwrite_mobile/models/entry.dart';
import 'package:justwrite_mobile/models/task.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();

  factory SupabaseService() {
    return _instance;
  }

  SupabaseService._internal();

  final supabase = Supabase.instance.client;
  
  // Google Sign-In configuration
  // SECURITY: Web Client ID loaded from environment variable (not hardcoded)
  static String get _webClientId => dotenv.env['GOOGLE_WEB_CLIENT_ID'] ?? '';

  // Get the appropriate redirect URL for the platform
  String get _redirectUrl {
    if (Platform.isAndroid) {
      return 'justwrite://login-callback';
    } else if (Platform.isIOS) {
      return 'justwrite://login-callback';
    } else {
      return 'http://localhost:3000/auth/callback';
    }
  }

  // SECURITY: Get current user ID for queries
  String? get _userId => supabase.auth.currentUser?.id;

  // Google Sign-In
  Future<AuthResponse> signInWithGoogle() async {
    debugPrint('[Auth] Starting Google Sign-In...');
    
    // SECURITY: Validate that client ID is configured
    if (_webClientId.isEmpty) {
      debugPrint('[Auth] ERROR: GOOGLE_WEB_CLIENT_ID not configured in .env');
      throw Exception('Google Sign-In is not configured. Please set GOOGLE_WEB_CLIENT_ID in .env');
    }
    
    final GoogleSignIn googleSignIn = GoogleSignIn(
      serverClientId: _webClientId,
    );
    
    // Sign out first to ensure account picker shows
    await googleSignIn.signOut();
    
    final googleUser = await googleSignIn.signIn();
    if (googleUser == null) {
      debugPrint('[Auth] Google Sign-In cancelled by user');
      throw Exception('Google Sign-In was cancelled');
    }
    
    debugPrint('[Auth] Google user: ${googleUser.email}');
    
    final googleAuth = await googleUser.authentication;
    final idToken = googleAuth.idToken;
    final accessToken = googleAuth.accessToken;
    
    if (idToken == null) {
      debugPrint('[Auth] No ID token received from Google');
      throw Exception('No ID token received from Google');
    }
    
    debugPrint('[Auth] Got Google tokens, signing into Supabase...');
    
    // Sign in to Supabase with Google tokens
    final response = await supabase.auth.signInWithIdToken(
      provider: Provider.google,
      idToken: idToken,
      accessToken: accessToken,
    );
    
    debugPrint('[Auth] Supabase sign-in successful: ${response.user?.email}');
    return response;
  }

  // Auth Methods - Magic Link (backup)
  Future<void> sendMagicLink(String email) async {
    try {
      debugPrint('[SupabaseService] ========== SEND MAGIC LINK ==========');
      debugPrint('[SupabaseService] Email: $email');
      debugPrint('[SupabaseService] Redirect URL: $_redirectUrl');
      debugPrint('[SupabaseService] Supabase client initialized: true');
      
      debugPrint('[SupabaseService] Calling signInWithOtp...');
      await supabase.auth.signInWithOtp(
        email: email,
        emailRedirectTo: _redirectUrl,
      );
      
      debugPrint('[SupabaseService] signInWithOtp completed!');
      debugPrint('[SupabaseService] OTP sent successfully to $email');
      debugPrint('[SupabaseService] ========== END SEND MAGIC LINK ==========');
    } catch (e, stackTrace) {
      debugPrint('[SupabaseService] ERROR sending OTP!');
      debugPrint('[SupabaseService] Exception: $e');
      debugPrint('[SupabaseService] Type: ${e.runtimeType}');
      debugPrint('[SupabaseService] Stack: $stackTrace');
      rethrow;
    }
  }

  Future<void> verifyOtp(String email, String token) async {
    try {
      debugPrint('[Auth] Verifying OTP for: $email');
      
      await supabase.auth.verifyOTP(
        email: email,
        token: token,
        type: OtpType.email,
      );
      
      debugPrint('[Auth] OTP verified successfully');
      debugPrint('[Auth] Current user: ${supabase.auth.currentUser?.email}');
    } catch (e) {
      debugPrint('[Auth] Error verifying OTP: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      // Sign out from Google too
      final GoogleSignIn googleSignIn = GoogleSignIn();
      await googleSignIn.signOut();
      
      await supabase.auth.signOut();
      debugPrint('[Auth] Signed out successfully');
    } catch (e) {
      debugPrint('[Auth] Error signing out: $e');
      rethrow;
    }
  }

  User? get currentUser => supabase.auth.currentUser;
  String? get token => supabase.auth.currentSession?.accessToken;

  // Entry Methods - OPTIMIZED: Filter by user_id for additional security
  Future<List<Entry>> getEntries() async {
    final userId = _userId;
    if (userId == null) return [];
    
    final response = await supabase
        .from('entries')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false);

    return (response as List)
        .map((e) => Entry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Entry?> getEntryById(String entryId) async {
    try {
      final userId = _userId;
      if (userId == null) return null;
      
      final response = await supabase
          .from('entries')
          .select()
          .eq('id', entryId)
          .eq('user_id', userId)
          .single();

      return Entry.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<Entry> createEntry(Entry entry) async {
    debugPrint('[SupabaseService] ===== CREATE ENTRY =====');
    debugPrint('[SupabaseService] Entry to insert: ${entry.toJson()}');
    
    try {
      final response = await supabase
          .from('entries')
          .insert(entry.toJson())
          .select()
          .single();

      debugPrint('[SupabaseService] Response: $response');
      final created = Entry.fromJson(response as Map<String, dynamic>);
      debugPrint('[SupabaseService] Entry created: ${created.id}');
      return created;
    } catch (e, stackTrace) {
      debugPrint('[SupabaseService] ERROR creating entry: $e');
      debugPrint('[SupabaseService] Stack: $stackTrace');
      rethrow;
    }
  }

  Future<void> updateEntry(Entry entry) async {
    final userId = _userId;
    if (userId == null) throw Exception('Not authenticated');
    
    await supabase
        .from('entries')
        .update(entry.toJson())
        .eq('id', entry.id)
        .eq('user_id', userId);
  }

  Future<void> deleteEntry(String entryId) async {
    final userId = _userId;
    if (userId == null) throw Exception('Not authenticated');
    
    await supabase
        .from('entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);
  }

  // Task Methods - OPTIMIZED: Filter by user_id
  Future<List<Task>> getTasks() async {
    final userId = _userId;
    if (userId == null) return [];
    
    final response = await supabase
        .from('tasks')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false);

    return (response as List)
        .map((t) => Task.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  Future<Task> createTask(Task task) async {
    final response = await supabase
        .from('tasks')
        .insert(task.toJson())
        .select()
        .single();

    return Task.fromJson(response as Map<String, dynamic>);
  }

  Future<void> updateTask(Task task) async {
    final userId = _userId;
    if (userId == null) throw Exception('Not authenticated');
    
    await supabase
        .from('tasks')
        .update(task.toJson())
        .eq('id', task.id)
        .eq('user_id', userId);
  }

  Future<void> deleteTask(String taskId) async {
    final userId = _userId;
    if (userId == null) throw Exception('Not authenticated');
    
    await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
  }

  Future<List<Task>> getTasksByEntry(String entryId) async {
    final userId = _userId;
    if (userId == null) return [];
    
    final response = await supabase
        .from('tasks')
        .select()
        .eq('entry_id', entryId)
        .eq('user_id', userId)
        .order('created_at', ascending: false);

    return (response as List)
        .map((t) => Task.fromJson(t as Map<String, dynamic>))
        .toList();
  }
}
