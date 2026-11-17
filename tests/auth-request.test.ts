import { beforeEach, expect, it, vi } from "vitest";

const clients = vi.hoisted(() => ({ cookie: vi.fn(), bearer: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: clients.cookie }));
vi.mock("@supabase/supabase-js", () => ({ createClient: clients.bearer }));
import { getRequestContext } from "../src/lib/supabase/getUser";

beforeEach(() => {
  vi.clearAllMocks();
  clients.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  clients.cookie.mockReturnValue({ auth: { getUser: clients.getUser } });
  clients.bearer.mockReturnValue({ auth: { getUser: clients.getUser } });
});

it.each(["Basic credentials", "Bearer ", "", "Token secret"])("rejects malformed Authorization instead of falling back to cookie: %s", async (authorization) => {
  expect(await getRequestContext(new Request("https://app.test/api/devices", { headers: { authorization } }))).toBeNull();
  expect(clients.cookie).not.toHaveBeenCalled();
  expect(clients.bearer).not.toHaveBeenCalled();
});

it("validates a supplied bearer with the Auth server", async () => {
  const result = await getRequestContext(new Request("https://app.test/api/devices", { headers: { authorization: "Bearer token" } }));
  expect(result?.user.id).toBe("owner");
  expect(clients.getUser).toHaveBeenCalledWith("token");
  expect(clients.cookie).not.toHaveBeenCalled();
});

it("rejects invalid bearer even when a cookie session may exist", async () => {
  clients.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  expect(await getRequestContext(new Request("https://app.test/api/devices", { headers: { authorization: "Bearer invalid" } }))).toBeNull();
  expect(clients.cookie).not.toHaveBeenCalled();
});

it("authenticates web cookies when Authorization is absent", async () => {
  expect((await getRequestContext(new Request("https://app.test/api/devices")))?.user.id).toBe("owner");
  expect(clients.cookie).toHaveBeenCalledOnce();
  expect(clients.getUser).toHaveBeenCalledWith();
});
