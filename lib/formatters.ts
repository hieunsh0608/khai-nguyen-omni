// ============================================================
// Helpers — Format thời gian cho chat & danh sách hội thoại
// ============================================================

/**
 * Format thời gian cho danh sách hội thoại.
 * - Hôm nay      → "8:11"
 * - Hôm qua      → "Hôm qua"
 * - Trong tuần    → "T2", "T3", ... "CN"
 * - Xa hơn       → "21/04"
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // So sánh theo ngày (không theo giờ) để tránh edge case nửa đêm
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Hôm nay → hiện giờ
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (diffDays === 1) {
    return "Hôm qua";
  }

  if (diffDays < 7) {
    // Trong tuần → hiện thứ
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return dayNames[date.getDay()];
  }

  // Xa hơn → hiện ngày/tháng
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

/**
 * Kiểm tra 2 date string có cùng ngày lịch không.
 */
export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Label cho dải phân cách ngày trong khung chat.
 * - Hôm nay     → "Hôm nay"
 * - Hôm qua     → "Hôm qua"
 * - Trong tuần   → "T2, 14/04"
 * - Xa hơn      → "21/04/2025"
 */
export function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";

  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  if (diffDays < 7) {
    return `${dayNames[date.getDay()]}, ${dd}/${mm}`;
  }

  return `${dd}/${mm}/${date.getFullYear()}`;
}
