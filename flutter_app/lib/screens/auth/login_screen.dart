import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/services/auth_error.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';
import 'package:justwrite_mobile/widgets/google_logo.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  bool _showOtpInput = false;
  bool _emailSent = false;
  String? _sentToEmail;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _sendMagicLink() async {
    final email = _emailController.text.trim();
    
    debugPrint('========== LOGIN DEBUG ==========');
    debugPrint('[Login] Button pressed');
    debugPrint('[Login] Email entered: "$email"');
    
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email')),
      );
      return;
    }

    // Basic email validation
    if (!email.contains('@') || !email.contains('.')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid email address')),
      );
      return;
    }

    try {
      debugPrint('[Login] Calling AuthProvider.sendMagicLink()...');
      await context.read<AuthProvider>().sendMagicLink(email);
      debugPrint('[Login] sendMagicLink completed without exception');
      
      if (!mounted) return;
      
      // SUCCESS - Show confirmation and OTP input immediately
      debugPrint('[Login] SUCCESS! Updating UI to show confirmation');
      setState(() {
        _showOtpInput = true;
        _emailSent = true;
        _sentToEmail = email;
      });
      
      // Show a dialog for clear visibility
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: true,
          builder: (context) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF10B981), size: 28),
                SizedBox(width: 12),
                Text('Check Your Email'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('We sent a sign-in code to:'),
                const SizedBox(height: 8),
                Text(
                  email,
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                ),
                const SizedBox(height: 16),
                Text('Enter the code below to sign in.', style: TextStyle(color: Colors.grey[600])),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('GOT IT', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      }
      
      debugPrint('[Login] UI updated: _emailSent=$_emailSent, _showOtpInput=$_showOtpInput');
      
    } catch (e) {
      debugPrint('[Login] EXCEPTION caught: $e');
      if (!mounted) return;
      
      // AuthProvider has already mapped this to something actionable.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.read<AuthProvider>().error ?? describeAuthError(e)),
          backgroundColor: Colors.red[700],
          duration: const Duration(seconds: 8),
        ),
      );
    }
    debugPrint('========== END LOGIN DEBUG ==========');
  }

  void _verifyOtp() async {
    if (_otpController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the code from your email')),
      );
      return;
    }

    // Supabase's email OTP length is a project setting and is not always 6 —
    // this project currently issues 8 characters. Hard-coding 6 here (and in
    // the field's maxLength) made the real code impossible to enter, so accept
    // the documented range and let the server reject a genuinely wrong code.
    final otp = _otpController.text.trim();
    if (otp.length < 6 || otp.length > 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That code does not look right — check your email')),
      );
      return;
    }

    try {
      debugPrint('[Login] Verifying OTP: ${_otpController.text}');
      await context.read<AuthProvider>().verifyOtp(
            _emailController.text.trim(),
            _otpController.text.trim(),
          );
      debugPrint('[Login] OTP verified successfully!');
      // If successful, AuthProvider will update and navigate automatically
    } catch (e) {
      debugPrint('[Login] OTP verification failed: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.read<AuthProvider>().error ?? describeAuthError(e)),
          backgroundColor: Colors.red[700],
          duration: const Duration(seconds: 8),
        ),
      );
    }
  }
  
  void _resendCode() async {
    setState(() {
      _emailSent = false;
    });
    _sendMagicLink();
  }

  void _signInWithGoogle() async {
    // Capture these before awaiting: AuthProvider.signInWithGoogle flips the
    // global isLoading flag, which makes the root Consumer in main.dart swap
    // this whole screen for a spinner and dispose our State. The messenger and
    // provider live above that Consumer, so grabbing them now keeps error
    // reporting working even after this widget unmounts.
    final messenger = ScaffoldMessenger.of(context);
    final auth = context.read<AuthProvider>();

    try {
      debugPrint('[Login] Starting Google sign-in...');
      await auth.signInWithGoogle();
      debugPrint('[Login] Google sign-in succeeded — main.dart will navigate.');
      // On success AuthProvider sets `user`; main.dart routes to HomeScreen.
    } catch (e) {
      debugPrint('[Login] Google sign-in failed: $e');
      messenger.showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Google sign-in failed. Please try again.'),
          backgroundColor: Colors.red[700],
          duration: const Duration(seconds: 6),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppTheme.navy,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Center(
                    child: Text(
                      'JW',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Times New Roman',
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  'JustWrite',
                  style: Theme.of(context).textTheme.displayLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Your thoughts, more structured',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.grey,
                  ),
                ),
                const SizedBox(height: 48),

                // Success message when email is sent
                if (_emailSent && _sentToEmail != null) ...[
                  Container(
                    padding: const EdgeInsets.all(20),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: const Color(0xFF10B981),
                        width: 2,
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_circle,
                            color: Color(0xFF10B981),
                            size: 40,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Check your email for confirmation',
                          style: TextStyle(
                            fontFamily: 'Times New Roman',
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF059669),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'We sent a sign-in code to:',
                          style: TextStyle(
                            fontFamily: 'Times New Roman',
                            fontSize: 14,
                            color: Colors.grey[700],
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _sentToEmail!,
                          style: const TextStyle(
                            fontFamily: 'Times New Roman',
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF047857),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Enter the code below to sign in',
                            style: TextStyle(
                              fontFamily: 'Times New Roman',
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey[800],
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Continue with Google — primary social sign-in. Hidden once
                // the user is entering an email OTP code to keep that step focused.
                if (!_showOtpInput) ...[
                  Consumer<AuthProvider>(
                    builder: (context, auth, _) {
                      return SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: auth.isLoading ? null : _signInWithGoogle,
                          icon: const GoogleLogo(size: 20),
                          label: const Text('Continue with Google'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.navy,
                            backgroundColor: Colors.white,
                            side: const BorderSide(color: AppTheme.greyLight, width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            textStyle: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),
                  // "or" divider between social and email sign-in
                  const Row(
                    children: [
                      Expanded(child: Divider(color: AppTheme.greyLight, thickness: 1)),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'OR',
                          style: TextStyle(
                            color: AppTheme.grey,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                      Expanded(child: Divider(color: AppTheme.greyLight, thickness: 1)),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],

                // Email input (always visible, but disabled after sending)
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  enabled: !_showOtpInput,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _showOtpInput ? null : _sendMagicLink(),
                  decoration: InputDecoration(
                    hintText: 'Enter your email',
                    prefixIcon: const Icon(Icons.email_outlined, size: 20),
                    fillColor: _showOtpInput ? AppTheme.greyLight.withValues(alpha: 0.5) : null,
                  ),
                ),
                const SizedBox(height: 16),

                // OTP input (only after email sent)
                if (_showOtpInput) ...[
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 10, // server-issued OTP length varies by project
                    autofocus: true,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _verifyOtp(),
                    style: const TextStyle(
                      fontSize: 24,
                      letterSpacing: 8,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                    decoration: const InputDecoration(
                      hintText: '000000',
                      counterText: '',
                      hintStyle: TextStyle(
                        fontSize: 24,
                        letterSpacing: 8,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Main action button
                Consumer<AuthProvider>(
                  builder: (context, auth, _) {
                    return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: auth.isLoading
                            ? null
                            : (_showOtpInput ? _verifyOtp : _sendMagicLink),
                        child: auth.isLoading
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(_showOtpInput ? 'VERIFY CODE' : 'SEND LOGIN LINK'),
                      ),
                    );
                  },
                ),

                // The code entry is otherwise only reachable after a successful
                // send. When the mail provider rate-limits us the send fails,
                // which would strand anyone who already holds a valid code.
                if (!_showOtpInput) ...[
                  TextButton(
                    onPressed: () => setState(() {
                      _showOtpInput = true;
                      _sentToEmail = _emailController.text.trim();
                    }),
                    child: const Text(
                      'Already have a code?',
                      style: TextStyle(color: AppTheme.grey),
                    ),
                  ),
                ],

                // Change email / Resend code options
                if (_showOtpInput) ...[
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _showOtpInput = false;
                            _emailSent = false;
                            _sentToEmail = null;
                          });
                          _otpController.clear();
                        },
                        child: const Text('Change Email', style: TextStyle(color: AppTheme.grey)),
                      ),
                      const SizedBox(width: 16),
                      Consumer<AuthProvider>(
                        builder: (context, auth, _) {
                          return TextButton(
                            onPressed: auth.isLoading ? null : _resendCode,
                            child: Text(
                              'Resend Code',
                              style: TextStyle(
                                color: auth.isLoading ? AppTheme.grey : AppTheme.navy,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 48),
                
                // Tagline
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.greyLight.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.edit_note_outlined,
                        size: 32,
                        color: AppTheme.navy,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Write freely. Get clarity.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.navy,
                          fontWeight: FontWeight.w500,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'AI-powered journaling & task management',
                        style: Theme.of(context).textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ],
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
