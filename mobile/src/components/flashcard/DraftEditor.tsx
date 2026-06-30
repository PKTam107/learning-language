import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DraftCard } from "@/types";
import { Input } from "@/components/ui/Input";
import { AudioButton } from "./AudioButton";
import { colors, radius, spacing } from "@/lib/theme";

interface Props {
  draft: DraftCard;
  onChange: (draft: DraftCard) => void;
}

/** Form sửa DraftCard trước khi lưu (mobile). */
export function DraftEditor({ draft, onChange }: Props) {
  const set = (patch: Partial<DraftCard>) => onChange({ ...draft, ...patch });

  return (
    <View style={styles.wrap}>
      <View style={styles.termLine}>
        <Text style={styles.term}>{draft.term}</Text>
        {!!draft.phonetic && (
          <Text style={styles.phonetic}>{draft.phonetic}</Text>
        )}
        <AudioButton url={draft.audioUs} label="US" />
        <AudioButton url={draft.audioUk} label="UK" />
      </View>

      {draft.translationSkipped && (
        <Text style={styles.warn}>
          Chưa cấu hình AI dịch (hoặc dịch lỗi) — nghĩa đang để tiếng Anh, bạn
          có thể tự sửa.
        </Text>
      )}

      <Field label="Từ loại">
        <Input
          value={draft.partOfSpeech ?? ""}
          onChangeText={(t) => set({ partOfSpeech: t })}
          placeholder="noun / verb / adjective..."
        />
      </Field>

      <Field label="Nghĩa tiếng Việt (chính)">
        <Input
          value={draft.meaningVi ?? ""}
          onChangeText={(t) => set({ meaningVi: t })}
          placeholder="Nhập hoặc chọn nghĩa..."
        />
      </Field>

      {draft.definitions.length > 0 && (
        <Field label="Các nghĩa (chạm để chọn)">
          <View style={styles.defs}>
            {draft.definitions.map((d, i) => (
              <Pressable
                key={i}
                onPress={() => set({ meaningVi: d.definitionVi || d.definition })}
                style={({ pressed }) => [styles.defBtn, pressed && styles.defPressed]}
              >
                <Text style={styles.defText}>
                  <Text style={styles.pos}>{d.partOfSpeech} </Text>
                  {d.definitionVi || d.definition}
                </Text>
                {!!d.definitionVi && (
                  <Text style={styles.defEn}>{d.definition}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </Field>
      )}

      {draft.examples.length > 0 && (
        <Field label="Ví dụ">
          <View style={styles.defs}>
            {draft.examples.map((ex, i) => (
              <View key={i} style={styles.example}>
                <Text style={styles.exampleText}>“{ex.text}”</Text>
                {!!ex.textVi && (
                  <Text style={styles.exampleVi}>→ {ex.textVi}</Text>
                )}
              </View>
            ))}
          </View>
        </Field>
      )}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  termLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  term: { fontSize: 24, fontWeight: "700", color: colors.text },
  phonetic: { fontSize: 15, color: colors.textMuted },
  warn: {
    backgroundColor: "#fffbeb",
    color: "#b45309",
    fontSize: 12,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  field: { gap: 4 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  defs: { gap: spacing.sm },
  defBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  defPressed: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  defText: { fontSize: 14, color: colors.text },
  pos: { color: colors.textSubtle, fontSize: 12 },
  defEn: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  example: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.sm },
  exampleText: { fontSize: 14, fontStyle: "italic", color: colors.text },
  exampleVi: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
