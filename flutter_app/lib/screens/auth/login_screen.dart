import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

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
      
      // Also show a snackbar for extra visibility
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Confirmation code sent! Check your email.'),
          backgroundColor: Color(0xFF10B981),
          duration: Duration(seconds: 3),
        ),
      );
      
      debugPrint('[Login] UI updated: _emailSent=$_emailSent, _showOtpInput=$_showOtpInput');
      
    } catch (e) {
      debugPrint('[Login] EXCEPTION caught: $e');
      if (!mounted) return;
      
      String errorMessage = 'Failed to send confirmation link.';
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('rate') || errorStr.contains('limit')) {
        errorMessage = 'Too many attempts. Please wait a moment.';
      } else if (errorStr.contains('network') || errorStr.contains('connection') || errorStr.contains('socket')) {
        errorMessage = 'Network error. Check your internet connection.';
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red[700],
        ),
      );
    }
    debugPrint('========== END LOGIN DEBUG ==========');
  }

  void _verifyOtp() async {
    if (_otpController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit code')),
      );
      return;
    }
    
    if (_otpController.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Code must be 6 digits')),
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
      String errorMessage = 'Invalid or expired code. Please try again.';
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('expired')) {
        errorMessage = 'Code expired. Please request a new one.';
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red[700],
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
                          'Email Sent Successfully!',
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
                          'We sent a 6-digit code to:',
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
                    maxLength: 6,
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
