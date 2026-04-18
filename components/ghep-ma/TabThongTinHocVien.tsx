"use client";

// ============================================================
// TabThongTinHocVien — Sidebar phải: Thông tin học viên
// Tính năng liên quan:
//   • Workflow 4 (Ghép mã): Form ghép SĐT ↔ Zalo ID
//   • Workflow 1 (Lưu dữ liệu): Hiển thị thông tin học viên
// ============================================================

import { useState } from "react";
import { InfoRow } from "@/components/shared";
import type { HocVien } from "@/types/database";
import type { MatchStatus } from "@/types/ui";

export function TabThongTinHocVien({
  hocVien,
  matchStatus,
  khachSdt,
  zaloId,
}: {
  hocVien: HocVien | null;
  matchStatus: MatchStatus;
  khachSdt: string | null;
  zaloId: string | null;
}) {
  const [ghepMaSdt, setGhepMaSdt] = useState("");
  const [ghepMaLoading, setGhepMaLoading] = useState(false);
  const [ghepMaResult, setGhepMaResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleGhepMa = async () => {
    const sdt = ghepMaSdt.trim();
    if (!sdt) return;

    setGhepMaLoading(true);
    setGhepMaResult(null);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_WEBHOOK_GHEP_MA || "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zalo_id: zaloId || "",
            sdt: sdt,
          }),
        }
      );

      if (res.ok) {
        setGhepMaResult({
          type: "success",
          message: "Gửi ghép mã thành công!",
        });
        setGhepMaSdt("");
      } else {
        setGhepMaResult({
          type: "error",
          message: `Lỗi server (${res.status}). Vui lòng thử lại.`,
        });
      }
    } catch {
      setGhepMaResult({
        type: "error",
        message: "Lỗi kết nối. Vui lòng kiểm tra mạng.",
      });
    } finally {
      setGhepMaLoading(false);
    }
  };

  // === Đang loading ===
  if (matchStatus === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Đang tra cứu học viên...</p>
        </div>
      </div>
    );
  }

  // === Khách chưa có SĐT → Form ghép mã ===
  if (matchStatus === "no-sdt") {
    return (
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-[240px]">
          <div className="text-center mb-4">
            <div className="w-14 h-14 mx-auto mb-3 bg-amber-50 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">Khách hàng mới</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Nhập SĐT để ghép mã Zalo với hồ sơ học viên.
            </p>
          </div>

          <div className="space-y-2.5">
            <input
              id="ghep-ma-sdt-input"
              type="tel"
              value={ghepMaSdt}
              onChange={(e) => {
                setGhepMaSdt(e.target.value);
                if (ghepMaResult) setGhepMaResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ghepMaSdt.trim() && !ghepMaLoading) {
                  handleGhepMa();
                }
              }}
              placeholder="Nhập SĐT khách hàng..."
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
              disabled={ghepMaLoading}
            />
            <button
              id="ghep-ma-submit-btn"
              onClick={handleGhepMa}
              disabled={!ghepMaSdt.trim() || ghepMaLoading}
              className={`
                w-full py-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5
                ${!ghepMaSdt.trim() || ghepMaLoading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md cursor-pointer"
                }
              `}
            >
              {ghepMaLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Kiểm tra &amp; Ghép Mã</span>
                </>
              )}
            </button>
          </div>

          {ghepMaResult && (
            <div
              className={`mt-3 px-3 py-2 rounded-lg text-xs text-center font-medium transition-all animate-[fadeIn_0.2s_ease-out] ${ghepMaResult.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-600 border border-red-200"
                }`}
            >
              {ghepMaResult.type === "success" ? "✅" : "⚠️"}{" "}
              {ghepMaResult.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === Có SĐT nhưng KHÔNG tìm thấy học viên ===
  if (matchStatus === "sdt-not-found") {
    return (
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-orange-50 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Chưa đăng ký</p>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Số điện thoại <span className="font-semibold text-gray-600">{khachSdt}</span><br />
            chưa đăng ký khóa học nào.
          </p>
          <p className="text-[11px] text-blue-500 mt-3 font-medium">
            → Chuyển sang tab &quot;Chốt thông tin&quot;
          </p>
        </div>
      </div>
    );
  }

  // === Tìm thấy học viên ===
  if (!hocVien) return null;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{hocVien.ho_ten || "—"}</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Học viên
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        <InfoRow icon="📱" label="Số điện thoại" value={hocVien.sdt} />
        <InfoRow icon="📊" label="Trình độ" value={hocVien.trinh_do} />
        <InfoRow icon="🏫" label="Mã lớp" value={hocVien.ma_lop} />
        <InfoRow icon="👩‍🏫" label="Giáo viên" value={hocVien.giao_vien} />
        <InfoRow icon="📅" label="Lịch học" value={hocVien.lich_hoc} />
        <InfoRow icon="📝" label="Ghi chú" value={hocVien.ghi_chu} />
      </div>
    </div>
  );
}
