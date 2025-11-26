import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:justwrite_mobile/models/entry.dart';
import 'package:justwrite_mobile/models/task.dart';
import 'dart:io' show Platform;

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();

  factory SupabaseService() {
    return _instance;
  }

  SupabaseService._internal();

  final supabase = Supabase.instance.client;

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

  // Auth Methods
  Future<void> sendMagicLink(String email) async {
    await supabase.auth.signInWithOtp(
      email: email,
      emailRedirectTo: _redirectUrl,
    );
  }

  Future<void> verifyOtp(String email, String token) async {
    await supabase.auth.verifyOTP(
      email: email,
      token: token,
      type: OtpType.email,
    );
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
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
    final response = await supabase
        .from('entries')
        .insert(entry.toJson())
        .select()
        .single();

    return Entry.fromJson(response as Map<String, dynamic>);
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
