"use client";

// ============================================================
// TabChotThongTin — Sidebar phải: Form chốt thông tin đăng ký
// Workflow 1: Lưu dữ liệu khách hàng
//
// Flow:
// 1. CSKH bấm "✨ AI trích xuất thông tin"
// 2. Gom nội dung cuộc trò chuyện → POST sang n8n webhook
// 3. n8n dùng AI trích xuất ho_ten, sdt, nam_sinh... từ chat
// 4. n8n trả về JSON → web auto-fill vào SharedRegistrationForm
// ============================================================

import { useState, useCallback } from "react";
import { SharedRegistrationForm } from "@/components/dang-ky/SharedRegistrationForm";
import type { RegistrationFormValues } from "@/components/dang-ky/SharedRegistrationForm";
import { Loader2 } from "lucide-react";

// Webhook n8n xử lý AI trích xuất thông tin từ cuộc trò chuyện
const AI_EXTRACT_WEBHOOK =
  process.env.NEXT_PUBLIC_WEBHOOK_AI_TRICH_XUAT || "";

/** Tin nhắn đơn giản truyền từ page.tsx */
export interface SimplifiedMessage {
  noi_dung: string;
  chieu_gui: string; // "Khách gửi" | "Trung tâm gửi"
  created_at: string;
}

export function TabChotThongTin({
  messages,
  khachHoTen,
}: {
  /** Danh sách tin nhắn cuộc trò chuyện hiện tại */
  messages: SimplifiedMessage[];
  /** Tên khách hàng (dùng làm context cho AI, không phải auto-fill) */
  khachHoTen?: string | null;
}) {
  const [extractedData, setExtractedData] =
    useState<Partial<RegistrationFormValues> | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // ── Gọi n8n AI trích xuất ──
  const handleAIExtract = useCallback(async () => {
    if (extracting || messages.length === 0) return;

    setExtracting(true);
    setExtractError(null);

    try {
      // Gom nội dung chat thành text cho AI đọc
      const chatContent = messages.map((m) => {
        const sender = m.chieu_gui === "Khách gửi" ? (khachHoTen || "Khách hàng") : "CSKH";
        return `[${sender}]: ${m.noi_dung}`;
      }).join("\n");

      const res = await fetch(AI_EXTRACT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trich-xuat-thong-tin",
          chat_content: chatContent,
          khach_ho_ten: khachHoTen || "",
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // n8n trả về object chứa các field đã trích xuất
      // VD: { ho_ten: "Minh Thư", sdt: "0985415933", nam_sinh: "2005", ... }
      const extracted: Partial<RegistrationFormValues> = {};
      if (data.ho_ten) extracted.ho_ten = data.ho_ten;
      if (data.sdt) extracted.sdt = data.sdt;
      if (data.nam_sinh) extracted.nam_sinh = String(data.nam_sinh);
      if (data.lich_hoc) extracted.lich_hoc = data.lich_hoc;
      if (data.co_so) extracted.co_so = data.co_so;
      if (data.cap_do) extracted.cap_do = data.cap_do;
      if (data.nguon) extracted.nguon = data.nguon;

      setExtractedData(extracted);
    } catch (err) {
      console.error("[AI Extract] Error:", err);
      setExtractError("Không thể trích xuất. Vui lòng thử lại.");
    } finally {
      setExtracting(false);
    }
  }, [messages, khachHoTen, extracting]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
      {/* ── Nút AI trích xuất thông tin ── */}
      <button
        onClick={handleAIExtract}
        disabled={extracting || messages.length === 0}
        className={`
          w-full py-2.5 text-xs font-medium rounded-lg transition-all
          flex items-center justify-center gap-1.5 shadow-sm
          ${extracting
            ? "bg-gray-100 text-gray-400 cursor-wait"
            : messages.length === 0
              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white cursor-pointer hover:shadow-md"
          }
        `}
      >
        {extracting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Đang trích xuất...
          </>
        ) : (
          <>
            <span className="text-sm">✨</span>
            Dùng AI trích xuất thông tin
          </>
        )}
      </button>

      {/* Thông báo lỗi */}
      {extractError && (
        <p className="text-[10px] text-red-500 text-center bg-red-50 rounded-md py-1.5 px-2">
          ⚠ {extractError}
        </p>
      )}

      {/* Thông báo thành công */}
      {extractedData && !extractError && (
        <p className="text-[10px] text-emerald-600 text-center bg-emerald-50 rounded-md py-1.5 px-2">
          ✅ Đã trích xuất xong — kiểm tra và bổ sung thông tin bên dưới
        </p>
      )}

      {/* ── Form đăng ký (compact mode) ── */}
      <SharedRegistrationForm
        compact
        initialData={extractedData || undefined}
        idPrefix="sidebar-dk"
      />
    </div>
  );
}
