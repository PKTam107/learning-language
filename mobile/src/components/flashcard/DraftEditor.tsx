import { ImagePicker } from "./ImagePicker";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DraftCard } from "@/types";
import { Input } from "@/components/ui/Input";
import { AudioButton } from "./AudioButton";
import { CefrBadge, EnrichmentSections } from "./Enrichment";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles } from "@/contexts/ThemeContext";

interface Props {
  draft: DraftCard;
  onChange: (draft: DraftCard) => void;
  editableTerm?: boolean;
}

/** Form sửa DraftCard trước khi lưu (mobile). */
export function DraftEditor({ draft, onChange, editableTerm = false }: Props) {
  const styles = useStyles(makeStyles);
  const set = (patch: Partial<DraftCard>) => onChange({ ...draft, ...patch });

  return (
    <View style={styles.wrap}>
      <View style={styles.termLine}>
        <Text style={styles.term}>{draft.term}</Text>
        <CefrBadge level={draft.cefrLevel} />
        {!!draft.phonetic && (
          <Text style={styles.phonetic}>{draft.phonetic}</Text>
        )}
        <AudioButton url={draft.audioUs} text={draft.term} label="US" />
        <AudioButton url={draft.audioUk} text={draft.term} label="UK" />
      </View>

      {draft.translationSkipped && (
        <Text style={styles.warn}>
          Chưa cấu hình AI dịch (hoặc dịch lỗi) — nghĩa đang để tiếng Anh, bạn
          có thể tự sửa.
        </Text>
      )}

      {editableTerm && (
        <Field label="Từ / cụm từ">
          <Input accessibilityLabel="Từ / cụm từ" value={draft.term} onChangeText={(term) => set({ term })} autoCapitalize="none" />
        </Field>
      )}

      <View style={styles.row}>
        <Field label="Phiên âm UK" style={styles.flex}>
          <Input
            value={draft.phoneticUk ?? ""}
            onChangeText={(t) => set({ phoneticUk: t })}
            placeholder="/…/"
            autoCapitalize="none"
          />
        </Field>
        <Field label="Phiên âm US" style={styles.flex}>
          <Input
            value={draft.phoneticUs ?? ""}
            onChangeText={(t) => set({ phoneticUs: t })}
            placeholder="/…/"
            autoCapitalize="none"
          />
        </Field>
      </View>

      <ImagePicker key={draft.term} term={draft.term} image={draft.image} onChange={(image) => set({ image })} />

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

      <Field label="Ví dụ">
        <View style={styles.defs}>
          {draft.examples.map((ex, i) => <View key={i} style={styles.defs}>
            <Input accessibilityLabel={`Câu ví dụ tiếng Anh ${i + 1}`} value={ex.text} onChangeText={(text) => set({ examples: draft.examples.map((item, index) => index === i ? { ...item, text } : item) })} placeholder="Câu ví dụ tiếng Anh" multiline />
            <Input accessibilityLabel={`Nghĩa câu ví dụ ${i + 1}`} value={ex.textVi ?? ""} onChangeText={(textVi) => set({ examples: draft.examples.map((item, index) => index === i ? { ...item, textVi } : item) })} placeholder="Nghĩa tiếng Việt (tùy chọn)" multiline />
            <Pressable accessibilityRole="button" onPress={() => set({ examples: draft.examples.filter((_, index) => index !== i) })}><Text style={styles.label}>Bỏ câu {i + 1}</Text></Pressable>
          </View>)}
          <Pressable accessibilityRole="button" onPress={() => set({ examples: [...draft.examples, { text: "", textVi: "" }] })}><Text style={styles.label}>Thêm câu ví dụ</Text></Pressable>
        </View>
      </Field>

      {(!!draft.wordFamily?.length || !!draft.collocations?.length) && (
        <View style={styles.enrich}>
          <EnrichmentSections
            wordFamily={draft.wordFamily}
            collocations={draft.collocations}
          />
        </View>
      )}

      <Field label="Ghi chú của bạn (tùy chọn)">
        <Input
          value={draft.note ?? ""}
          onChangeText={(t) => set({ note: t })}
          placeholder="Mẹo nhớ, ngữ cảnh dùng, collocation..."
          multiline
          style={styles.noteInput}
        />
      </Field>
    </View>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: spacing.md },
    row: { flexDirection: "row", gap: spacing.sm },
    flex: { flex: 1 },
    noteInput: { minHeight: 64, textAlignVertical: "top" },
    termLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
    term: { fontSize: 24, fontWeight: "700", color: colors.text },
    phonetic: { fontSize: 15, color: colors.textMuted },
    warn: {
      backgroundColor: colors.tints.amber.bg,
      color: colors.tints.amber.fg,
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
    enrich: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.bg,
      padding: spacing.md,
    },
  });
