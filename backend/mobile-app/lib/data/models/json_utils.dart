/// Tolerant JSON readers.
///
/// The HMS backend mixes `snake_case` (columns, request bodies) with
/// `camelCase` (auth tokens), so every getter accepts a list of candidate keys
/// and returns the first one present.
class Json {
  Json._();

  static Object? _pick(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      final value = json[key];
      if (value != null) return value;
    }
    return null;
  }

  static String str(
    Map<String, dynamic> json,
    List<String> keys, {
    String fallback = '',
  }) {
    final value = _pick(json, keys);
    if (value == null) return fallback;
    return value.toString();
  }

  static String? strOrNull(Map<String, dynamic> json, List<String> keys) {
    final value = _pick(json, keys);
    return value?.toString();
  }

  static int intVal(
    Map<String, dynamic> json,
    List<String> keys, {
    int fallback = 0,
  }) {
    final value = _pick(json, keys);
    if (value == null) return fallback;
    if (value is num) return value.toInt();
    return int.tryParse(value.toString()) ?? fallback;
  }

  static double dbl(
    Map<String, dynamic> json,
    List<String> keys, {
    double fallback = 0,
  }) {
    final value = _pick(json, keys);
    if (value == null) return fallback;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? fallback;
  }

  static bool boolVal(
    Map<String, dynamic> json,
    List<String> keys, {
    bool fallback = false,
  }) {
    final value = _pick(json, keys);
    if (value == null) return fallback;
    if (value is bool) return value;
    final text = value.toString().toLowerCase();
    return text == 'true' || text == '1' || text == 'yes';
  }

  static Map<String, dynamic>? map(
    Map<String, dynamic> json,
    List<String> keys,
  ) {
    final value = _pick(json, keys);
    return value is Map<String, dynamic> ? value : null;
  }

  static List<Map<String, dynamic>> list(
    Map<String, dynamic> json,
    List<String> keys,
  ) {
    final value = _pick(json, keys);
    if (value is! List) return const [];
    return value.whereType<Map<String, dynamic>>().toList();
  }
}

const _monthNames = <String>[
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// `DateTime(2026, 8, 22)` → `Aug 22`, matching how dates read elsewhere in
/// the app.
String formatDayMonth(DateTime date) =>
    '${_monthNames[date.month - 1]} ${date.day.toString().padLeft(2, '0')}';

/// `DateTime(2026, 8, 22)` → `Sat, 22 Aug 2026` — used where a date needs to
/// be unambiguous, like the leave request form.
String formatFullDate(DateTime date) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return '${weekdays[date.weekday - 1]}, ${date.day} '
      '${_monthNames[date.month - 1]} ${date.year}';
}

/// Tolerant ISO-8601 parse; null when the value is missing or unparseable.
DateTime? parseDate(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  return DateTime.tryParse(value.trim());
}

/// Shortens large amounts for stat tiles, using the lakh/crore units the
/// hospital's finance reports are read in: `482000` → `৳4.8L`.
String formatTakaCompact(num amount) {
  final value = amount.abs();
  final sign = amount < 0 ? '-' : '';

  String trim(num scaled) =>
      scaled.toStringAsFixed(scaled % 1 == 0 ? 0 : 1);

  if (value >= 10000000) return '$sign৳${trim(value / 10000000)}Cr';
  if (value >= 100000) return '$sign৳${trim(value / 100000)}L';
  if (value >= 1000) return '$sign৳${trim(value / 1000)}k';
  return formatTaka(amount);
}

/// Formats an integer as the app's taka amount, e.g. `2450` → `৳2,450`.
String formatTaka(num amount) {
  final whole = amount.round().abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) buffer.write(',');
    buffer.write(whole[i]);
  }
  return '${amount < 0 ? '-' : ''}৳$buffer';
}
