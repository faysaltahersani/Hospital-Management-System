import { clearAuthSession, getStoredRefreshToken, getStoredToken, redirectToLogin, storeAuthSession } from "./auth";

const getDefaultApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:5000/api/v1";
  }

  return `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl();

// Prevent multiple simultaneous refresh requests
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

async function tryRefreshToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body = await response.json();
    const newAccessToken = body?.data?.accessToken || body?.accessToken;
    const newRefreshToken = body?.data?.refreshToken || body?.refreshToken;
    const user = body?.data?.user;

    if (newAccessToken) {
      storeAuthSession({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || refreshToken,
        user,
      });
      return newAccessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      cache: options.cache || "no-store",
      headers,
    });
  } catch (_err) {
    throw new Error(`Cannot connect to backend at ${API_BASE_URL}`);
  }

  // Handle 401 — try token refresh first before logging out
  if (response.status === 401 && token && path !== "/auth/login" && path !== "/auth/refresh") {
    if (!isRefreshing) {
      isRefreshing = true;

      const newToken = await tryRefreshToken();
      isRefreshing = false;

      if (newToken) {
        // Notify all waiting requests about the new token
        onTokenRefreshed(newToken);

        // Retry the original request with the new token
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
        try {
          const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            cache: options.cache || "no-store",
            headers: retryHeaders,
          });

          const retryText = await retryResponse.text();
          let retryBody = null;
          try {
            retryBody = retryText ? JSON.parse(retryText) : null;
          } catch {
            retryBody = null;
          }

          if (!retryResponse.ok) {
            throw new Error(retryBody?.message || "Request failed");
          }

          return retryBody;
        } catch (err) {
          throw err;
        }
      } else {
        // Refresh failed — logout
        clearAuthSession();
        redirectToLogin();
        throw new Error("Your session expired. Please log in again.");
      }
    } else {
      // Another request is already refreshing — wait for new token
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          try {
            const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
            const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
              ...options,
              cache: options.cache || "no-store",
              headers: retryHeaders,
            });

            const retryText = await retryResponse.text();
            let retryBody = null;
            try {
              retryBody = retryText ? JSON.parse(retryText) : null;
            } catch {
              retryBody = null;
            }

            if (!retryResponse.ok) {
              reject(new Error(retryBody?.message || "Request failed"));
            } else {
              resolve(retryBody);
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  }

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.message || "Request failed");
  }

  return body;
}

/**
 * Sends a FormData body (file uploads).
 *
 * `apiRequest` sets `Content-Type: application/json`, which breaks multipart: the
 * browser has to set the header itself so it can include the boundary. So the
 * header is deliberately omitted here, and only Authorization is added.
 */
export async function apiUpload(path, formData, options = {}) {
  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };
  delete headers["Content-Type"];

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const send = (authHeaders) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "POST",
      body: formData,
      cache: "no-store",
      headers: authHeaders,
    });

  let response;
  try {
    response = await send(headers);
  } catch (_err) {
    throw new Error(`Cannot connect to backend at ${API_BASE_URL}`);
  }

  if (response.status === 401 && token) {
    const newToken = await tryRefreshToken();

    if (!newToken) {
      clearAuthSession();
      redirectToLogin();
      throw new Error("Your session expired. Please log in again.");
    }

    response = await send({ ...headers, Authorization: `Bearer ${newToken}` });
  }

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.message || "Upload failed");
  }

  return body;
}

/**
 * Fetches a binary response (a medical image, a PDF) as a Blob.
 *
 * Medical files are not web-served: they come through an authenticated endpoint,
 * so an <img src="..."> cannot reach them — the browser would send no token. The
 * bytes are fetched here with the Authorization header and handed back as a Blob
 * for the caller to turn into an object URL.
 *
 * The caller owns the URL it creates and must revokeObjectURL when done, or the
 * image stays in memory for the life of the tab.
 */
export async function apiBlob(path, options = {}) {
  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const request = (authHeaders) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      cache: options.cache || "no-store",
      headers: authHeaders,
    });

  let response;
  try {
    response = await request(headers);
  } catch (_err) {
    throw new Error(`Cannot connect to backend at ${API_BASE_URL}`);
  }

  // One refresh-and-retry, matching apiRequest, so an expired token does not
  // present itself to the user as a broken image.
  if (response.status === 401 && token) {
    const newToken = await tryRefreshToken();

    if (!newToken) {
      clearAuthSession();
      redirectToLogin();
      throw new Error("Your session expired. Please log in again.");
    }

    response = await request({ ...headers, Authorization: `Bearer ${newToken}` });
  }

  if (!response.ok) {
    // An error response is JSON even on a binary endpoint, so the real message
    // is surfaced rather than a generic failure.
    let message = "Could not load the file";
    try {
      const body = await response.json();
      message = body?.message || message;
    } catch {
      /* not JSON; keep the default */
    }
    throw new Error(message);
  }

  return response.blob();
}
