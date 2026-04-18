"use client";

// ============================================================
// ChatBubble — Hiển thị tin nhắn (text, ảnh, sticker)
// Workflow: Tin nhắn Zalo → Supabase → Web (hiển thị)
// Hỗ trợ Group Chat: avatar + tên người gửi
// isGrouped = true: tin liền kề cùng người → ẩn avatar/tên
// ============================================================

import { useState } from "react";
import { formatChatTime } from "@/lib/formatters";
import { AvatarFallback } from "@/components/shared";
import type { UITinNhan } from "@/types/ui";

export function ChatBubble({
  tin,
  isGroupChat,
  isGrouped = false,
  isLastInGroup = true,
}: {
  tin: UITinNhan;
  isGroupChat?: boolean;
  isGrouped?: boolean;
  isLastInGroup?: boolean;
}) {
  const [showLightbox, setShowLightbox] = useState(false);
  const isKhach = tin.chieu_gui === "Khách gửi";
  const status = tin.status;
  const isPhoto = tin.loai_tin === "chat.photo";
  const isSticker = tin.loai_tin === "chat.sticker";

  const isSending = status === "sending";
  const isError = status === "error";

  let bubbleClass: string;
  if (isSticker) {
    bubbleClass = "bg-transparent";
  } else if (isKhach) {
    bubbleClass = `bg-white text-gray-800 border border-gray-200 ${
      isGrouped ? "rounded-tl-sm" : "rounded-bl-sm"
    }`;
  } else if (isError) {
    bubbleClass = "bg-red-50 text-gray-800 border-2 border-red-300 rounded-br-sm";
  } else {
    bubbleClass = `bg-[#DCFCE7] text-gray-800 border border-green-200 ${
      isGrouped ? "rounded-tr-sm" : "rounded-br-sm"
    }`;
  }

  const rawSenderName = tin.nguoi_gui?.ho_ten || "Người dùng Zalo";
  const rawSenderAvatar = tin.nguoi_gui?.avatar || null;
  const showSenderInfo = isGroupChat && isKhach && !isGrouped;

  return (
    <>
      <div className={isGrouped ? "mt-0.5" : "mt-4"}>
        {/* Tên người gửi trong nhóm */}
        {showSenderInfo && (
          <p className="text-[10px] text-gray-400 font-medium ml-9 mb-0.5 truncate max-w-[65%]">
            {rawSenderName}
          </p>
        )}

        <div className={`flex ${isKhach ? "justify-start" : "justify-end"} items-end gap-1.5`}>
          {/* Avatar hoặc Spacer */}
          {isGroupChat && isKhach && (
            <div className="flex-shrink-0 self-end w-6">
              {showSenderInfo ? (
                rawSenderAvatar ? (
                  <img
                    src={rawSenderAvatar}
                    alt={rawSenderName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <AvatarFallback
                    name={rawSenderName}
                    size="w-6 h-6"
                    textSize="text-[10px]"
                    bgColor="bg-blue-100"
                  />
                )
            ) : (
              <div className="w-6 h-6" />
            )}
          </div>
        )}

        {/* Error icon */}
        {isError && (
          <button
            className="self-center mr-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-red-600 transition-colors"
            title="Gửi thất bại. Click để thử lại."
          >
            <span className="text-white text-xs font-bold leading-none">!</span>
          </button>
        )}

        <div
          className={`
            max-w-[65%] rounded-xl relative
            ${isSticker ? "" : isPhoto ? "p-1.5" : "px-3.5 py-2"}
            ${bubbleClass}
            ${isSending ? "opacity-60" : ""}
          `}
        >
          {/* Nội dung: Sticker / Ảnh / Text */}
          {isSticker && tin.noi_dung ? (
            <img
              src={tin.noi_dung}
              alt="Sticker"
              referrerPolicy="no-referrer"
              className="w-32 h-32 object-contain"
              loading="lazy"
            />
          ) : isPhoto && tin.noi_dung ? (
            <img
              src={tin.noi_dung}
              alt="Ảnh"
              className="w-64 max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowLightbox(true)}
              loading="lazy"
            />
          ) : (
            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
              {tin.noi_dung}
            </p>
          )}

          {/* Timestamp / Status */}
          {!isSticker && (isLastInGroup || isSending || isError) && (
            <div className={`flex items-center gap-1 mt-0.5 ${isPhoto ? "px-1.5 pb-0.5" : ""}`}>
              <span
                className={`text-[10px] block ${
                  isKhach ? "text-gray-400" : isError ? "text-red-400" : "text-green-500"
                }`}
              >
                {isSending ? "Đang gửi..." : isError ? "Gửi thất bại" : formatChatTime(tin.created_at)}
              </span>
              {isSending && (
                <div className="w-3 h-3 border-[1.5px] border-green-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
          {isSticker && (
            <div className="flex justify-end mt-1">
              <span className={`text-[9px] ${isKhach ? "text-gray-400" : "text-gray-400"}`}>
                {formatChatTime(tin.created_at)}
              </span>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Lightbox — phóng to ảnh */}
      {showLightbox && isPhoto && tin.noi_dung && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            onClick={() => setShowLightbox(false)}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={tin.noi_dung}
            alt="Ảnh phóng to"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
