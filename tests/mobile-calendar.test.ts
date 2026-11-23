import { existsSync } from "node:fs";
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { darkColors, lightColors, type ThemeColors } from "../mobile/src/lib/theme";
import { dayKey, startOfDay } from "../mobile/src/lib/streak";

const mocks = vi.hoisted(() => ({ colors: null as unknown, scheme: "dark", push: vi.fn() }));
vi.mock("../mobile/node_modules/react", () => import("react"));
vi.mock("../mobile/node_modules/react-native", () => ({
  View: "View", Text: "Text", Pressable: "Pressable", StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("../mobile/node_modules/expo-router", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../mobile/node_modules/lucide-react-native", () => ({ CalendarClock: "CalendarClock", ChevronLeft: "ChevronLeft", ChevronRight: "ChevronRight" }));
vi.mock("@/lib/theme", () => import("../mobile/src/lib/theme"));
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ colors: mocks.colors, scheme: mocks.scheme }),
  useStyles: (factory: (colors: unknown) => unknown) => factory(mocks.colors),
}));
const calendarModule = "../mobile/src/components/ReviewCalendar";
const hasMobileSDK = existsSync("mobile/node_modules/react-native/package.json");
const { ReviewCalendar } = hasMobileSDK ? await import(calendarModule) : { ReviewCalendar: () => null };

function contrast(hex1: string, hex2: string) {
  const luminance = (hex: string) => {
    const rgb = hex.slice(1).match(/../g)!.map((part) => parseInt(part, 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(hex1), luminance(hex2)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

beforeEach(() => mocks.push.mockReset());

describe.skipIf(!hasMobileSDK).each<[string, ThemeColors]>([["light", lightColors], ["dark", darkColors]])("mobile review calendar in %s mode", (scheme, colors) => {
  it("keeps due word chips readable and navigates to their deck", () => {
    mocks.scheme = scheme;
    mocks.colors = colors;
    const due = { dueNow: 1, byDay: { [dayKey(startOfDay())]: [{ cardId: "card-1", deckId: "deck-1", term: "apple" }] } };
    const tree = create(createElement(ReviewCalendar, { due }));
    const label = tree.root.findAll((node) => (node.type as unknown) === "Text" && node.children[0] === "apple")[0];
    const chip = label.parent!;
    const styles = chip.props.style({ pressed: false });
    const chipStyle = Object.assign({}, ...styles.filter(Boolean));
    expect(chipStyle.backgroundColor).toBe(colors.sunken);
    expect(contrast(label.props.style.color, chipStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    act(() => chip.props.onPress());
    expect(mocks.push).toHaveBeenCalledWith("/decks/deck-1");
    tree.unmount();
  });
});
