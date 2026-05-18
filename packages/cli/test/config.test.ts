import { describe, it, expect } from "vitest";
import { apiFetch, HttpError, BASE_URL } from "../src/config.js";

function mockFetch(handlers: Array<(url: string, init: RequestInit) => Response | Promise<Response>>): typeof fetch {
  let idx = 0;
  return ((url, init) => {
    const h = handlers[idx++];
    if (!h) throw new Error(`unexpected fetch #${idx}: ${url}`);
    return Promise.resolve(h(String(url), init ?? {}));
  }) as typeof fetch;
}

describe("apiFetch", () => {
  it("prepends BASE_URL on absolute paths", async () => {
    const fetchImpl = mockFetch([
      (url) => {
        expect(url).toBe(`${BASE_URL}/v1/me`);
        return new Response("{}", { status: 200 });
      },
    ]);
    await apiFetch("/v1/me", { fetchImpl });
  });

  it("uses the URL as-is when not starting with /", async () => {
    const fetchImpl = mockFetch([
      (url) => {
        expect(url).toBe("https://example.com/api");
        return new Response("{}", { status: 200 });
      },
    ]);
    await apiFetch("https://example.com/api", { fetchImpl });
  });

  it("JSON-serializes object bodies and sets Content-Type", async () => {
    const fetchImpl = mockFetch([
      (_url, init) => {
        expect(init.body).toBe(JSON.stringify({ x: 1 }));
        expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
        return new Response("{}", { status: 200 });
      },
    ]);
    await apiFetch("/x", { method: "POST", body: { x: 1 }, fetchImpl });
  });

  it("throws HttpError on non-2xx", async () => {
    const fetchImpl = mockFetch([
      () => new Response("bad", { status: 400 }),
    ]);
    await expect(apiFetch("/x", { fetchImpl })).rejects.toBeInstanceOf(HttpError);
  });

  it("returns the response when raw=true even on non-2xx", async () => {
    const fetchImpl = mockFetch([
      () => new Response("bad", { status: 400 }),
    ]);
    const res = await apiFetch("/x", { raw: true, fetchImpl });
    expect(res.status).toBe(400);
  });
});
