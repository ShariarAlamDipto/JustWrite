import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';

class AuthProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  User? _user;
  bool _isLoading = false;
  String? _error;
  DateTime? _lastActivity;
  
  // Session timeout after 30 days of inactivity (1 month)
  static const Duration sessionTimeout = Duration(days: 30);

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

  // Google Sign-In
  Future<void> signInWithGoogle() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _supabaseService.signInWithGoogle();
      _user = response.user;
      _updateLastActivity();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      String errorMessage = 'Google sign-in failed. Please try again.';
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('cancelled') || errorStr.contains('canceled')) {
        errorMessage = 'Sign-in was cancelled.';
      } else if (errorStr.contains('network') || errorStr.contains('connection')) {
        errorMessage = 'Network error. Check your connection.';
      }
      _error = errorMessage;
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> sendMagicLink(String email) async {
    debugPrint('[AuthProvider] sendMagicLink called with: $email');
    
    // SECURITY: Basic email validation before sending
    if (email.isEmpty || !email.contains('@') || email.length > 254) {
      debugPrint('[AuthProvider] Email validation failed');
      _error = 'Invalid email address';
      _isLoading = false;
      notifyListeners();
      throw Exception('Invalid email address');
    }
    
    _isLoading = true;
    _error = null;
    notifyListeners();
    debugPrint('[AuthProvider] Set isLoading=true, calling SupabaseService...');

    try {
      final cleanEmail = email.trim().toLowerCase();
      debugPrint('[AuthProvider] Calling supabaseService.sendMagicLink($cleanEmail)');
      await _supabaseService.sendMagicLink(cleanEmail);
      debugPrint('[AuthProvider] SupabaseService returned successfully');
      _isLoading = false;
      _error = null;
      notifyListeners();
      debugPrint('[AuthProvider] Notified listeners, isLoading=false, error=null');
    } catch (e, stackTrace) {
      debugPrint('[AuthProvider] EXCEPTION: $e');
      debugPrint('[AuthProvider] Stack: $stackTrace');
      _error = 'Failed to send login code. Please check your email and try again.';
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
