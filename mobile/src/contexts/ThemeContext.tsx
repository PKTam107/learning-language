import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type ThemeColors } from "@/lib/theme";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "linguacards.theme.v1";

interface ThemeContextValue {
  /** Lựa chọn của người dùng (có thể là "system"). */
  choice: ThemeChoice;
  /** Nền đang dùng thực tế, đã quy "system" về sáng/tối. */
  scheme: "light" | "dark";
  colors: ThemeColors;
  setChoice: (next: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isChoice(v: unknown): v is ThemeChoice {
  return v === "light" || v === "dark" || v === "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  // Nền sáng/tối của hệ điều hành; hook này tự cập nhật khi người dùng đổi.
  const systemScheme = useColorScheme();

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (alive && isChoice(raw)) setChoiceState(raw);
      })
      .catch(() => {
        // Không đọc được thì cứ để "system" — không chặn app.
      });
    return () => {
      alive = false;
    };
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {
      // Ghi thất bại vẫn đổi được cho phiên hiện tại.
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme =
      choice === "system" ? (systemScheme === "dark" ? "dark" : "light") : choice;
    return {
      choice,
      scheme,
      colors: scheme === "dark" ? darkColors : lightColors,
      setChoice,
    };
  }, [choice, systemScheme, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme phải nằm trong <ThemeProvider>");
  return ctx;
}

/** Lấy bảng màu của nền đang dùng — cho màu đặt trực tiếp trên JSX (icon...). */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}

/**
 * Cache stylesheet theo (hàm dựng style × bảng màu). `lightColors`/`darkColors`
 * là hằng số nên mỗi hàm dựng chỉ tạo tối đa 2 stylesheet cho cả app — không
 * phải tạo lại mỗi lần component render hay mỗi instance.
 */
const cache = new WeakMap<object, Map<ThemeColors, unknown>>();

/**
 * Dùng thay cho `const styles = StyleSheet.create(...)` ở cấp module:
 *
 *     const makeStyles = (colors: ThemeColors) => StyleSheet.create({ ... });
 *     ...
 *     const styles = useStyles(makeStyles);
 *
 * Gọi ở đầu component, TRƯỚC mọi `return` sớm (quy tắc hook).
 */
export function useStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useThemeColors();

  let byColors = cache.get(factory);
  if (!byColors) {
    byColors = new Map();
    cache.set(factory, byColors);
  }
  if (!byColors.has(colors)) {
    byColors.set(colors, factory(colors));
  }
  return byColors.get(colors) as T;
}
