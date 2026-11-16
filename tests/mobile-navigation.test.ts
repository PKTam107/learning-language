import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { APP_TABS, LEARNING_MODES } from "../mobile/src/lib/navigation";

// Run the actual Expo Router v4 route builder against the real app file tree.
// Route components are stubbed because this test checks routing, not native rendering.
const require = createRequire(import.meta.url);
interface RouteNode { route: string; contextKey: string; initialRouteName?: string; children: RouteNode[] }
const hasMobileSDK = existsSync("mobile/node_modules/expo-router/build/getRoutesCore.js");
const { getRoutes } = (hasMobileSDK ? require("../mobile/node_modules/expo-router/build/getRoutesCore") : { getRoutes: () => null }) as {
  getRoutes: (context: unknown, options: Record<string, unknown>) => RouteNode | null;
};
const paths = readdirSync("mobile/app", { recursive: true, encoding: "utf8" })
  .filter((path) => /\.tsx$/.test(path)).map((path) => `./${path.replace(/\\/g, "/")}`);
const context = Object.assign((path: string) => ({
  default: () => null,
  ...(path === "./(app)/_layout.tsx" ? { unstable_settings: { initialRouteName: "(tabs)" } } : {}),
}), { keys: () => paths });
const tree = getRoutes(context, { platform: "android", ignoreEntryPoints: true });
const app = tree?.children.find((route) => route.route === "(app)")!;
const tabs = app?.children.find((route) => route.route === "(tabs)")!;
function leaves(node: RouteNode, parent = ""): string[] {
  const path = `${parent}/${node.route}`.replace(/\/\([^/]+\)/g, "").replace(/\/index$/, "").replace(/\/{2,}/g, "/");
  return node.children.length ? node.children.flatMap((child) => leaves(child, path)) : [path || "/"];
}

describe.skipIf(!hasMobileSDK)("mobile primary navigation", () => {
  it("exposes exactly five tabs and makes learning a primary destination", () => {
    expect(tabs.children.map((route) => route.route).sort()).toEqual(APP_TABS.map((tab) => tab.name).sort());
    expect(APP_TABS.map((tab) => tab.title)).toEqual(["Trang chủ", "Học tập", "Bộ từ", "Tiến độ", "Cài đặt"]);
    expect(app.initialRouteName).toBe("(tabs)");
  });
  it("keeps focused activities outside tabs so back returns to the selected tab", () => {
    for (const path of ["reading", "study/[deckId]", "decks/[id]", "share"]) {
      expect(app.children.some((route) => route.route === path)).toBe(true);
      expect(tabs.children.some((route) => route.route === path)).toBe(false);
    }
  });
  it("preserves existing public destinations without duplicate routes after moving screens", () => {
    const routes = leaves(app);
    expect(new Set(routes).size).toBe(routes.length);
    for (const route of ["/", "/decks", "/learn", "/settings", "/progress", "/reading", "/share", "/study/[deckId]", "/decks/[id]"]) expect(routes).toContain(route);
  });
  it("makes reading reachable even before any decks are created", () => {
    expect(LEARNING_MODES.find((mode) => mode.id === "reading")?.href).toBe("/reading");
    expect(LEARNING_MODES.map((mode) => mode.href)).toContain("/study/today?quick=1");
    expect(LEARNING_MODES.map((mode) => mode.href)).toContain("/study/weak");
  });
});
