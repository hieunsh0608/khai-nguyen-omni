"use client";

// ============================================================
// ChatBubble — Hiển thị tin nhắn (text, ảnh, sticker)
// Workflow: Tin nhắn Zalo → Supabase → Web (hiển thị)
// Hỗ trợ Group Chat: avatar + tên người gửi
// isGrouped = true: tin liền kề cùng người → ẩn avatar/tên
// ============================================================

import { useState, useCallback } from "react";
import { formatChatTime } from "@/lib/formatters";
import { AvatarFallback } from "@/components/shared";
import type { UITinNhan } from "@/types/ui";

/** Fallback copy cho trình duyệt không hỗ trợ clipboard API */
function fallbackCopy(text: string, onSuccess: () => void) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); onSuccess(); } catch { }
  document.body.removeChild(ta);
}

/** Trả về màu icon theo đuôi file */
function getFileIconStyle(ext: string): { bg: string; text: string } {
  const e = ext.toLowerCase();
  if (e === "pptx" || e === "ppt") return { bg: "bg-orange-500", text: "P" };
  if (e === "docx" || e === "doc") return { bg: "bg-blue-600", text: "W" };
  if (e === "xlsx" || e === "xls") return { bg: "bg-emerald-600", text: "X" };
  if (e === "pdf") return { bg: "bg-red-600", text: "PDF" };
  if (e === "zip" || e === "rar" || e === "7z") return { bg: "bg-yellow-600", text: "Z" };
  if (e === "mp4" || e === "mov" || e === "avi") return { bg: "bg-purple-600", text: "▶" };
  if (e === "mp3" || e === "wav") return { bg: "bg-pink-500", text: "♪" };
  return { bg: "bg-gray-500", text: "F" };
}

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
  const isRecommended = tin.loai_tin === "chat.recommended";
  const isFile = tin.loai_tin === "share.file";

  // Parse file: "[File] TenFile.ext - https://..."
  const fileInfo = isFile && tin.noi_dung
    ? (() => {
      const match = tin.noi_dung!.match(/^\[File\]\s*(.+?)\s*-\s*(https?:\/\/.+)$/);
      if (match) {
        const fileName = match[1].trim();
        const url = match[2].trim();
        const ext = fileName.includes(".") ? fileName.split(".").pop()! : "";
        return { fileName, url, ext };
      }
      return null;
    })()
    : null;

  // Parse danh thiếp: "[Danh thiếp] Tên - SĐT"
  const contactInfo = isRecommended && tin.noi_dung
    ? (() => {
      const match = tin.noi_dung!.match(/^\[Danh thiếp\]\s*(.+?)\s*-\s*(\d[\d\s]*)$/);
      if (match) return { name: match[1].trim(), phone: match[2].replace(/\s/g, "") };
      return null;
    })()
    : null;

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback((phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const onSuccess = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

    // Modern API
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(phone).then(onSuccess).catch(() => fallbackCopy(phone, onSuccess));
    } else {
      fallbackCopy(phone, onSuccess);
    }
  }, []);


  const isSending = status === "sending";
  const isError = status === "error";

  let bubbleClass: string;
  if (isSticker) {
    bubbleClass = "bg-transparent";
  } else if (isKhach) {
    bubbleClass = `bg-white text-gray-800 border border-gray-200 ${isGrouped ? "rounded-tl-sm" : "rounded-bl-sm"
      }`;
  } else if (isError) {
    bubbleClass = "bg-red-50 text-gray-800 border-2 border-red-300 rounded-br-sm";
  } else {
    bubbleClass = `bg-[#DCFCE7] text-gray-800 border border-green-200 ${isGrouped ? "rounded-tr-sm" : "rounded-br-sm"
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
            {/* Nội dung: Sticker / Ảnh / Danh thiếp / Text */}
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
            ) : isRecommended && contactInfo ? (
              /* ── Contact Card (Danh thiếp Zalo) ── */
              <div className="w-56 bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50/60 rounded-xl p-3 border border-blue-100/80">
                <div className="flex items-center gap-3 mb-2.5">
                  {/* Avatar tròn */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-gray-800 truncate">{contactInfo.name}</p>
                    <p className="text-[12px] text-gray-400 mt-0.5 tracking-wide">{contactInfo.phone}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleCopy(contactInfo.phone, e)}
                  className={`w-full text-[11px] font-medium py-1.5 rounded-lg border transition-all duration-200 ${copied
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 active:scale-[0.98]"
                    }`}
                >
                  {copied ? "✓ Đã sao chép" : "Sao chép SĐT"}
                </button>
              </div>
            ) : isFile && fileInfo ? (
              /* ── File Card (Chia sẻ file) ── */
              <a
                href={fileInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-56 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-3 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 group cursor-pointer no-underline"
              >
                {/* File icon */}
                <div className={`w-10 h-10 rounded-lg ${getFileIconStyle(fileInfo.ext).bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-white text-[11px] font-bold leading-none">
                    {getFileIconStyle(fileInfo.ext).text}
                  </span>
                </div>
                {/* File info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                    {fileInfo.fileName}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
                    {fileInfo.ext ? `.${fileInfo.ext}` : "File"} · Nhấn để tải
                  </p>
                </div>
                {/* Download arrow */}
                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
              </a>
            ) : (
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                {tin.noi_dung}
              </p>
            )}

            {/* Timestamp / Status */}
            {!isSticker && (isLastInGroup || isSending || isError) && (
              <div className={`flex items-center gap-1 mt-0.5 ${isPhoto ? "px-1.5 pb-0.5" : ""}`}>
                <span
                  className={`text-[10px] block ${isKhach ? "text-gray-400" : isError ? "text-red-400" : "text-green-500"
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
