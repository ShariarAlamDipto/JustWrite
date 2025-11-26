import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  bool _showOtpInput = false;
  final _otpController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _sendMagicLink() async {
    if (_emailController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email')),
      );
      return;
    }

    try {
      await context.read<AuthProvider>().sendMagicLink(_emailController.text);
      if (!mounted) return;
      setState(() => _showOtpInput = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check your email for the magic link')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  void _verifyOtp() async {
    if (_otpController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the OTP')),
      );
      return;
    }

    try {
      await context.read<AuthProvider>().verifyOtp(
            _emailController.text,
            _otpController.text,
          );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo/Title
              Text(
                '✍️ JUSTWRITE',
                style: Theme.of(context).textTheme.displayMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'AI-Powered Journaling',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF00ffd5),
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),

              // Email Input
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                enabled: !_showOtpInput,
                decoration: const InputDecoration(
                  hintText: 'Enter your email',
                  prefixIcon: Icon(Icons.email),
                ),
              ),
              const SizedBox(height: 16),

              // OTP Input (if shown)
              if (_showOtpInput) ...[
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: const InputDecoration(
                    hintText: 'Enter OTP from email',
                    prefixIcon: Icon(Icons.security),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Action Button
              Consumer<AuthProvider>(
                builder: (context, authProvider, _) {
                  return SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading
                          ? null
                          : (_showOtpInput ? _verifyOtp : _sendMagicLink),
                      child: authProvider.isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Color(0xFF0a0e27),
                                ),
                              ),
                            )
                          : Text(
                              _showOtpInput ? 'VERIFY OTP' : 'SEND MAGIC LINK',
                            ),
                    ),
                  );
                },
              ),

              if (_showOtpInput) ...[
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    setState(() => _showOtpInput = false);
                    _otpController.clear();
                  },
                  child: const Text('Back'),
                ),
              ],

              const SizedBox(height: 48),
              Text(
                '📝 Create, distill, and conquer your day\nwith AI-powered journaling.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: const Color(0xFF7a7a7a)),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
