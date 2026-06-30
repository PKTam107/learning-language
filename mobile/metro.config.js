// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Expo SDK 52 bật package "exports" mặc định, làm @supabase/supabase-js
// resolve nhầm bản Node (ws/stream) → vỡ trên React Native. Tắt để dùng bản RN.
// https://github.com/supabase/supabase-js/issues/1258
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
