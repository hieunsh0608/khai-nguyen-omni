// ============================================================
// Database Types — Khai Nguyên Omni
// Cập nhật theo schema mới (hỗ trợ Zalo Group Chat)
// ============================================================

/**
 * Bảng `khach_hang` — Chỉ chứa khách nhắn tin (Zalo/Facebook)
 */
export interface KhachHang {
  id: string;                      // UUID, Primary Key
  zalo_id: string | null;
  fb_id: string | null;
  ho_ten: string | null;
  sdt: string | null;              // SĐT — dùng để cross-query sang bảng hoc_vien
  avatar: string | null;
  ghi_chu: string | null;
  is_zalo_friend: boolean | null;  // true nếu tài khoản Zalo trung tâm đã kết bạn
  created_at: string;              // TIMESTAMP
}

/**
 * Bảng `hoc_vien` — Chứa thông tin học tập (từ Google Sheet)
 */
export interface HocVien {
  sdt: string;         // TEXT, Unique (dùng làm key chính)
  ho_ten: string | null;
  // Lưu ý: zalo_id KHÔNG có trong bảng hoc_vien trên Supabase.
  // Việc ghép Zalo ID được xử lý qua tính năng "Ghép Mã" (bảng khac_hang).
  trinh_do: string | null;
  ma_lop: string | null;
  giao_vien: string | null;
  lich_hoc: string | null;
  ghi_chu: string | null;
}

/**
 * Bảng `zalo_nhom` — Group chat trên Zalo
 */
export interface ZaloNhom {
  id: string;          // UUID, Primary Key
  group_id: string;    // Zalo Group ID
  ten_nhom: string | null;
  avatar_nhom: string | null;
}

/**
 * Bảng `thanh_vien_nhom` — Thành viên trong group Zalo
 * Có thể join thêm khach_hang để lấy thông tin user
 */
export interface ThanhVienNhom {
  nhom_id: string;        // FK → zalo_nhom.id
  khach_hang_id: string;  // FK → khach_hang.id
  khach_hang?: KhachHang; // Relation — join để lấy tên, avatar
}

/**
 * Bảng `hoi_thoai` — Mỗi hội thoại gắn với 1 khách hàng HOẶC 1 nhóm
 */
export interface HoiThoai {
  id: string;                      // UUID, Primary Key
  khach_hang_id: string | null;    // FK → khach_hang.id (null nếu là nhóm)
  zalo_nhom_id?: string | null;    // FK → zalo_nhom.id (null nếu là 1-1)
  nguon_den: string | null;        // Ví dụ: 'Zalo', 'Facebook'
  ai_dang_bat: boolean;
  nhan_vien_nhan: string | null;
  updated_at: string;              // TIMESTAMP
}

/**
 * Bảng `tin_nhan` — Tin nhắn trong 1 hội thoại
 */
export interface TinNhan {
  id: string;                   // UUID, Primary Key
  hoi_thoai_id: string;         // FK → hoi_thoai.id
  chieu_gui: string;            // 'Khách gửi' | 'Trung tâm gửi'
  noi_dung: string | null;
  loai_tin: string | null;      // Ví dụ: 'text', 'chat.photo', 'chat.sticker'
  created_at: string;           // TIMESTAMP
  nguoi_gui_id?: string | null; // FK → khach_hang.id (ai gửi trong nhóm)
  nguoi_gui?: KhachHang;        // Relation — join để lấy tên, avatar người gửi
}

// ============================================================
// Derived / Joined Types — Dùng trong frontend
// ============================================================

/**
 * Hội thoại đã ghép với thông tin khách hàng + nhóm + tin nhắn cuối
 */
export interface HoiThoaiWithDetails extends HoiThoai {
  khach_hang: KhachHang | null;
  tin_nhan_cuoi: TinNhan | null;
  zalo_nhom?: ZaloNhom | null;   // Có khi là group chat
}
