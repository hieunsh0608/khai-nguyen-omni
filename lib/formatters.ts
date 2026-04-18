// ============================================================
// Helpers — Format thời gian cho chat & danh sách hội thoại
// ============================================================

/**
 * Format thời gian cho danh sách hội thoại.
 * - Nếu < 24h → hiện giờ:phút
 * - Nếu >= 24h → hiện ngày/tháng
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Format thời gian cho bubble chat — luôn hiện giờ:phút
 */
export function formatChatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
