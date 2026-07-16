import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Thiếu EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Sao chép mobile/.env.example thành mobile/.env và điền giá trị."
  );
}

/**
 * Supabase client cho React Native.
 * - Lưu session vào AsyncStorage để giữ đăng nhập giữa các lần mở app.
 * - detectSessionInUrl=false vì mobile không dùng URL callback như web.
 * - flowType="pkce": bắt buộc cho OAuth trên native — server trả về `code`,
 *   app đổi code lấy session bằng exchangeCodeForSession (xem AuthContext).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
