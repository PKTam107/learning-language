import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { CardWithProgress } from "@/types";
import {
  DRAG_SLOP,
  dragAngle,
  isBack,
  nextAngle,
  settleDrag,
} from "@/lib/flip";
import { AudioButton } from "./AudioButton";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import { StickyNote } from "lucide-react-native";

interface Props {
  card: CardWithProgress;
  flipped: boolean;
  onFlip: () => void;
}

/** Bằng đúng thời lượng lật của bản web (450ms) để hai bên cùng một nhịp. */
const FLIP_MS = 450;
/** Cùng đường cong với `.flip-inner` trên web: nhanh lúc đầu, không nảy quá đà. */
const FLIP_EASING = Easing.bezier(0.2, 0.75, 0.25, 1);

/** Quãng ngắn thì chạy nhanh hơn — bật về 10° mà mất 450ms là thấy ì. */
function flipDuration(from: number, to: number): number {
  "worklet";
  return Math.max(140, Math.round((FLIP_MS * Math.min(180, Math.abs(to - from))) / 180));
}

/**
 * Thẻ lật: mặt trước = từ + phiên âm + audio; mặt sau = nghĩa + từ loại + ví dụ.
 *
 * Lật bằng chạm hoặc **vuốt ngang**. Cử chỉ chạy **trên UI thread**
 * (react-native-gesture-handler + reanimated worklet): góc xoay được tính và áp
 * thẳng vào view trong cùng một khung hình với ngón tay, không đi vòng qua JS
 * thread rồi mới qua bridge như `PanResponder` + `Animated.setValue` — đó là chỗ
 * làm thẻ chạy trễ sau tay ở bản trước.
 *
 * Góc xoay **cộng dồn** (0 → 180 → 360 → …) chứ không tua ngược 180 → 0, nên thẻ
 * luôn quay tiếp theo hướng vừa vuốt. Mặt nào đang hiện chỉ phụ thuộc góc chẵn/lẻ
 * nửa vòng — phép tính nằm ở `lib/flip.ts`, dùng chung với web (các hàm ở đó đánh
 * dấu `"worklet"` nên gọi được từ UI thread).
 */
