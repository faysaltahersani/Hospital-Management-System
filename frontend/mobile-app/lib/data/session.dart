import 'package:flutter/foundation.dart';

import '../core/config/app_config.dart';
import 'api/api_client.dart';
import 'models/models.dart';
import 'repositories/api_repositories.dart';
import 'repositories/mock_repositories.dart';
import 'repositories/repositories.dart';

/// Owns the signed-in user and hands out the repositories wired to whichever
/// [DataSource] `AppConfig` selects. Everything above this layer is unaware of
/// whether it is talking to mock data or the live HMS backend.
class AppSession extends ChangeNotifier {
  AppSession() {
    if (AppConfig.isLive) {
      _client = ApiClient();
      _auth = ApiAuthRepository(_client!);
    } else {
      _auth = MockAuthRepository();
    }
  }

  ApiClient? _client;
  late final AuthRepository _auth;

  AppUser? _user;
  PatientRepository? _patient;
  DoctorRepository? _doctor;
  AdminRepository? _admin;

  bool _busy = false;
  bool _signedOut = false;
  String? _error;
  UserRole _lastRole = UserRole.patient;

  AppUser? get user => _user;
  bool get isSignedIn => _user != null;
  bool get busy => _busy;
  String? get error => _error;

  /// True right after logging out — drives the "You're logged out" screen.
  bool get showLoggedOutScreen => _signedOut;

  UserRole get role => _user?.role ?? _lastRole;

  /// Kept after sign-out so the logged-out screen keeps the doctor app's dark
  /// treatment instead of snapping back to the patient palette.
  UserRole get lastRole => _lastRole;

  PatientRepository get patients {
    final repo = _patient;
    if (repo == null) {
      throw StateError('Sign in as a patient before using PatientRepository.');
    }
    return repo;
  }

  DoctorRepository get doctors {
    final repo = _doctor;
    if (repo == null) {
      throw StateError('Sign in as a doctor before using DoctorRepository.');
    }
    return repo;
  }

  AdminRepository get admins {
    final repo = _admin;
    if (repo == null) {
      throw StateError('Sign in as an admin before using AdminRepository.');
    }
    return repo;
  }

  Future<bool> signIn({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();

    try {
      final session = await _auth.signIn(
        email: email,
        password: password,
        role: role,
      );

      // The backend decides the real role; mock mode honours the picker.
      final user = AppConfig.isLive
          ? session.user
          : AppUser(
              id: session.user.id,
              name: session.user.name,
              role: role,
              identifier: session.user.identifier,
              subtitle: session.user.subtitle,
              email: session.user.email,
            );

      _user = user;
      _lastRole = user.role;
      _buildRepositories(user);
      _signedOut = false;
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = 'Could not sign in. $e';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  void _buildRepositories(AppUser user) {
    final client = _client;
    if (AppConfig.isLive && client != null) {
      _patient = ApiPatientRepository(client, user: user);
      _doctor = ApiDoctorRepository(client, doctorId: user.id);
      _admin = ApiAdminRepository(client);
    } else {
      _patient = MockPatientRepository(user: user);
      _doctor = MockDoctorRepository();
      _admin = MockAdminRepository();
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) {
    return _auth.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
  }

  /// Ends the session but keeps the "logged out" screen visible, matching the
  /// prototype's sign-out flow.
  Future<void> signOut() async {
    try {
      await _auth.signOut();
    } catch (_) {
      // Signing out locally must succeed even if the server call fails.
    }
    _signedOut = true;
    _user = null;
    _patient = null;
    _doctor = null;
    _admin = null;
    notifyListeners();
  }

  /// "Log in again" — dismisses the logged-out screen and returns to sign-in.
  void returnToSignIn() {
    _signedOut = false;
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _client?.dispose();
    super.dispose();
  }
}
