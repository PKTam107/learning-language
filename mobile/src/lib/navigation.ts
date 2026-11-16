/** Primary destinations stay in tabs; focused activities live in the parent stack. */
export const APP_TABS = [
  { name: "index", title: "Trang chủ", href: "/(app)/(tabs)" },
  { name: "learn", title: "Học tập", href: "/learn" },
  { name: "decks", title: "Bộ từ", href: "/decks" },
  { name: "progress", title: "Tiến độ", href: "/progress" },
  { name: "settings", title: "Cài đặt", href: "/settings" },
] as const;

export const LEARNING_MODES = [
  { id: "quick", title: "Học nhanh 5 từ", description: "Một phiên ngắn với tối đa 5 thẻ đến hạn, vào học ngay.", href: "/study/today?quick=1" },
  { id: "today", title: "Ôn hôm nay", description: "Ôn thẻ đến hạn từ mọi bộ từ theo lịch học của bạn.", href: "/study/today" },
  { id: "reading", title: "Đọc hiểu", description: "Đọc đoạn ngắn bằng kho từ của bạn, xem nghĩa và luyện câu hỏi.", href: "/reading" },
  { id: "weak", title: "Từ hay quên", description: "Luyện riêng những từ bạn thường chưa nhớ được.", href: "/study/weak" },
] as const;
