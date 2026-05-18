import { homedir } from "node:os";
import { resolve } from "node:path";

export const BASE_URL = process.env["SHARON_BASE_URL"] ?? "http://127.0.0.1:4321";
export const TOKEN = process.env["SHARON_TOKEN"] ?? null;
export const SKILLS_DIR = resolve(homedir(), ".claude", "skills");

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = "HttpError";
  }
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  raw?: boolean;
  fetchImpl?: typeof fetch;
}

/**
 * Wrapper around fetch that:
 *   - prepends BASE_URL when path starts with /
 *   - adds Cookie: sharon_session=<TOKEN> when TOKEN set
 *   - JSON-serializes object bodies
 *   - throws HttpError on non-2xx (unless raw=true, then returns the Response)
 */
export async function apiFetch(path: string, opts: FetchOptions = {}): Promise<Response> {
  const f = opts.fetchImpl ?? fetch;
  const url = path.startsWith("/") ? `${BASE_URL}${path}` : path;
  const headers: Record<string, string> = { ...opts.headers };
  if (TOKEN) headers["Cookie"] = `sharon_session=${TOKEN}`;
  let body: string | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  }
  const init: RequestInit = { method: opts.method ?? "GET", headers };
  if (body !== undefined) init.body = body;
  const res = await f(url, init);
  if (!res.ok && !opts.raw) {
    const text = await res.text();
    throw new HttpError(res.status, text);
  }
  return res;
}
