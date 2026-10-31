// The one response shape every API route returns (apiOk / apiError in
// lib/http.ts) and every client reads. Free of server imports so client
// components can use it. `data` / `error` are declared on both branches (as
// `undefined` on the other) so callers can read them without narrowing first.
export type ApiEnvelope<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: string; details?: unknown; data?: undefined };

// Parses a fetch Response as an ApiEnvelope; null when the body isn't JSON.
export async function readApiEnvelope<T = unknown>(response: Response): Promise<ApiEnvelope<T> | null> {
  return (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
}
