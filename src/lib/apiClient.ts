const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const REFRESH_STORAGE_KEY = "kr_refresh_token";

// Access tokens are short-lived (15m server-side) and only ever kept in memory —
// never localStorage — so they don't linger if the tab is compromised. The refresh
// token is opaque and long-lived, so it's fine (and necessary) to persist it across
// reloads; it's rotated on every use (see /api/auth/refresh).
let accessToken: string | null = null;
let refreshToken: string | null = localStorage.getItem(REFRESH_STORAGE_KEY);

// Concurrent 401s during a refresh should all wait on the same in-flight refresh
// call rather than each racing their own — the refresh token is rotated, so a
// second call would invalidate the first's replacement token.
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem(REFRESH_STORAGE_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(REFRESH_STORAGE_KEY);
}

export function hasRefreshToken(): boolean {
  return Boolean(refreshToken);
}

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const result = await res.json();

setTokens({
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
});
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Exposed so auth.tsx can silently restore a session on app load, before any 401 would trigger it. */
export const refreshSession = refreshOnce;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown; // plain object — JSON.stringify'd automatically (pass a string/FormData through untouched)
  skipAuth?: boolean; // for endpoints like /login, /register-* that don't send a token
  skipRefresh?: boolean; // avoid infinite loops when refresh itself 401s
};

/**
 * Fetch wrapper for the Klasroom API: attaches the access token, JSON-encodes plain
 * object bodies, and on a 401 transparently refreshes and retries the request once.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, skipAuth, skipRefresh, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
    if (!isFormData && body !== undefined) finalHeaders["Content-Type"] = "application/json";
    if (!skipAuth && accessToken) finalHeaders["Authorization"] = `Bearer ${accessToken}`;

    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuth && !skipRefresh && refreshToken) {
    const refreshed = await refreshOnce();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
    payload?.message ??
    payload?.error ??
    `Request failed (${res.status})`,
    res.status,
    payload?.errors ?? payload?.details
);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T = unknown>(path: string, options?: ApiFetchOptions) => apiFetch<T>(path, { ...options, method: "GET" });
export const apiPost = <T = unknown>(path: string, body?: unknown, options?: ApiFetchOptions) => apiFetch<T>(path, { ...options, method: "POST", body });
export const apiPatch = <T = unknown>(path: string, body?: unknown, options?: ApiFetchOptions) => apiFetch<T>(path, { ...options, method: "PATCH", body });
export const apiPut = <T = unknown>(path: string, body?: unknown, options?: ApiFetchOptions) => apiFetch<T>(path, { ...options, method: "PUT", body });
export const apiDelete = <T = unknown>(path: string, options?: ApiFetchOptions) => apiFetch<T>(path, { ...options, method: "DELETE" });
