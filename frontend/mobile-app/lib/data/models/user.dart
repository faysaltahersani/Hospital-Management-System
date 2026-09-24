import 'json_utils.dart';

enum UserRole { patient, doctor, admin }

extension UserRoleX on UserRole {
  String get label {
    switch (this) {
      case UserRole.patient:
        return 'Patient';
      case UserRole.doctor:
        return 'Doctor';
      case UserRole.admin:
        return 'Admin';
    }
  }

  /// How the HMS `users.role` column spells it.
  String get apiValue {
    switch (this) {
      case UserRole.patient:
        return 'patient';
      case UserRole.doctor:
        return 'doctor';
      case UserRole.admin:
        return 'admin';
    }
  }

  /// True for the staff-side apps, which share the navy chrome.
  bool get isStaff => this != UserRole.patient;

  static UserRole fromApi(String? value) {
    final role = (value ?? '').toLowerCase();
    if (role.contains('admin') || role.contains('super')) return UserRole.admin;
    if (role.contains('doctor') || role.contains('consultant')) {
      return UserRole.doctor;
    }
    return UserRole.patient;
  }
}

/// The signed-in person. [identifier] is the UHID for patients and the BMDC
/// registration number for doctors.
class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.role,
    required this.identifier,
    this.subtitle = '',
    this.email = '',
  });

  final String id;
  final String name;
  final UserRole role;
  final String identifier;
  final String subtitle;
  final String email;

  factory AppUser.fromJson(Map<String, dynamic> json, {UserRole? role}) {
    final resolved = role ?? UserRoleX.fromApi(Json.strOrNull(json, ['role']));
    final first = Json.str(json, ['first_name', 'firstName']);
    final last = Json.str(json, ['last_name', 'lastName']);
    final combined = [first, last].where((p) => p.isNotEmpty).join(' ');

    return AppUser(
      id: Json.str(json, ['id', 'user_id', 'uuid']),
      name: combined.isNotEmpty
          ? combined
          : Json.str(json, ['name', 'full_name', 'fullName'], fallback: '—'),
      role: resolved,
      identifier: Json.str(
        json,
        ['uhid', 'registration_no', 'registrationNo', 'employee_code'],
      ),
      subtitle: Json.str(json, ['department', 'specialization', 'designation']),
      email: Json.str(json, ['email']),
    );
  }
}

class FamilyMember {
  const FamilyMember({
    required this.id,
    required this.name,
    required this.relation,
    this.uhid = '',
  });

  final String id;
  final String name;
  final String relation;

  /// Family members are registered patients in their own right, so they carry
  /// their own hospital ID — that is what their records are filed under.
  final String uhid;

  factory FamilyMember.fromJson(Map<String, dynamic> json) => FamilyMember(
        id: Json.str(json, ['id']),
        name: Json.str(json, ['name', 'full_name']),
        relation: Json.str(json, ['relation', 'relationship'],
            fallback: 'Family member'),
        uhid: Json.str(json, ['uhid', 'patient_code']),
      );
}

/// Someone whose records the signed-in patient can view — themselves, or a
/// family member they manage. Drives the profile switcher on the Reports tab.
class CareProfile {
  const CareProfile({
    required this.name,
    required this.uhid,
    required this.relation,
    this.isSelf = false,
  });

  final String name;
  final String uhid;

  /// `'You'` for the account holder, otherwise `'Spouse'`, `'Son'`, …
  final String relation;
  final bool isSelf;

  /// Short label for the switcher chip.
  String get shortLabel => isSelf ? 'You' : name.split(' ').first;

  factory CareProfile.self(AppUser user) => CareProfile(
        name: user.name,
        uhid: user.identifier,
        relation: 'You',
        isSelf: true,
      );

  factory CareProfile.from(FamilyMember member) => CareProfile(
        name: member.name,
        uhid: member.uhid,
        relation: member.relation,
      );
}

/// Result of a successful sign-in.
class AuthSession {
  const AuthSession({
    required this.user,
    this.accessToken = '',
    this.refreshToken = '',
  });

  final AppUser user;
  final String accessToken;
  final String refreshToken;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final userJson = Json.map(json, ['user']) ?? const <String, dynamic>{};
    return AuthSession(
      user: AppUser.fromJson(userJson),
      accessToken: Json.str(json, ['accessToken', 'access_token']),
      refreshToken: Json.str(json, ['refreshToken', 'refresh_token']),
    );
  }
}
