import { Fragment, createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/settings", () => ({ fetchRemoteSettings: vi.fn(), saveRemoteSettings: vi.fn() }));
import { fetchRemoteSettings, saveRemoteSettings } from "../src/lib/db/settings";
import { useSettings } from "../src/lib/settings";
let first: ReturnType<typeof useSettings>;
let second: ReturnType<typeof useSettings>;
let renderer: ReactTestRenderer;
function First() { first = useSettings(); return null; }
function Second() { second = useSettings(); return null; }
afterEach(() => { act(() => renderer?.unmount()); vi.clearAllMocks(); });

describe("settings shared by dashboard and settings screen", () => {
  it("propagates an edit immediately and does not let in-flight remote settings overwrite it", async () => {
    let resolve!: (settings: Record<string, unknown>) => void;
    const remote = new Promise<Record<string, unknown>>((done) => { resolve = done; });
    vi.mocked(fetchRemoteSettings).mockReturnValue(remote);
    await act(async () => { renderer = create(createElement(Fragment, null, createElement(First), createElement(Second))); });
    act(() => first.update({ dailyGoal: 20, weeklyDays: 3 }));
    expect(second.settings).toMatchObject({ dailyGoal: 20, weeklyDays: 3 });
    await act(async () => { resolve({ dailyGoal: 5, weeklyDays: 7 }); });
    expect(first.settings).toMatchObject({ dailyGoal: 20, weeklyDays: 3 });
    expect(second.settings).toMatchObject({ dailyGoal: 20, weeklyDays: 3 });
    expect(saveRemoteSettings).toHaveBeenCalledTimes(1);
  });
});
