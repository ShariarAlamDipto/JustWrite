import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';

class AuthProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  User? _user;
  bool _isLoading = false;
  String? _error;
  DateTime? _lastActivity;
  
  // SECURITY: Session timeout after 30 minutes of inactivity
  static const Duration sessionTimeout = Duration(minutes: 30);

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && !_isSessionExpired();
  String? get token => _supabaseService.token;

  AuthProvider() {
    _checkAuthStatus();
    _setupAuthListener();
    _updateLastActivity();
  }

  // SECURITY: Check if session has timed out due to inactivity
  bool _isSessionExpired() {
    if (_lastActivity == null) return false;
    return DateTime.now().difference(_lastActivity!) > sessionTimeout;
  }
  
  // SECURITY: Update activity timestamp on user actions
  void _updateLastActivity() {
    _lastActivity = DateTime.now();
  }
  
  // SECURITY: Call this on any user interaction to reset timeout
  void recordActivity() {
    _updateLastActivity();
  }

  void _checkAuthStatus() {
    _user = _supabaseService.currentUser;
    _updateLastActivity();
    notifyListeners();
  }

  void _setupAuthListener() {
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      _user = data.session?.user;
      if (_user != null) {
        _updateLastActivity();
      }
      notifyListeners();
    });
  }

  Future<void> sendMagicLink(String email) async {
    // SECURITY: Basic email validation before sending
    if (email.isEmpty || !email.contains('@') || email.length > 254) {
      _error = 'Invalid email address';
      notifyListeners();
      return;
    }
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _supabaseService.sendMagicLink(email.trim().toLowerCase());
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      // SECURITY: Don't expose detailed error messages
      _error = 'Failed to send magic link. Please try again.';
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> verifyOtp(String email, String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _supabaseService.verifyOtp(email.trim().toLowerCase(), token);
      _user = _supabaseService.currentUser;
      _updateLastActivity();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      // SECURITY: Don't expose detailed error messages
      _error = 'Verification failed. Please try again.';
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      await _supabaseService.signOut();
      _user = null;
      _lastActivity = null;
      notifyListeners();
    } catch (e) {
      // SECURITY: Force clear user even if signOut fails
      _user = null;
      _lastActivity = null;
      _error = 'Sign out completed';
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
