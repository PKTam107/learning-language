import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { useShareIntentContext } from "expo-share-intent";
import { ShareTarget } from "@/components/ShareTarget";
import { type ThemeColors } from "@/lib/theme";
import { useStyles } from "@/contexts/ThemeContext";

/**
 * Màn nhận nội dung từ thao tác **Chia sẻ** của hệ điều hành (Android
 * `ACTION_SEND`). Tương đương trang `/share` bên web.
 *
 * Nội dung được **chụp lại một lần lúc mount** rồi xóa khỏi native module:
 * provider tự dọn khi app ra nền, mà người dùng thì hay chuyển qua lại giữa
 * app nguồn và LinguaCards ngay giữa chừng.
 */
export default function SharePage() {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ text?: string }>();
  const { shareIntent, resetShareIntent } = useShareIntentContext();

  const [shared] = useState(
    () => shareIntent?.text?.trim() || params.text?.trim() || ""
  );

  useEffect(() => {
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ShareTarget
        shared={shared}
        onDone={() => router.replace("/")}
      />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
  });
