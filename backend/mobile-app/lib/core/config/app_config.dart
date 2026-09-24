import '../../data/models/user.dart';

/// Where the app reads its data from.
enum DataSource {
  /// Seeded in-memory data matching the E-Medical prototype. Runs standalone —
  /// no backend, no network, no login required.
  mock,

  /// The live Hospital Management System REST API.
  live,
}

/// Single switch for the whole app.
///
/// To point the app at the real backend:
///   1. Change [dataSource] to `DataSource.live`.
///   2. Make sure [apiBaseUrl] can be reached from the device (see below).
///   3. Start the backend: `npm run dev` in Hospital-Managment-System-Back-End.
class AppConfig {
  AppConfig._();

  static const DataSource dataSource = DataSource.mock;

  /// The HMS API root.
  ///
  /// `10.0.2.2` is the Android emulator's alias for the host machine's
  /// `localhost`, so this reaches the backend running on port 5000 on your PC.
  ///
  /// Other targets:
  ///   • Physical device on the same Wi-Fi → 'http://<your-LAN-IP>:5000/api/v1'
  ///   • Genymotion emulator             → 'http://10.0.3.2:5000/api/v1'
  ///   • Desktop / web build             → 'http://localhost:5000/api/v1'
  static const String apiBaseUrl = 'http://10.0.2.2:5000/api/v1';

  /// Roles offered on the sign-in screen, in order.
  ///
  /// The admin app is still built and tested — it is simply not offered as a
  /// login. Add [UserRole.admin] back to this list to bring it in; nothing else
  /// needs changing.
  static const List<UserRole> enabledRoles = [
    UserRole.patient,
    UserRole.doctor,
  ];

  static const Duration requestTimeout = Duration(seconds: 15);

  static bool get isLive => dataSource == DataSource.live;
  static bool get isMock => dataSource == DataSource.mock;

  /// Demo credentials pre-filled on the sign-in screen in mock mode. They are
  /// only placeholders — mock mode accepts anything.
  static const String demoPatientEmail = 'rahim.ahmed@example.com';
  static const String demoDoctorEmail = 'nabila.karim@example.com';
  static const String demoAdminEmail = 'farhana.rahman@example.com';
  static const String demoPassword = 'password123';
}
