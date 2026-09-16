import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';
import 'package:justwrite_mobile/services/auth_error.dart';

class AuthProvider extends ChangeNotifier {
  final _supabaseService = SupabaseService();
  User? _user;
  bool _isLoading = false;
  String? _error;

  // Session lifetime is owned by Supabase, not by this class.
  //
  // supabase_flutter persists the session to disk (HiveLocalStorage) and
  // refreshes the access token automatically, including on app resume, so a
  // signed-in phone stays signed in across restarts until the user taps Sign
  // out or the refresh token is revoked server-side.
  //
  // There was previously a 30-day client-side inactivity timeout gating this
  // getter, but its timestamp lived only in memory and was reset to "now" in
  // the constructor, so it could never actually fire. Persisting it would have
  // silently started logging people out, which is the opposite of what we
  // want here, so the gate is gone and Supabase is the single source of truth.
  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;
  String? get token => _supabaseService.token;

  AuthProvider() {
    _checkAuthStatus();
    _setupAuthListener();
  }

  void _checkAuthStatus() {
    _user = _supabaseService.currentUser;
    notifyListeners();
  }

  void _setupAuthListener() {
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      _user = data.session?.user;
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
    if (kDebugMode) debugPrint('[AuthProvider] sendMagicLink called');
    
    // SECURITY: Basic email validation before sending
    if (email.isEmpty || !email.contains('@') || email.length > 254) {
      if (kDebugMode) debugPrint('[AuthProvider] Email validation failed');
      _error = 'Invalid email address';
      _isLoading = false;
      notifyListeners();
      throw Exception('Invalid email address');
    }
    
    _isLoading = true;
    _error = null;
    notifyListeners();
    if (kDebugMode) debugPrint('[AuthProvider] Calling SupabaseService...');

    try {
      final cleanEmail = email.trim().toLowerCase();
      await _supabaseService.sendMagicLink(cleanEmail);
      if (kDebugMode) debugPrint('[AuthProvider] Magic link sent successfully');
      _isLoading = false;
      _error = null;
      notifyListeners();
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('[AuthProvider] EXCEPTION: $e');
        debugPrint('[AuthProvider] Stack: $stackTrace');
      }
      _error = describeAuthError(e);
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
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = describeAuthError(e);
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      await _supabaseService.signOut();
      _user = null;
      notifyListeners();
    } catch (e) {
      // SECURITY: Force clear user even if signOut fails
      _user = null;
      _error = 'Sign out completed';
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
