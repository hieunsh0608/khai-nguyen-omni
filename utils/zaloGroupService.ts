// ============================================================
// Zalo Group Service — Đa năng Webhook
// Tất cả thao tác quản lý nhóm đều gọi về 1 endpoint duy nhất.
// Cấu trúc payload: { action, data } — Backend (n8n) phân loại theo action.
// ============================================================

const ZALO_NHOM_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_WEBHOOK_ZALO_NHOM ||
  "https://n8n.khainguyenhoangu.com/webhook/chuc-nang-zalo-nhom";

// ── Kiểu kết quả trả về chung ───────────────────────────────
export interface ZaloGroupActionResult {
  ok: boolean;         // true nếu n8n nhận thành công (HTTP 2xx)
  action: string;
  error?: string;
}

// ── Hàm gọi webhook nội bộ (private) ────────────────────────
async function callZaloNhomWebhook(
  action: string,
  data: Record<string, unknown>
): Promise<ZaloGroupActionResult> {
  try {
    const res = await fetch(ZALO_NHOM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });

    return { ok: res.ok, action };
  } catch (err) {
    console.error(`[ZaloGroupService] ${action} error:`, err);
    return { ok: false, action, error: "Lỗi kết nối tới webhook" };
  }
}

// ============================================================
// Action 1: QUET_THONG_TIN_NHOM
// Làm mới tên, avatar, số lượng thành viên từ Zalo về DB
// ============================================================
export async function quetThongTinNhom(
  groupId: string
): Promise<ZaloGroupActionResult> {
  return callZaloNhomWebhook("QUET_THONG_TIN_NHOM", {
    group_id: groupId,
  });
}

// ============================================================
// Action 2: TAO_NHOM_MOI
// Tạo Zalo Group mới, đồng thời add thành viên ban đầu
// ============================================================
export async function taoNhomMoi(
  tenNhom: string,
  thanhVienIds: string[]
): Promise<ZaloGroupActionResult> {
  return callZaloNhomWebhook("TAO_NHOM_MOI", {
    ten_nhom: tenNhom,
    thanh_vien_ids: thanhVienIds,
  });
}

// ============================================================
// Action 3: THEM_THANH_VIEN
// Thêm một hoặc nhiều thành viên vào nhóm đã có
// ============================================================
export async function themThanhVien(
  groupId: string,
  thanhVienIds: string[]
): Promise<ZaloGroupActionResult> {
  return callZaloNhomWebhook("THEM_THANH_VIEN", {
    group_id: groupId,
    thanh_vien_ids: thanhVienIds,
  });
}

// ============================================================
// Action 4: XOA_THANH_VIEN
// Kích một thành viên ra khỏi nhóm
// ============================================================
export async function xoaThanhVien(
  groupId: string,
  zaloIdCanXoa: string
): Promise<ZaloGroupActionResult> {
  return callZaloNhomWebhook("XOA_THANH_VIEN", {
    group_id: groupId,
    zalo_id_can_xoa: zaloIdCanXoa,
  });
}

// ============================================================
// Action 5: CAP_NHAT_TEN_NHOM
// Đổi tên nhóm từ web, n8n sẽ gọi Zalo API + update Supabase
// ============================================================
export async function capNhatTenNhom(
  groupId: string,
  tenNhomMoi: string
): Promise<ZaloGroupActionResult> {
  return callZaloNhomWebhook("CAP_NHAT_TEN_NHOM", {
    group_id: groupId,
    ten_nhom_moi: tenNhomMoi,
  });
}

// ============================================================
// Action 6: ROI_KHOI_NHOM
// Cho phép tài khoản Zalo trung tâm (bot) tự out khỏi nhóm
// ============================================================
export async function roiKhoiNhom(
  groupId: string
): Promise<ZaloGroupActionResult> {
  return callZaloNhomWebhook("ROI_KHOI_NHOM", {
    group_id: groupId,
  });
}

// ============================================================
// Action 7: LAY_LINK_MOI
// Lấy link mời vào nhóm — n8n xử lý và tự chat link vào nhóm
// ============================================================
export async function layLinkMoi(
  groupId: string
): Promise<ZaloGroupActionResult> {
  return callZaloNhomWebhook("LAY_LINK_MOI", {
    group_id: groupId,
  });
}

// ============================================================
// Action 8: DONG_BO_BAN_BE
// Đồng bộ danh sách bạn bè Zalo về Supabase (update is_zalo_friend)
// Dùng endpoint cá nhân: NEXT_PUBLIC_WEBHOOK_TIM_ZALO
// ============================================================
export async function dongBoBanBe(): Promise<ZaloGroupActionResult> {
  const url =
    process.env.NEXT_PUBLIC_WEBHOOK_TIM_ZALO ||
    "https://n8n.khainguyenhoangu.com/webhook/chuc-nang-zalo-ca-nhan";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DONG_BO_BAN_BE" }),
    });

    return { ok: res.ok, action: "DONG_BO_BAN_BE" };
  } catch (err) {
    console.error("[dongBoBanBe] Lỗi kết nối:", err);
    return { ok: false, action: "DONG_BO_BAN_BE", error: "Lỗi kết nối tới webhook" };
  }
}
