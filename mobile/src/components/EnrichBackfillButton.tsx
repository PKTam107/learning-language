import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Sparkles } from "lucide-react-native";
import {
  fetchUnenriched,
  runBackfill,
  type UnenrichedCard,
} from "@/lib/enrich-backfill";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing } from "@/lib/theme";

interface Props {
  /** Giới hạn theo 1 bộ thẻ; bỏ trống = toàn tài khoản. */
  deckId?: string;
  /** Gọi sau khi làm giàu xong (để cha refresh). */
  onDone?: () => void;
  /** true = dạng banner (dùng ở màn chính); mặc định nút gọn. */
  banner?: boolean;
  style?: object;
}

/**
 * Nút "Làm giàu N thẻ" — bổ sung CEFR/word family/collocations cho thẻ cũ
 * (enriched_at IS NULL). Tự ẩn khi không còn thẻ cần làm giàu.
 */
export function EnrichBackfillButton({ deckId, onDone, banner, style }: Props) {
  const [pending, setPending] = useState<UnenrichedCard[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const refresh = useCallback(() => {
    fetchUnenriched(deckId).then(setPending);
  }, [deckId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function run() {
    if (!pending || pending.length === 0) return;
    setRunning(true);
    setProgress(0);
    try {
      await runBackfill(pending, (d) => setProgress(d));
    } catch (e) {
      Alert.alert("Lỗi làm giàu", (e as Error).message);
    } finally {
      setRunning(false);
      refresh();
      onDone?.();
    }
  }

  if (!pending || pending.length === 0) return null;

  const title = running
    ? `Đang làm giàu ${progress}/${pending.length}...`
    : `Làm giàu ${pending.length} thẻ`;

  const btn = (
    <Button
      title={title}
      icon={!running ? <Sparkles size={18} color="#fff" /> : undefined}
      loading={running}
      onPress={run}
      style={style}
    />
  );

  if (!banner) return btn;

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        <Text style={styles.bannerStrong}>{pending.length} thẻ cũ</Text> chưa có
        CEFR / họ từ / collocations.
      </Text>
      {btn}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#c7d2fe",
    backgroundColor: "#eef2ff",
    gap: spacing.sm,
  },
  bannerText: { fontSize: 13, color: "#3730a3" },
  bannerStrong: { fontWeight: "700" },
});
