// ============================================================
// UI Types — dùng bởi các component frontend
// Tách riêng khỏi database.ts để không lẫn lộn
// ============================================================

import type { TinNhan, KhachHang } from "./database";

// Trạng thái optimistic UI cho tin nhắn
export type MessageStatus = "sending" | "sent" | "error";

// Tin nhắn mở rộng — thêm status + temp ID cho optimistic UI
export interface UITinNhan extends TinNhan {
  status?: MessageStatus;
  _tempId?: string; // ID tạm để match khi Realtime trả về
  nguoi_gui?: KhachHang; // Override để ensure typed
}

// Kết quả tìm Zalo theo SĐT
export interface TimZaloResult {
  zalo_id: string;
  ten: string;
  avatar: string;
  is_zalo_friend: boolean | null; // null = chưa rõ (KH chưa có trong DB)
}

// Kết quả tìm kiếm khách hàng (dùng trong search + tạo nhóm)
export interface KhachHangResult {
  id: string;
  zalo_id: string | null;
  ho_ten: string | null;
  sdt: string | null;
  avatar: string | null;
}

// 3 trạng thái matching SĐT → hoc_vien
export type MatchStatus = "loading" | "no-sdt" | "sdt-not-found" | "found";

// Trạng thái actions trong TabThongTinNhom
export type ActionKey = "quet" | "ten" | "them" | "xoa" | "roi";
export type ActionState = "idle" | "pending" | "ok" | "err";
