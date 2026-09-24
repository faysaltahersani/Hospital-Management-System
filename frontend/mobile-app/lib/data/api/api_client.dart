import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';

/// Anything the API layer can fail with, surfaced to the UI as a readable
/// message rather than a raw exception.
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  bool get isUnauthorized => statusCode == 401 || statusCode == 403;

  @override
  String toString() => message;
}

/// The parsed `{ success, message, data, meta }` envelope the HMS backend
/// returns from every endpoint.
class ApiResult {
  const ApiResult({required this.data, this.message = '', this.meta});

  final dynamic data;
  final String message;
  final Map<String, dynamic>? meta;

  /// `data` when the endpoint returns a single object.
  Map<String, dynamic> get asMap =>
      data is Map<String, dynamic> ? data as Map<String, dynamic> : const {};

  /// `data` when the endpoint returns a list (list endpoints put the array
  /// directly in `data` and paging info in `meta.pagination`).
  List<Map<String, dynamic>> get asList {
    if (data is List) {
      return (data as List).whereType<Map<String, dynamic>>().toList();
    }
    // Some endpoints nest under `items`.
    final nested = asMap['items'];
    if (nested is List) {
      return nested.whereType<Map<String, dynamic>>().toList();
    }
    return const [];
  }
}

/// Thin JSON client over the HMS API: bearer auth, envelope unwrapping and
/// error normalisation. Only used when `AppConfig.dataSource == live`.
class ApiClient {
  ApiClient({String? baseUrl, http.Client? client})
      : baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  String? _accessToken;
  String? _refreshToken;

  void setTokens({String? accessToken, String? refreshToken}) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  void clearTokens() {
    _accessToken = null;
    _refreshToken = null;
  }

  bool get isAuthenticated => (_accessToken ?? '').isNotEmpty;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if ((_accessToken ?? '').isNotEmpty)
          'Authorization': 'Bearer $_accessToken',
      };

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final cleaned = query?.entries
        .where((e) => e.value != null && '${e.value}'.isNotEmpty)
        .map((e) => MapEntry(e.key, '${e.value}'));

    return Uri.parse('$baseUrl$path').replace(
      queryParameters: cleaned == null || cleaned.isEmpty
          ? null
          : Map.fromEntries(cleaned),
    );
  }

  Future<ApiResult> get(String path, {Map<String, dynamic>? query}) =>
      _send(() => _client.get(_uri(path, query), headers: _headers));

  Future<ApiResult> post(String path, {Object? body}) => _send(
        () => _client.post(
          _uri(path),
          headers: _headers,
          body: body == null ? null : jsonEncode(body),
        ),
      );

  Future<ApiResult> patch(String path, {Object? body}) => _send(
        () => _client.patch(
          _uri(path),
          headers: _headers,
          body: body == null ? null : jsonEncode(body),
        ),
      );

  Future<ApiResult> delete(String path) =>
      _send(() => _client.delete(_uri(path), headers: _headers));

  /// Runs [request], retrying once through `/auth/refresh` on a 401.
  Future<ApiResult> _send(
    Future<http.Response> Function() request, {
    bool allowRetry = true,
  }) async {
    http.Response response;
    try {
      response = await request().timeout(AppConfig.requestTimeout);
    } on TimeoutException {
      throw const ApiException(
        'The server took too long to respond. Check that the HMS backend is '
        'running and reachable.',
      );
    } on SocketException {
      throw ApiException(
        'Could not reach the server at $baseUrl. On an emulator the host is '
        '10.0.2.2, not localhost — see AppConfig.apiBaseUrl.',
      );
    } on http.ClientException catch (e) {
      throw ApiException('Network error: ${e.message}');
    }

    if (response.statusCode == 401 && allowRetry && _refreshToken != null) {
      if (await _tryRefresh()) {
        return _send(request, allowRetry: false);
      }
    }

    return _parse(response);
  }

  Future<bool> _tryRefresh() async {
    try {
      final response = await _client
          .post(
            _uri('/auth/refresh'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refresh_token': _refreshToken}),
          )
          .timeout(AppConfig.requestTimeout);

      if (response.statusCode >= 400) return false;

      final body = jsonDecode(response.body);
      if (body is! Map<String, dynamic>) return false;
      final data = body['data'];
      if (data is! Map<String, dynamic>) return false;

      _accessToken = (data['accessToken'] ?? data['access_token'])?.toString();
      _refreshToken =
          (data['refreshToken'] ?? data['refresh_token'])?.toString() ??
              _refreshToken;
      return (_accessToken ?? '').isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  ApiResult _parse(http.Response response) {
    // 204 No Content — nothing to decode.
    if (response.statusCode == 204 || response.body.isEmpty) {
      return const ApiResult(data: null);
    }

    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      throw ApiException(
        'Unexpected response from the server (HTTP ${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }

    final map = body is Map<String, dynamic> ? body : <String, dynamic>{};
    final message = (map['message'] ?? '').toString();

    if (response.statusCode >= 400 || map['success'] == false) {
      throw ApiException(
        message.isNotEmpty
            ? message
            : 'Request failed (HTTP ${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }

    return ApiResult(
      data: map.containsKey('data') ? map['data'] : body,
      message: message,
      meta: map['meta'] is Map<String, dynamic>
          ? map['meta'] as Map<String, dynamic>
          : null,
    );
  }

  void dispose() => _client.close();
}
