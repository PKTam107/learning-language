import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(), exchangeCodeForSession: vi.fn(), createServerClient: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: auth.createServerClient }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ auth }) }));
import { updateSession } from "../src/lib/supabase/middleware";
import { GET } from "../src/app/(auth)/auth/callback/route";

const security = { nonce: "test-nonce", csp: "default-src 'self'" };
type CookiesAdapter = { setAll: (cookies: { name: string; value: string; options?: { path: string } }[]) => void };
let adapter: CookiesAdapter;

beforeEach(() => {
  vi.clearAllMocks();
  auth.createServerClient.mockImplementation((_url, _key, options) => {
    adapter = options.cookies;
    return { auth };
  });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("session middleware", () => {
  it("preserves every rotated cookie on redirects and strips auth query parameters", async () => {
    auth.getUser.mockImplementation(async () => {
      adapter.setAll([{ name: "sb-session.0", value: "new-token", options: { path: "/" } }]);
      adapter.setAll([{ name: "sb-session.1", value: "new-refresh", options: { path: "/" } }]);
      return { data: { user: { id: "user" } } };
    });
    const response = await updateSession(new NextRequest("https://app.test/login?code=secret&next=//evil.test"), security);
    expect(response.headers.get("location")).toBe("https://app.test/dashboard");
    expect(response.cookies.get("sb-session.0")?.value).toBe("new-token");
    expect(response.cookies.get("sb-session.1")?.value).toBe("new-refresh");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("passes refreshed request cookies to server rendering", async () => {
    auth.getUser.mockImplementation(async () => {
      adapter.setAll([{ name: "sb-session", value: "rotated" }]);
      return { data: { user: { id: "user" } } };
    });
    const response = await updateSession(new NextRequest("https://app.test/dashboard"), security);
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-session=rotated");
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe("test-nonce");
    expect(response.cookies.get("sb-session")?.value).toBe("rotated");
  });

  it("does not refresh the old session before exchanging an auth code", async () => {
    const response = await updateSession(new NextRequest("https://app.test/auth/callback?code=secret"), security);
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("requires auth on paths that merely start with login", async () => {
    const response = await updateSession(new NextRequest("https://app.test/login-private?token=secret"), security);
    expect(response.headers.get("location")).toBe("https://app.test/login");
  });

  it("allows signed-in users to finish password recovery", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
    const response = await updateSession(new NextRequest("https://app.test/auth/reset-password"), security);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("PKCE callback", () => {
  it.each(["//evil.test", "/\\evil.test", "/dashboard?token=secret", "https://evil.test", "/auth/callback?code=secret"])("rejects unapproved redirect %s", async (next) => {
    const response = await GET(new Request(`https://app.test/auth/callback?code=once&next=${encodeURIComponent(next)}`));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("once");
    expect(response.headers.get("location")).toBe("https://app.test/dashboard");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("lands on password recovery after a successful exchange", async () => {
    const response = await GET(new Request("https://app.test/auth/callback?code=once&next=/auth/reset-password"));
    expect(response.headers.get("location")).toBe("https://app.test/auth/reset-password");
  });

  it.each(["?error=access_denied&code=secret", ""])("rejects missing or failed provider callbacks: %s", async (query) => {
    const response = await GET(new Request(`https://app.test/auth/callback${query}`));
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://app.test/login?error=auth");
  });

  it("handles expired/reused codes and network failures without leaking details", async () => {
    for (const throws of [false, true]) {
      if (throws) auth.exchangeCodeForSession.mockRejectedValueOnce(new Error("secret"));
      else auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { message: "secret" } });
      const response = await GET(new Request("https://app.test/auth/callback?code=secret"));
      expect(response.headers.get("location")).toBe("https://app.test/login?error=auth");
    }
  });
});
