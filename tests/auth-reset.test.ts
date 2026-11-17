import React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
const auth = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth }) }));
vi.mock("next/link", () => ({ default: "a" }));
import ResetPasswordPage from "../src/app/(auth)/auth/reset-password/page";

beforeEach(() => {
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

async function renderForm(password = "a long new password", confirmation = password) {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(ResetPasswordPage)); });
  const inputs = renderer.root.findAllByType("input");
  act(() => {
    inputs[0].props.onChange({ target: { value: password } });
    inputs[1].props.onChange({ target: { value: confirmation } });
  });
  const submit = () => act(async () => {
    await renderer.root.findByType("form").props.onSubmit({ preventDefault() {} });
  });
  return { renderer, submit };
}

it("rejects short and mismatched passwords before calling Auth", async () => {
  for (const pair of [["short", "short"], ["long enough password", "different"]]) {
    const { renderer, submit } = await renderForm(...pair as [string, string]);
    await submit();
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
    renderer.unmount();
  }
});

it("requires server-validated identity before updating a password", async () => {
  auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
  const { renderer, submit } = await renderForm();
  await submit();
  expect(auth.updateUser).not.toHaveBeenCalled();
  expect(auth.signOut).not.toHaveBeenCalled();
  renderer.unmount();
});

it("updates the password then revokes refresh tokens globally", async () => {
  const { renderer, submit } = await renderForm();
  await submit();
  expect(auth.updateUser).toHaveBeenCalledWith({ password: "a long new password" });
  expect(auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  expect(auth.updateUser.mock.invocationCallOrder[0]).toBeLessThan(auth.signOut.mock.invocationCallOrder[0]);
  expect(renderer.root.findAllByType("form")).toHaveLength(0);
  renderer.unmount();
});

it("does not sign out when the password change fails", async () => {
  auth.updateUser.mockResolvedValue({ error: new Error("rejected") });
  const { renderer, submit } = await renderForm();
  await submit();
  expect(auth.signOut).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType("input")).toHaveLength(2);
  renderer.unmount();
});

it("retries failed global sign-out without updating the password again", async () => {
  auth.signOut.mockResolvedValueOnce({ error: new Error("network") });
  const { renderer, submit } = await renderForm();
  await submit();
  expect(renderer.root.findAllByType("input")).toHaveLength(0);
  await submit();
  expect(auth.updateUser).toHaveBeenCalledTimes(1);
  expect(auth.signOut).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByType("form")).toHaveLength(0);
  renderer.unmount();
});
