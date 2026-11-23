import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { fetchReviewReport, type LearningReport } from "@/lib/learning";
import { Button } from "@/components/ui/Button";
import { useThemeColors } from "@/contexts/ThemeContext";
export function ReviewEffectiveness({ refreshKey = 0 }: { refreshKey?: number }) {
  const colors = useThemeColors();
  const router = useRouter();
  const [report, setReport] = useState<LearningReport | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let alive = true; setError("");
    fetchReviewReport().then((data) => { if (alive) setReport(data); }).catch(() => { if (alive) setError("Chưa tải được báo cáo ôn tập."); });
    return () => { alive = false; };
  }, [reload, refreshKey]));
  return <View style={{ gap: 12, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginTop: 16 }}>
    <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Hiệu quả ôn tập · 7 ngày gồm hôm nay</Text>
    {error ? <><Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text><Button title="Thử lại" onPress={() => setReload(reload + 1)} /></> : !report ? <Text style={{ color: colors.text }}>Đang tải báo cáo…</Text> : <>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{report.retention === null ? "Chưa có lượt ôn đủ điều kiện" : `${report.retention}% nhớ khi đến hạn`}</Text>
      <Text style={{ color: colors.textMuted }}>{report.remembered}/{report.due} lượt ôn đến hạn được đánh giá Tạm nhớ hoặc Đã thuộc. Chỉ tính thẻ đã có khoảng ôn trên 0 ngày; không tính bước học mới hoặc học lại. Đây là kết quả đánh giá trong ứng dụng.</Text>
      {report.due > 0 && report.due < 20 && <Text style={{ color: colors.tints.amber.fg }}>Mẫu còn ít, hãy tích lũy thêm lượt ôn trước khi kết luận.</Text>}
      {(!report.contextAvailable || report.unknown > 0) && <Text style={{ color: colors.tints.amber.fg }}>{!report.contextAvailable ? "Chưa có dữ liệu ngữ cảnh để đo tỷ lệ nhớ khi đến hạn." : `${report.unknown} lượt thiếu ngữ cảnh được loại khỏi tỷ lệ nhớ khi đến hạn.`}</Text>}
      {report.modes.length > 0 && <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: "600" }}>Theo kiểu ôn (gồm cả bước học)</Text>{report.modes.map((mode) => <Text key={mode.type} style={{ color: colors.text }}>{mode.label}: {mode.forgotten}/{mode.total} lượt Chưa thuộc ({Math.round(mode.forgotten / mode.total * 100)}%)</Text>)}<Text style={{ color: colors.textMuted }}>Độ khó và thẻ khác nhau giữa các kiểu ôn; không dùng tỷ lệ này để xếp hạng kiểu học.</Text></View>}
      <Text style={{ color: colors.text, fontWeight: "600" }}>Từ hay quên trong tuần</Text>
      {report.forgotten.length ? report.forgotten.map((card) => <Button key={card.id} title={`${card.term} · ${card.count} lượt Chưa thuộc`} variant="secondary" onPress={() => router.push(`/decks/${card.deck_id}`)} />) : <Text style={{ color: colors.textMuted }}>{report.total ? "Không có thẻ hiện còn trong kho bị đánh giá Chưa thuộc trong tuần." : "Chưa có lượt ôn trong tuần này."}</Text>}
    </>}
    <Button title="Kiểm tra sức khỏe kho thẻ" variant="secondary" onPress={() => router.push("/health")} />
  </View>;
}