export function FlashcardFlip({ card, flipped, onFlip }: Props) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);

  /** Góc xoay hiện tại (độ, cộng dồn) — sống trên UI thread. */
  const rot = useSharedValue(flipped ? 180 : 0);
  /** Góc lúc bắt đầu vuốt. */
  const base = useSharedValue(rot.value);
  /** Hướng lật gần nhất (1 = sang phải). Lật bằng chạm đi theo hướng này. */
  const dir = useSharedValue<1 | -1>(1);
  const width = useSharedValue(Dimensions.get("window").width);
  const dragging = useSharedValue(false);

  /** `onFlip` đổi định danh mỗi lần cha render; worklet lại chụp giá trị lúc tạo,
   *  nên gọi qua một hàm ổn định đọc ref ở phía JS. */
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;
  const flipFromGesture = useCallback(() => onFlipRef.current(), []);

  // Cha giữ trạng thái `flipped` (nút "Hiện đáp án", sang thẻ mới). Lệch với góc
  // đang có thì quay THÊM nửa vòng theo hướng gần nhất.
  useEffect(() => {
    if (dragging.value) return; // đang vuốt thì ngón tay mới là chuẩn
    if (isBack(rot.value) === flipped) return;
    const target = nextAngle(rot.value, dir.value);
    rot.value = withTiming(target, {
      duration: flipDuration(rot.value, target),
      easing: FLIP_EASING,
    });
  }, [flipped, dir, dragging, rot]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Ngưỡng do native quyết định: vượt ngang thì nhận, nghiêng dọc thì
        // nhường hẳn cho ScrollView của mặt sau / cuộn trang.
        .activeOffsetX([-DRAG_SLOP, DRAG_SLOP])
        .failOffsetY([-DRAG_SLOP * 2, DRAG_SLOP * 2])
        .onStart(() => {
          dragging.value = true;
          cancelAnimation(rot); // nắm lại giữa chừng: giữ đúng góc đang thấy
          base.value = rot.value;
        })
        .onUpdate((e) => {
          rot.value = dragAngle(base.value, e.translationX, width.value);
        })
        .onEnd((e, success) => {
          const settled = settleDrag({
            base: base.value,
            dx: e.translationX,
            // gesture-handler trả px/giây, ngưỡng của `lib/flip` tính px/mili-giây.
            velocity: e.velocityX / 1000,
            width: width.value,
            cancelled: !success,
          });
          rot.value = withTiming(settled.deg, {
            duration: flipDuration(rot.value, settled.deg),
            easing: FLIP_EASING,
          });
          if (settled.flipped) {
            dir.value = settled.dir;
            runOnJS(flipFromGesture)();
          }
        })
        .onFinalize(() => {
          dragging.value = false;
        }),
    [base, dir, dragging, flipFromGesture, rot, width]
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      width.value = e.nativeEvent.layout.width || width.value;
    },
    [width]
  );

  // `backfaceVisibility: hidden` không ăn trên một số máy Android (mặt sau hiện
  // đè lên thành mảng chữ ngược lấp lóa), nên tự tắt mặt đang quay đi. Quy góc về
  // 0–360 để vẫn đúng khi cộng dồn lên 540, 720…
  const frontStyle = useAnimatedStyle(() => {
    const spin = ((rot.value % 360) + 360) % 360;
    return {
      opacity: spin > 90 && spin < 270 ? 0 : 1,
      transform: [{ perspective: 1000 }, { rotateY: `${rot.value}deg` }],
    };
  });
  const backStyle = useAnimatedStyle(() => {
    const spin = ((rot.value % 360) + 360) % 360;
    return {
      opacity: spin > 90 && spin < 270 ? 1 : 0,
      transform: [{ perspective: 1000 }, { rotateY: `${rot.value + 180}deg` }],
    };
  });

  return (
    <Pressable onPress={onFlip} accessibilityLabel="Lật thẻ — chạm hoặc vuốt ngang">
      <GestureDetector gesture={pan}>
        <View style={styles.container} onLayout={onLayout}>
          {/* Mặt trước */}
          <Animated.View
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
            style={[styles.face, styles.front, frontStyle]}
          >
            <Text style={styles.term}>{card.term}</Text>
            {!!card.phonetic && (
              <Text style={styles.phonetic}>{card.phonetic}</Text>
            )}
            {(!!card.phonetic_uk || !!card.phonetic_us) && (
              <View style={styles.ipaRow}>
                {!!card.phonetic_uk && (
                  <Text style={styles.ipa}>UK {card.phonetic_uk}</Text>
                )}
                {!!card.phonetic_us && (
                  <Text style={styles.ipa}>US {card.phonetic_us}</Text>
                )}
              </View>
            )}
            {/* Pressable bọc (onPress rỗng) để chạm vùng audio KHÔNG lật thẻ:
                nút con tự phát âm; chạm khoảng trống giữa 2 nút bị nuốt tại đây.
                Pressable con luôn thắng Pressable cha nên cha (onFlip) không chạy. */}
            <Pressable style={styles.audioRow} onPress={() => {}}>
              <AudioButton url={card.audio_us} text={card.term} label="US" />
              <AudioButton url={card.audio_uk} text={card.term} label="UK" />
            </Pressable>
            <Text style={styles.hint}>Chạm hoặc vuốt để lật</Text>
          </Animated.View>

          {/* Mặt sau */}
          <Animated.View
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
            style={[styles.face, styles.back, backStyle]}
          >
            <ScrollView
              contentContainerStyle={styles.backContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.termLine}>
                <Text style={styles.backTerm}>{card.term}</Text>
                {!!card.part_of_speech && (
                  <Text style={styles.posBadge}>{card.part_of_speech}</Text>
                )}
              </View>
              {!!card.meaning_vi && (
                <Text style={styles.meaning}>{card.meaning_vi}</Text>
              )}

              {!!card.note && (
                <View style={styles.note}>
                  <StickyNote
                    size={14}
                    color={colors.tints.amber.fg}
                    style={styles.noteIcon}
                  />
                  <Text style={styles.noteText}>{card.note}</Text>
                </View>
              )}

              {card.definitions?.length > 0 && (
                <View style={styles.defs}>
                  {card.definitions.slice(0, 3).map((d, i) => (
                    <Text key={i} style={styles.def}>
                      • {d.definitionVi || d.definition}
                    </Text>
                  ))}
                </View>
              )}

              {card.examples?.length > 0 && (
                <View style={styles.examples}>
                  {card.examples.slice(0, 2).map((ex, i) => (
                    <View key={i} style={styles.example}>
                      <Text style={styles.exampleText}>“{ex.text}”</Text>
                      {!!ex.textVi && (
                        <Text style={styles.exampleVi}>→ {ex.textVi}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </GestureDetector>
    </Pressable>
  );
}

const CARD_HEIGHT = 340;

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { height: CARD_HEIGHT, width: "100%" },
    face: {
      position: "absolute",
      height: CARD_HEIGHT,
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backfaceVisibility: "hidden",
    },
    front: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.xl,
    },
    back: { padding: spacing.xl },
    backContent: { gap: spacing.md, paddingBottom: spacing.sm },
    term: { fontSize: 40, fontWeight: "700", color: colors.text, textAlign: "center" },
    phonetic: { fontSize: 18, color: colors.textMuted },
    ipaRow: { flexDirection: "row", gap: spacing.md },
    ipa: { fontSize: 13, color: colors.textSubtle },
    audioRow: { flexDirection: "row", gap: spacing.sm },
    hint: { position: "absolute", bottom: spacing.lg, fontSize: 12, color: colors.textSubtle },
    termLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    backTerm: { fontSize: 22, fontWeight: "700", color: colors.text },
    posBadge: {
      backgroundColor: colors.bg,
      color: colors.textMuted,
      fontSize: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.md,
      overflow: "hidden",
    },
    meaning: { fontSize: 18, fontWeight: "600", color: colors.brandDark },
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      backgroundColor: colors.tints.amber.bg,
      padding: spacing.sm,
      borderRadius: radius.md,
    },
    noteIcon: { marginTop: 2 },
    noteText: { flex: 1, fontSize: 14, color: colors.tints.amber.fg },
    defs: { gap: 4 },
    def: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    examples: {
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    example: { gap: 2 },
    exampleText: { fontSize: 14, fontStyle: "italic", color: colors.text },
    exampleVi: { fontSize: 14, color: colors.textSubtle },
  });
