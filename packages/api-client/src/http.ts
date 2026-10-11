/**
 * How both apps talk HTTP to the API: errors, timeouts, query strings and
 * JSON parsing, written once. Each app still chooses its transport (the
 * website calls fetch; the app also answers from its offline download), but
 * every request goes through these helpers.
 */

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Error from a failed API call, carrying the backend's own explanation. */
export class ApiError extends Error {
  status: number;
  /** The backend's `detail` — e.g. why a date is out of range. */
  detail: string | undefined;
  /** The request path (without the base URL). */
  path: string;

  constructor(status: number, detail: string | undefined, path: string, message?: string) {
    super(message ?? (detail ? `API ${status}: ${detail}` : `API ${status}: ${path}`));
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.path = path;
  }
}

/**
 * The server could not be reached (offline, DNS, TLS, CORS, connection reset).
 * A `TypeError`, as `fetch()` itself rejects with, so code that already treats
 * `TypeError` as "no connection" keeps working.
 */
export class NetworkError extends TypeError {
  path: string;
  constructor(path: string, cause?: unknown, message?: string) {
    super(message ?? `Network error: ${path}`, cause === undefined ? undefined : { cause });
    this.name = "NetworkError";
    this.path = path;
  }
}

/** No response arrived within the timeout. Also a {@link NetworkError}. */
export class TimeoutError extends NetworkError {
  timeoutMs: number;
  constructor(path: string, timeoutMs: number) {
    super(path, undefined, `Timed out after ${timeoutMs} ms: ${path}`);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * The backend's explanation from an error response: FastAPI's `detail` string,
 * or the first message of a validation error list.
 */
export async function errorDetail(res: Response): Promise<string | undefined> {
  try {
    const body = await res.clone().json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && typeof body.detail[0]?.msg === "string") return body.detail[0].msg;
  } catch {
    /* non-JSON error body */
  }
  return undefined;
}

/** An {@link ApiError} for a non-OK response, with the backend's `detail`. */
export async function apiErrorFrom(res: Response, path: string): Promise<ApiError> {
  return new ApiError(res.status, await errorDetail(res), path);
}

/** True for errors that mean "could not reach the server" rather than "the server said no". */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

// ─── Timeouts ─────────────────────────────────────────────────────────────────

/**
 * How long a request may wait for its response. Matches the API proxy's
 * `proxy_read_timeout` (apps/api/deploy/nginx-*.conf): a request the server is
 * still answering is never cut short, but a hung connection (common on mobile
 * networks, where fetch has no timeout of its own) does end.
 */
export const DEFAULT_TIMEOUT_MS = 120_000;

export interface RequestOptions extends RequestInit {
  /** Milliseconds to wait for the response headers; `null` waits forever. */
  timeoutMs?: number | null;
}

/**
 * `fetch` with a timeout, and with "could not connect" turned into a
 * {@link NetworkError}. A caller's own `signal` still aborts the request with
 * the usual `AbortError`, so cancelled queries stay cancelled, not failed.
 */
export async function fetchWithTimeout(url: string, path: string, options: RequestOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: callerSignal, ...init } = options;
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }
  const timer =
    timeoutMs == null
      ? undefined
      : setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut && timeoutMs != null) throw new TimeoutError(path, timeoutMs);
    if (callerSignal?.aborted) throw error;
    if (error instanceof TypeError) throw new NetworkError(path, error);
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
}

/** GET (or any method) a JSON endpoint: timeout, error mapping and parsing in one. */
export async function requestJson<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetchWithTimeout(`${baseUrl}${path}`, path, options);
  if (!res.ok) throw await apiErrorFrom(res, path);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Query strings ────────────────────────────────────────────────────────────

export type QueryValue = string | number | boolean | Date | null | undefined;

/**
 * Query parameters in the order given, leaving out `null`/`undefined` (an
 * optional field the caller did not set is not sent). Dates are sent as ISO
 * strings, booleans as `true`/`false`.
 */
export function queryParams(params: Record<string, QueryValue | readonly QueryValue[]>): URLSearchParams {
  const out = new URLSearchParams();
  const put = (key: string, value: QueryValue) => {
    if (value == null) return;
    out.append(key, value instanceof Date ? value.toISOString() : String(value));
  };
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const v of value) put(key, v);
    else put(key, value as QueryValue);
  }
  return out;
}

/** `path?query` (or `path&query` when the path already has one); unchanged when there is nothing to add. */
export function withQuery(path: string, params: Record<string, QueryValue | readonly QueryValue[]> | URLSearchParams): string {
  const qs = (params instanceof URLSearchParams ? params : queryParams(params)).toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}
