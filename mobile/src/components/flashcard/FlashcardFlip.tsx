import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CardWithProgress } from "@/types";
import { AudioButton } from "./AudioButton";
import { colors, radius, spacing } from "@/lib/theme";

interface Props {
  card: CardWithProgress;
  flipped: boolean;
  onFlip: () => void;
}

/** Thẻ lật: mặt trước = từ + phiên âm + audio; mặt sau = nghĩa + từ loại + ví dụ. */
export function FlashcardFlip({ card, flipped, onFlip }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: flipped ? 180 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 10,
    }).start();
  }, [flipped, anim]);

  const frontRotate = anim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = anim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <Pressable onPress={onFlip} accessibilityLabel="Lật thẻ">
      <View style={styles.container}>
        {/* Mặt trước */}
        <Animated.View
          style={[
            styles.face,
            styles.front,
            { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
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
          {/* Giành quyền xử lý chạm để nút âm thanh không kích hoạt lật thẻ của Pressable cha. */}
          <View
            style={styles.audioRow}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <AudioButton url={card.audio_us} label="US" />
            <AudioButton url={card.audio_uk} label="UK" />
          </View>
          <Text style={styles.hint}>Chạm để lật</Text>
        </Animated.View>

        {/* Mặt sau */}
        <Animated.View
          style={[
            styles.face,
            styles.back,
            { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
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

            {!!card.note && <Text style={styles.note}>📝 {card.note}</Text>}

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

const styles = StyleSheet.create({
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
    fontSize: 14,
    color: "#92400e",
    backgroundColor: "#fffbeb",
    padding: spacing.sm,
    borderRadius: radius.md,
  },
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
