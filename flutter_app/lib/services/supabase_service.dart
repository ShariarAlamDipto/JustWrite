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

  // Auth Methods
  Future<void> sendMagicLink(String email) async {
    print('📧 Sending magic link to: $email');
    print('🔗 Redirect URL: $_redirectUrl');
    
    await supabase.auth.signInWithOtp(
      email: email,
      emailRedirectTo: _redirectUrl,
    );
    
    print('✅ Magic link sent successfully');
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

  // Entry Methods
  Future<List<Entry>> getEntries() async {
    final response = await supabase
        .from('entries')
        .select()
        .order('created_at', ascending: false);

    return (response as List)
        .map((e) => Entry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Entry?> getEntryById(String entryId) async {
    try {
      final response =
          await supabase.from('entries').select().eq('id', entryId).single();

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
    await supabase.from('entries').update(entry.toJson()).eq('id', entry.id);
  }

  Future<void> deleteEntry(String entryId) async {
    await supabase.from('entries').delete().eq('id', entryId);
  }

  // Task Methods
  Future<List<Task>> getTasks() async {
    final response = await supabase
        .from('tasks')
        .select()
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
    await supabase.from('tasks').update(task.toJson()).eq('id', task.id);
  }

  Future<void> deleteTask(String taskId) async {
    await supabase.from('tasks').delete().eq('id', taskId);
  }

  Future<List<Task>> getTasksByEntry(String entryId) async {
    final response = await supabase
        .from('tasks')
        .select()
        .eq('entry_id', entryId)
        .order('created_at', ascending: false);

    return (response as List)
        .map((t) => Task.fromJson(t as Map<String, dynamic>))
        .toList();
  }
}
