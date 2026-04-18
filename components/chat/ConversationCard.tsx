"use client";

// ============================================================
// ConversationCard — Hiển thị 1 hội thoại trong danh sách
// Hỗ trợ cả 1-1 và Group Chat
// ============================================================

import { formatTime } from "@/lib/formatters";
import { AvatarFallback, ChannelBadge, GroupBadge } from "@/components/shared";
import type { HoiThoaiWithDetails } from "@/types/database";

export function ConversationCard({
  conv,
  isSelected,
  onSelect,
}: {
  conv: HoiThoaiWithDetails;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isGroup = !!conv.zalo_nhom_id;
  const nhom = conv.zalo_nhom;
  const kh = conv.khach_hang;

  const displayName = isGroup
    ? (nhom?.ten_nhom || "Nhóm chưa có tên")
    : (kh?.ho_ten || "Khách chưa có tên");
  const avatarUrl = isGroup
    ? (nhom?.avatar_nhom || null)
    : (kh?.avatar || null);

  const tinCuoi = conv.tin_nhan_cuoi;
  const isUnread = tinCuoi?.chieu_gui === "Khách gửi";

  let bgClass: string;
  if (isSelected) {
    bgClass = "bg-[#d1fae5] border-l-[3px] border-l-emerald-500";
  } else if (isUnread) {
    bgClass = "bg-gray-50 hover:bg-gray-100";
  } else {
    bgClass = "bg-white hover:bg-gray-50";
  }

  let tinCuoiPreview = "Chưa có tin nhắn";
  if (tinCuoi?.noi_dung) {
    if (isGroup && tinCuoi.chieu_gui === "Khách gửi" && tinCuoi.nguoi_gui?.ho_ten) {
      tinCuoiPreview = `${tinCuoi.nguoi_gui.ho_ten}: ${tinCuoi.noi_dung}`;
    } else {
      tinCuoiPreview = tinCuoi.noi_dung;
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`
        flex items-center p-2.5 rounded-md cursor-pointer transition-all duration-150
        ${bgClass}
      `}
    >
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <AvatarFallback name={displayName} bgColor={isGroup ? "bg-indigo-100" : "bg-gray-200"} />
        )}
        {isGroup ? <GroupBadge /> : <ChannelBadge nguonDen={conv.nguon_den} />}
      </div>

      <div className="flex-1 ml-2.5 min-w-0">
        <div className="flex justify-between items-center">
          <span className={`text-sm truncate ${isUnread && !isSelected ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
            {displayName}
          </span>
          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1.5">
            {conv.updated_at ? formatTime(conv.updated_at) : ""}
          </span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className={`text-xs truncate ${isUnread && !isSelected ? "text-gray-700 font-medium" : "text-gray-400"}`}>
            {tinCuoiPreview}
          </p>
          {isUnread && !isSelected && (
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ml-1.5" />
          )}
        </div>
      </div>
    </div>
  );
}
