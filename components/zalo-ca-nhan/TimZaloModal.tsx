"use client";

// ============================================================
// TimZaloModal — Tìm khách hàng mới qua Zalo (theo SĐT)
// Workflow 5: Chức năng Zalo cá nhân
//   • Tìm người dùng theo SĐT (find_user)
//   • Ghép mã SĐT ↔ Zalo ID (ghep_ma) → Workflow 4
//   • Gửi kết bạn (add_friend)
//   • Bắt đầu Chat
// ============================================================

import { useState, useEffect, useRef } from "react";
import type { TimZaloResult } from "@/types/ui";

export function TimZaloModal({
  isOpen,
  onClose,
  onStartChat,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (result: TimZaloResult) => Promise<void>;
}) {
  const [sdt, setSdt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimZaloResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Action button states (independent)
  const [ghepMaLoading, setGhepMaLoading] = useState(false);
  const [ghepMaDone, setGhepMaDone] = useState(false);
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [addFriendDone, setAddFriendDone] = useState(false);
  const [startChatLoading, setStartChatLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Focus input khi mở modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSdt("");
      setLoading(false);
      setResult(null);
      setError(null);
      setGhepMaLoading(false);
      setGhepMaDone(false);
      setAddFriendLoading(false);
      setAddFriendDone(false);
      setStartChatLoading(false);
      setActionFeedback(null);
    }
  }, [isOpen]);

  // Đóng bằng Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // ── Action 1: Tìm kiếm ──
  const handleSearch = async () => {
    const cleanSdt = sdt.replace(/\D/g, "");
    if (!cleanSdt) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setGhepMaDone(false);
    setAddFriendDone(false);
    setActionFeedback(null);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_WEBHOOK_TIM_ZALO || "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "find_user", sdt: cleanSdt }),
        }
      );

      if (!res.ok) {
        setError("Không tìm thấy Zalo với số điện thoại này, hoặc họ chặn tìm kiếm.");
        return;
      }

      const data = await res.json();

      if (data && data.zalo_id) {
        setResult({
          zalo_id: data.zalo_id,
          ten: data.ten || data.name || "Không rõ tên",
          avatar: data.avatar || "",
          is_zalo_friend: data.is_zalo_friend ?? null,
        });
      } else {
        setError("Không tìm thấy Zalo với số điện thoại này, hoặc họ chặn tìm kiếm.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ── Action: Xác nhận SĐT (Ghép Mã) ──
  const handleGhepMa = async () => {
    if (!result || ghepMaLoading || ghepMaDone) return;
    const cleanSdt = sdt.replace(/\D/g, "");

    setGhepMaLoading(true);
    setActionFeedback(null);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_WEBHOOK_GHEP_MA || "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sdt: cleanSdt, zalo_id: result.zalo_id }),
        }
      );

      if (res.ok) {
        setGhepMaDone(true);
        setActionFeedback({ type: "success", message: "Đã ghép mã SĐT thành công!" });
      } else {
        setActionFeedback({ type: "error", message: `Lỗi ghép mã (${res.status}). Vui lòng thử lại.` });
      }
    } catch {
      setActionFeedback({ type: "error", message: "Lỗi kết nối. Vui lòng thử lại." });
    } finally {
      setGhepMaLoading(false);
    }
  };

  // ── Action: Kết bạn Zalo ──
  const handleAddFriend = async () => {
    if (!result || addFriendLoading || addFriendDone) return;
    const cleanSdt = sdt.replace(/\D/g, "");

    setAddFriendLoading(true);
    setActionFeedback(null);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_WEBHOOK_TIM_ZALO || "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_friend", sdt: cleanSdt }),
        }
      );

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.zalo_id && data.zalo_id !== result.zalo_id) {
          setResult((prev) => prev ? { ...prev, zalo_id: data.zalo_id } : prev);
        }
        setAddFriendDone(true);
        setActionFeedback({ type: "success", message: "Đã gửi lời mời kết bạn!" });
      } else {
        setActionFeedback({ type: "error", message: `Lỗi kết bạn (${res.status}). Vui lòng thử lại.` });
      }
    } catch {
      setActionFeedback({ type: "error", message: "Lỗi kết nối. Vui lòng thử lại." });
    } finally {
      setAddFriendLoading(false);
    }
  };

  // ── Action: Bắt đầu Chat ──
  const handleStartChat = async () => {
    if (!result || startChatLoading) return;
    setStartChatLoading(true);
    try {
      await onStartChat(result);
      onClose();
    } finally {
      setStartChatLoading(false);
    }
  };

  if (!isOpen) return null;

  const anyActionLoading = ghepMaLoading || addFriendLoading || startChatLoading;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[modalIn_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Tìm khách hàng mới qua Zalo</h2>
              <p className="text-white/70 text-xs mt-0.5">Nhập SĐT để tra cứu tài khoản Zalo</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Input + Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <input
                ref={inputRef}
                id="tim-zalo-sdt-input"
                type="tel"
                value={sdt}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setSdt(val);
                  if (error) setError(null);
                  if (result) {
                    setResult(null);
                    setGhepMaDone(false);
                    setAddFriendDone(false);
                    setActionFeedback(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sdt.trim() && !loading) handleSearch();
                }}
                placeholder="Nhập số điện thoại..."
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                disabled={loading}
              />
            </div>
            <button
              id="tim-zalo-submit-btn"
              onClick={handleSearch}
              disabled={!sdt.trim() || loading}
              className={`
                px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap
                ${!sdt.trim() || loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md cursor-pointer"
                }
              `}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  Đang tìm...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Tìm kiếm
                </>
              )}
            </button>
          </div>

          {/* Kết quả tìm kiếm — Tìm thấy */}
          {result && (
            <div className="mt-5 p-4 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center gap-3">
                {result.avatar ? (
                  <img
                    src={result.avatar}
                    alt={result.ten}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-300 ring-offset-2"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-200 flex items-center justify-center ring-2 ring-emerald-300 ring-offset-2">
                    <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{result.ten}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Zalo ID: <span className="font-mono text-gray-600">{result.zalo_id}</span></p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Tìm thấy trên Zalo
                  </span>
                </div>
              </div>

              {/* 3 Action Buttons */}
              <div className="mt-4 flex flex-col gap-2">
                {/* Nút 1: Xác nhận SĐT (Ghép Mã) */}
                <button
                  id="tim-zalo-ghep-ma-btn"
                  onClick={handleGhepMa}
                  disabled={ghepMaLoading || ghepMaDone || anyActionLoading}
                  className={`
                    w-full py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
                    ${ghepMaDone
                      ? "bg-emerald-100 text-emerald-700 cursor-default"
                      : ghepMaLoading
                        ? "bg-orange-400 text-white cursor-wait"
                        : anyActionLoading
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm hover:shadow-md cursor-pointer"
                    }
                  `}
                >
                  {ghepMaDone ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Đã ghép mã thành công</>
                  ) : ghepMaLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />Đang ghép mã...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Xác nhận SĐT (Ghép mã)</>
                  )}
                </button>

                {/* Nút 2: Kết bạn Zalo */}
                {result.is_zalo_friend === true ? (
                  <div className="w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ✓ Đã là bạn bè Zalo
                  </div>
                ) : (
                  <button
                    id="tim-zalo-add-friend-btn"
                    onClick={handleAddFriend}
                    disabled={addFriendLoading || addFriendDone || anyActionLoading}
                    className={`
                      w-full py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
                      ${addFriendDone
                        ? "bg-blue-50 text-blue-600 cursor-default"
                        : addFriendLoading
                          ? "bg-blue-400 text-white cursor-wait"
                          : anyActionLoading
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md cursor-pointer"
                      }
                    `}
                  >
                    {addFriendDone ? (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Đã gửi lời mời</>
                    ) : addFriendLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />Đang gửi...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>Kết bạn Zalo</>
                    )}
                  </button>
                )}

                {/* Nút 3: Bắt đầu Chat */}
                <button
                  id="tim-zalo-start-chat-btn"
                  onClick={handleStartChat}
                  disabled={anyActionLoading}
                  className={`
                    w-full py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
                    border
                    ${anyActionLoading
                      ? "border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                    }
                  `}
                >
                  {startChatLoading ? (
                    <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /><span>Đang tìm hội thoại...</span></>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span>Bắt đầu Chat</span></>
                  )}
                </button>
              </div>

              {/* Action Feedback */}
              {actionFeedback && (
                <div
                  className={`mt-3 px-3 py-2 rounded-lg text-xs text-center font-medium animate-[fadeIn_0.2s_ease-out] ${actionFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                    }`}
                >
                  {actionFeedback.type === "success" ? "✅" : "⚠️"}{" "}
                  {actionFeedback.message}
                </div>
              )}
            </div>
          )}

          {/* Lỗi / Không tìm thấy */}
          {error && (
            <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">Không tìm thấy</p>
                <p className="text-xs text-red-500 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
