"use client";

// ============================================================
// TabThongTinNhom — Sidebar phải: Quản lý nhóm Zalo
// Workflow 6: Chức năng Zalo nhóm
//   • Quét/Đồng bộ thông tin nhóm
//   • Đổi tên nhóm
//   • Thêm/Xóa thành viên
//   • Lấy link mời
//   • Bot rời nhóm
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";
import { AvatarFallback, TimKiemHocVien } from "@/components/shared";
import {
  quetThongTinNhom,
  capNhatTenNhom,
  themThanhVien,
  xoaThanhVien,
  roiKhoiNhom,
  layLinkMoi,
} from "@/utils/zaloGroupService";
import type { ZaloNhom, ThanhVienNhom } from "@/types/database";
import type { KhachHangResult, ActionKey, ActionState } from "@/types/ui";

export function TabThongTinNhom({ zaloNhomId }: { zaloNhomId: string }) {
  const [nhom, setNhom] = useState<ZaloNhom | null>(null);
  const [thanhVien, setThanhVien] = useState<ThanhVienNhom[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionState, setActionState] = useState<Record<ActionKey, ActionState>>({
    quet: "idle",
    ten: "idle",
    them: "idle",
    xoa: "idle",
    roi: "idle",
  });

  const [tenMoi, setTenMoi] = useState("");
  const [themDanhSach, setThemDanhSach] = useState<KhachHangResult[]>([]);
  const [xoaId, setXoaId] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // ── Fetch dữ liệu từ Supabase ──
  const fetchNhom = useCallback(async () => {
    setLoading(true);
    try {
      const { data: nhomData } = await supabase
        .from("zalo_nhom")
        .select("*")
        .eq("id", zaloNhomId)
        .single();

      if (nhomData) setNhom(nhomData as ZaloNhom);

      const { data: tvData } = await supabase
        .from("thanh_vien_nhom")
        .select("nhom_id, khach_hang_id, khach_hang:khach_hang(*)")
        .eq("nhom_id", zaloNhomId);

      if (tvData) setThanhVien(tvData as unknown as ThanhVienNhom[]);
    } finally {
      setLoading(false);
    }
  }, [zaloNhomId]);

  useEffect(() => { fetchNhom(); }, [fetchNhom]);

  // ── Dispatch action chung ──
  const dispatch = useCallback(
    async (
      key: ActionKey,
      actionFn: () => Promise<{ ok: boolean }>,
      successMsg: string,
      errMsg: string
    ) => {
      setActionState((s) => ({ ...s, [key]: "pending" }));
      setToast(null);

      let isOk = false;
      try {
        const result = await actionFn();
        isOk = result.ok;

        if (isOk) {
          setToast({ type: "ok", msg: successMsg });
          setTimeout(() => { fetchNhom(); }, 2500);
        } else {
          setToast({ type: "err", msg: errMsg });
        }
      } catch (err) {
        console.error(`[dispatch:${key}] Unexpected error:`, err);
        setToast({ type: "err", msg: errMsg });
        isOk = false;
      } finally {
        const delay = isOk ? 2500 : 3000;
        setTimeout(() => {
          setActionState((s) => ({ ...s, [key]: "idle" }));
          setTimeout(() => setToast(null), 1500);
        }, delay);
      }
    },
    [fetchNhom]
  );

  // ── Handlers ──
  const handleQuet = () => {
    if (!nhom?.group_id || actionState.quet !== "idle") return;
    dispatch("quet", () => quetThongTinNhom(nhom.group_id), "Đang đồng bộ thông tin nhóm...", "Không thể kết nối n8n. Thử lại sau.");
  };

  const handleDoiTen = () => {
    const ten = tenMoi.trim();
    if (!ten || !nhom?.group_id || actionState.ten !== "idle") return;
    dispatch("ten", () => capNhatTenNhom(nhom.group_id, ten), `Đang đổi tên thành "${ten}"...`, "Lỗi khi đổi tên nhóm.").then(() => setTenMoi(""));
  };

  const handleThemTV = () => {
    const zaloIds = themDanhSach.map((kh) => kh.zalo_id).filter((id): id is string => !!id);
    if (zaloIds.length === 0 || !nhom?.group_id || actionState.them !== "idle") return;
    const tenList = themDanhSach.map((kh) => kh.ho_ten || "?").join(", ");
    dispatch("them", () => themThanhVien(nhom.group_id, zaloIds), `Đã gửi yêu cầu thêm ${zaloIds.length} thành viên: ${tenList}.`, "Lỗi khi thêm thành viên.").then(() => setThemDanhSach([]));
  };

  const handleLayLinkMoi = () => {
    if (!nhom?.group_id || actionState.quet !== "idle") return;
    dispatch("quet", () => layLinkMoi(nhom.group_id), "Đang lấy link mời... n8n sẽ chat link vào nhóm.", "Lỗi khi lấy link mời.");
  };

  const handleXoaTV = (zaloId: string) => {
    if (!nhom?.group_id || actionState.xoa !== "idle") return;
    setXoaId(zaloId);
    dispatch("xoa", () => xoaThanhVien(nhom.group_id, zaloId), "Đang xóa thành viên khỏi nhóm...", "Lỗi khi xóa thành viên.").then(() => setXoaId(""));
  };

  const handleRoiNhom = () => {
    if (!nhom?.group_id || actionState.roi !== "idle") return;
    if (!window.confirm("Bot sẽ rời khỏi nhóm này. Bạn chắc chắn?")) return;
    dispatch("roi", () => roiKhoiNhom(nhom.group_id), "Bot đang rời nhóm...", "Lỗi khi rời nhóm.");
  };

  const isPending = (key: ActionKey) => actionState[key] === "pending";
  const btnBase = "flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 transition-all duration-150 disabled:cursor-not-allowed";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Đang tải thông tin nhóm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`px-3 py-2 rounded-lg text-xs font-medium text-center transition-all animate-[fadeIn_0.2s_ease-out] ${
          toast.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
        }`}>
          {toast.type === "ok" ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}

      {/* Header: Avatar + tên nhóm */}
      <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
        {nhom?.avatar_nhom ? (
          <img src={nhom.avatar_nhom} alt={nhom.ten_nhom || "Nhóm"} className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-200 ring-offset-2 mb-2" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-2 ring-2 ring-indigo-200 ring-offset-2">
            <svg className="w-8 h-8 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.97 5.97 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.97 5.97 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
            </svg>
          </div>
        )}
        <p className="text-sm font-semibold text-gray-800">{nhom?.ten_nhom || "Nhóm chưa có tên"}</p>
        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Zalo Group · {thanhVien.length} thành viên
        </span>

        {/* Nút Quét + Lấy link */}
        <div className="mt-3 flex gap-2">
          <button id="btn-quet-thong-tin-nhom" onClick={handleQuet} disabled={isPending("quet")} title="Làm mới tên, avatar, thành viên từ Zalo" className={`flex-1 ${btnBase} ${isPending("quet") ? "bg-indigo-50 text-indigo-400" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"}`}>
            {isPending("quet") ? (<><div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /><span>Đồng bộ...</span></>) : (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>Làm mới</span></>)}
          </button>
          <button id="btn-lay-link-moi" onClick={handleLayLinkMoi} disabled={isPending("quet")} title="Lấy link mời — n8n chat link vào nhóm" className={`flex-1 ${btnBase} ${isPending("quet") ? "bg-teal-50 text-teal-400" : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <span>Link mời</span>
          </button>
        </div>
      </div>

      {/* Đổi tên nhóm */}
      <div className="space-y-2">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Đổi tên nhóm</p>
        <div className="flex gap-2">
          <input id="input-ten-nhom-moi" type="text" value={tenMoi} onChange={(e) => setTenMoi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleDoiTen(); }} placeholder="Nhập tên mới..." disabled={isPending("ten")} className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-gray-50 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-gray-300 disabled:opacity-50" />
          <button id="btn-doi-ten-nhom" onClick={handleDoiTen} disabled={!tenMoi.trim() || isPending("ten")} className={`${btnBase} px-3 flex-shrink-0 ${!tenMoi.trim() || isPending("ten") ? "bg-gray-100 text-gray-400" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
            {isPending("ten") ? (<div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />) : (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>)}
          </button>
        </div>
      </div>

      {/* Thêm thành viên */}
      <div className="space-y-2">
        <TimKiemHocVien label="Thêm thành viên vào nhóm" placeholder="Gõ tên hoặc SĐT để thêm..." multi={true} onSelect={(kh) => { setThemDanhSach((prev) => prev.find((x) => x.id === kh.id) ? prev : [...prev, kh]); }} selected={themDanhSach} onRemove={(id) => setThemDanhSach((prev) => prev.filter((x) => x.id !== id))} excludeIds={[...themDanhSach.map((x) => x.id), ...thanhVien.map((tv) => tv.khach_hang_id)]} />
        {themDanhSach.length > 0 && (
          <button id="btn-them-thanh-vien" onClick={handleThemTV} disabled={isPending("them")} className={`w-full ${btnBase} justify-center ${isPending("them") ? "bg-emerald-50 text-emerald-400" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"}`}>
            {isPending("them") ? (<><div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-white rounded-full animate-spin" /><span>Đang thêm {themDanhSach.length} người...</span></>) : (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg><span>Thêm {themDanhSach.length} người vào nhóm</span></>)}
          </button>
        )}
      </div>

      {/* Danh sách thành viên + Xóa */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">Thành viên ({thanhVien.length})</p>
        <div className="space-y-1.5">
          {thanhVien.length === 0 && (<p className="text-xs text-gray-400 text-center py-2">Chưa có thành viên</p>)}
          {thanhVien.map((tv) => {
            const member = tv.khach_hang;
            const name = member?.ho_ten || "Thành viên";
            const zaloId = member?.zalo_id || "";
            const isBeingRemoved = isPending("xoa") && xoaId === zaloId;

            return (
              <div key={tv.khach_hang_id} className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all ${isBeingRemoved ? "bg-red-50 opacity-60" : "hover:bg-gray-50"}`}>
                {member?.avatar ? (
                  <img src={member.avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <AvatarFallback name={name} size="w-8 h-8" textSize="text-xs" bgColor="bg-indigo-50" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
                  {member?.sdt && <p className="text-[10px] text-gray-400">{member.sdt}</p>}
                </div>
                {zaloId && (
                  <button id={`btn-xoa-tv-${tv.khach_hang_id}`} onClick={() => handleXoaTV(zaloId)} disabled={isPending("xoa")} title="Kích khỏi nhóm" className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
                    {isBeingRemoved ? (<div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />) : (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rời nhóm */}
      <div className="pt-2 border-t border-gray-100">
        <button id="btn-roi-khoi-nhom" onClick={handleRoiNhom} disabled={isPending("roi")} className={`w-full ${btnBase} justify-center ${isPending("roi") ? "bg-red-50 text-red-400 cursor-not-allowed" : "bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"}`}>
          {isPending("roi") ? (<><div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" /><span>Bot đang rời nhóm...</span></>) : (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg><span>Bot rời khỏi nhóm</span></>)}
        </button>
      </div>
    </div>
  );
}
