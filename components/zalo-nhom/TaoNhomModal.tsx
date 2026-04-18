"use client";

// ============================================================
// TaoNhomModal — Modal tạo nhóm Zalo mới
// Workflow 6: Chức năng Zalo nhóm
// ============================================================

import { useState, useEffect } from "react";
import { TimKiemHocVien } from "@/components/shared";
import { taoNhomMoi } from "@/utils/zaloGroupService";
import type { KhachHangResult } from "@/types/ui";

export function TaoNhomModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tenNhom, setTenNhom] = useState("");
  const [danhSach, setDanhSach] = useState<KhachHangResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Reset khi đóng
  useEffect(() => {
    if (!isOpen) {
      setTenNhom(""); setDanhSach([]); setSubmitting(false); setResult(null);
    }
  }, [isOpen]);

  // ESC để đóng
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  const handleAddMember = (kh: KhachHangResult) => {
    if (danhSach.find((x) => x.id === kh.id)) return;
    setDanhSach((prev) => [...prev, kh]);
  };

  const handleRemoveMember = (id: string) => {
    setDanhSach((prev) => prev.filter((x) => x.id !== id));
  };

  const handleSubmit = async () => {
    if (!tenNhom.trim() || danhSach.length < 2) return;
    setSubmitting(true);
    setResult(null);

    const zaloIds = danhSach
      .map((kh) => kh.zalo_id)
      .filter((id): id is string => !!id);

    const res = await taoNhomMoi(tenNhom.trim(), zaloIds);

    if (res.ok) {
      setResult({ type: "ok", msg: "Đã gửi yêu cầu tạo nhóm! n8n đang xử lý..." });
      setTimeout(onClose, 2000);
    } else {
      setResult({ type: "err", msg: "Lỗi kết nối. Vui lòng thử lại." });
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const canSubmit = tenNhom.trim() && danhSach.length >= 2 && !submitting;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Tạo nhóm Zalo mới</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium block mb-1.5">Tên nhóm</label>
            <input
              id="tao-nhom-ten-input"
              type="text"
              value={tenNhom}
              onChange={(e) => setTenNhom(e.target.value)}
              placeholder="VD: HSK4 K28 — Lớp Tối"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-gray-300"
            />
          </div>

          <TimKiemHocVien
            label={`Thêm thành viên (đã chọn ${danhSach.length}/ít nhất 2)`}
            placeholder="Gõ tên hoặc SĐT học viên..."
            onSelect={handleAddMember}
            selected={danhSach}
            onRemove={handleRemoveMember}
            multi
          />

          {danhSach.length < 2 && (
            <p className="text-[10px] text-amber-500">⚠️ Zalo yêu cầu nhóm phải có ít nhất 3 người (gồm cả bot). Hãy chọn ít nhất 2 học viên.</p>
          )}

          {result && (
            <div className={`px-3 py-2 rounded-lg text-xs font-medium text-center ${
              result.type === "ok"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              {result.type === "ok" ? "✅" : "⚠️"} {result.msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            id="btn-xac-nhan-tao-nhom"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-2.5 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
              canSubmit
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /><span>Đang gửi...</span></>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg><span>Xác nhận tạo nhóm</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
