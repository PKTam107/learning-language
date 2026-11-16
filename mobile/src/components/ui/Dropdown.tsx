import { useEffect, useState } from "react";
import { BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/lib/theme";
import { Input } from "./Input";

interface Props {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  searchable?: boolean;
}

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();

/** Inline dropdown; a single controlled open field keeps long forms compact. */
export function Dropdown({ label, value, options, onChange, open, onOpenChange, disabled = false, searchable = false }: Props) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const expanded = open && !disabled;
  const selected = options.find((option) => option.value === value);
  const visible = options.filter((option) => normalize(option.label).includes(normalize(query)));
  const Arrow = expanded ? ChevronUp : ChevronDown;

  useEffect(() => { if (!open) setQuery(""); }, [open]);
  useEffect(() => {
    if (!expanded) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { onOpenChange(false); return true; });
    return () => listener.remove();
  }, [expanded, onOpenChange]);

  return <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="combobox" accessibilityLabel={label} accessibilityState={{ expanded, disabled }} accessibilityValue={{ text: selected?.label ?? "Chọn…" }} disabled={disabled} onPress={() => onOpenChange(!open)} style={[styles.field, expanded && styles.openField, disabled && styles.disabled]}>
      <Text style={styles.value}>{selected?.label ?? "Chọn…"}</Text>
      <Arrow size={20} color={colors.textMuted} />
    </Pressable>
    {expanded && <View style={styles.panel}>
      {searchable && <Input value={query} onChangeText={setQuery} placeholder="Tìm bộ từ…" accessibilityLabel={`Tìm trong ${label}`} autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} />}
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: Math.min(260, height * 0.32) }}>
        {visible.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: option.value === value }} onPress={() => { onChange(option.value); onOpenChange(false); Keyboard.dismiss(); }} style={({ pressed }) => [styles.option, option.value === value && styles.selected, pressed && styles.pressed]}>
          <Text style={[styles.optionText, option.value === value && styles.selectedText]}>{option.label}</Text>
          {option.value === value && <Check size={18} color={colors.brand} />}
        </Pressable>)}
        {!visible.length && <Text accessibilityLiveRegion="polite" style={styles.empty}>Không tìm thấy bộ từ phù hợp.</Text>}
      </ScrollView>
    </View>}
  </View>;
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { gap: 8 }, label: { fontSize: 16, fontWeight: "600", color: colors.text },
  field: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card },
  openField: { borderColor: colors.brand }, disabled: { opacity: 0.5 }, value: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21 },
  panel: { padding: 8, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card },
  option: { minHeight: 48, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21, color: colors.text },
  selected: { backgroundColor: colors.brandLight }, selectedText: { color: colors.brandDark, fontWeight: "600" },
  pressed: { opacity: 0.65 }, empty: { color: colors.textMuted, padding: 12, fontSize: 14 },
});
