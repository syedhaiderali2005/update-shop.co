const API_BASE = import.meta.env["VITE_API_URL"] || "http://localhost:4000/api";
type ApiOptions = {
  token?: string;
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
};
// API payloads vary by endpoint; callers may supply a concrete response type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiRequest<T = any>(
  path: string,
  { token, ...options }: ApiOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `API request failed (${response.status})`);
  return payload as T;
}
