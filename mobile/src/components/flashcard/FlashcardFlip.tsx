import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from "react-native";
import type { CardWithProgress } from "@/types";
import {
  dragAngle,
  isBack,
  isHorizontalDrag,
  settleDrag,
  snapToFace,
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

/**
 * Thẻ lật: mặt trước = từ + phiên âm + audio; mặt sau = nghĩa + từ loại + ví dụ.
 *
 * Lật bằng chạm hoặc **vuốt ngang**: khi vuốt, góc xoay bám theo ngón tay; thả
 * tay ra mới quyết định lật hẳn hay bật về chỗ cũ (theo quãng vuốt hoặc vận tốc).
 *
 * Góc xoay **cộng dồn** (0 → 180 → 360 → …) chứ không tua ngược 180 → 0, nên thẻ
 * luôn quay tiếp theo hướng vừa vuốt thay vì chỉ xoay một chiều. Mặt nào đang
 * hiện chỉ phụ thuộc góc chẵn/lẻ vòng nửa (`isBack`) — bản web dùng đúng cách này.
 */
/** Bằng đúng thời lượng lật của bản web (450ms) để hai bên cùng một nhịp. */
const FLIP_MS = 450;
/** Cùng đường cong với `.flip-inner` trên web: nhanh lúc đầu, không nảy quá đà. */
const FLIP_EASING = Easing.bezier(0.2, 0.75, 0.25, 1);

export function FlashcardFlip({ card, flipped, onFlip }: Props) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);

  const rot = useRef(new Animated.Value(flipped ? 180 : 0)).current;
  /**
   * Góc **đang hiển thị thật sự**. Animated.Value chạy native nên JS không đọc
   * thẳng được — phải soi qua listener (xem effect bên dưới). Cần góc thật để
   * nắm lại thẻ giữa lúc đang lật mà không bị nhảy.
   */
  const degRef = useRef(flipped ? 180 : 0);
  /** Góc đích của animation đang chạy — dùng để xét mặt nào sắp hiện. */
  const targetRef = useRef(degRef.current);
  /** Hướng lật gần nhất (1 = sang phải). Lật bằng chạm đi theo hướng này. */
  const dirRef = useRef<1 | -1>(1);
  /** Góc lúc bắt đầu vuốt. */
  const baseRef = useRef(degRef.current);
  const widthRef = useRef(Dimensions.get("window").width);
  const draggingRef = useRef(false);
  /** `onFlip` đổi định danh mỗi lần cha render — giữ bản mới nhất trong ref để
   *  PanResponder chỉ phải dựng MỘT lần, không dựng lại giữa cử chỉ. */
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  // Bám giá trị native về JS. Chỉ một Animated.Value nên chi phí không đáng kể,
  // đổi lại lúc nào cũng biết thẻ đang nghiêng bao nhiêu độ.
  useEffect(() => {
    const id = rot.addListener(({ value }) => {
      degRef.current = value;
    });
    return () => rot.removeListener(id);
  }, [rot]);

  /**
   * Chạy về `deg`. Dùng `timing` chứ không `spring`: spring nảy quanh đích rồi
   * mới dừng, thẻ chữ nhiều nhìn ra "rung"; đường cong này giống hệt web.
   * Thời lượng co theo quãng còn lại — bật về 10° mà mất 450ms thì thấy ì.
   */
  const animateTo = useCallback(
    (deg: number) => {
      targetRef.current = deg;
      const remaining = Math.abs(deg - degRef.current);
      Animated.timing(rot, {
        toValue: deg,
        duration: Math.max(140, Math.round((FLIP_MS * Math.min(180, remaining)) / 180)),
        easing: FLIP_EASING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) degRef.current = deg;
      });
    },
    [rot]
  );

  // Cha giữ trạng thái `flipped` (nút "Hiện đáp án", sang thẻ mới). Lệch với góc
  // đang có thì quay THÊM nửa vòng theo hướng gần nhất.
  useEffect(() => {
    if (draggingRef.current) return; // đang vuốt thì ngón tay mới là chuẩn
    if (isBack(targetRef.current) === flipped) return;
    animateTo(snapToFace(targetRef.current) + 180 * dirRef.current);
  }, [flipped, animateTo]);

  // Dựng đúng một lần: mọi thứ handler cần đều nằm trong ref.
  const panRef = useRef<PanResponderInstance | null>(null);
  if (panRef.current === null) {
    // Chỉ giành quyền khi vuốt NGANG: chạm để Pressable/nút audio xử lý, vuốt
    // dọc để ScrollView của mặt sau cuộn.
    const wantsHorizontal = (_e: unknown, g: { dx: number; dy: number }) =>
      isHorizontalDrag(g.dx, g.dy);

    const finish = (dx: number, vx: number, cancelled = false) => {
      draggingRef.current = false;
      const settled = settleDrag({
        base: baseRef.current,
        dx,
        velocity: vx,
        width: widthRef.current,
        cancelled,
      });
      animateTo(settled.deg);
      if (settled.flipped) {
        dirRef.current = settled.dir;
        onFlipRef.current();
      }
    };

    panRef.current = PanResponder.create({
      onMoveShouldSetPanResponder: wantsHorizontal,
      // Bắt ở pha capture để vuốt ngang NGAY TRÊN mặt sau cũng lật được thẻ,
      // không bị ScrollView giữ mất.
      onMoveShouldSetPanResponderCapture: wantsHorizontal,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        draggingRef.current = true;
        // Dừng animation đang chạy và lấy chính góc đang thấy làm mốc.
        rot.stopAnimation();
        baseRef.current = degRef.current;
        targetRef.current = degRef.current;
      },
      onPanResponderMove: (_e, g) => {
        const next = dragAngle(baseRef.current, g.dx, widthRef.current);
        targetRef.current = next;
        rot.setValue(next);
      },
      onPanResponderRelease: (_e, g) => finish(g.dx, g.vx),
      onPanResponderTerminate: (_e, g) => finish(g.dx, g.vx, true),
    });
  }
  const pan = panRef.current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width || widthRef.current;
  }, []);

  const frontRotate = rot.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = rot.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  // `backfaceVisibility: hidden` là cách chính để giấu mặt khuất, nhưng trên một
  // số máy Android nó không ăn — mặt sau hiện đè lên mặt trước thành một mảng
  // chữ ngược lấp lóa. Tắt hẳn opacity của mặt đang quay đi là chốt chặn thứ hai:
  // dùng góc quy về 0–360 nên vẫn đúng khi góc cộng dồn lên 540, 720…
  const spin = Animated.modulo(rot, 360);
  const FACE_SWAP = [0, 89.99, 90, 270, 270.01, 360];
  const frontOpacity = spin.interpolate({
    inputRange: FACE_SWAP,
    outputRange: [1, 1, 0, 0, 1, 1],
    extrapolate: "clamp",
  });
  const backOpacity = spin.interpolate({
    inputRange: FACE_SWAP,
    outputRange: [0, 0, 1, 1, 0, 0],
    extrapolate: "clamp",
  });

  return (
    <Pressable onPress={onFlip} accessibilityLabel="Lật thẻ — chạm hoặc vuốt ngang">
      <View style={styles.container} onLayout={onLayout} {...pan.panHandlers}>
        {/* Mặt trước */}
        <Animated.View
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
          style={[
            styles.face,
            styles.front,
            {
              opacity: frontOpacity,
              transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
            },
          ]}
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
          style={[
            styles.face,
            styles.back,
            {
              opacity: backOpacity,
              transform: [{ perspective: 1000 }, { rotateY: backRotate }],
            },
          ]}
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
