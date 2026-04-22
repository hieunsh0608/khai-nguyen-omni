"use client";

// ============================================================
// Home — Main Dashboard (Refactored)
// File gốc đã được tách thành các module nhỏ theo tính năng.
// ============================================================

import { useEffect, useState, useRef, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import { isSameDay, getDateLabel } from "@/lib/formatters";
import { supabase } from "@/utils/supabase/client";
import { dongBoBanBe } from "@/utils/zaloGroupService";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { MobileInfoDrawer } from "@/components/layout/MobileInfoDrawer";

// Types
import type {
  KhachHang,
  HoiThoai,
  TinNhan,
  HoiThoaiWithDetails,
  HocVien,
} from "@/types/database";
import type { UITinNhan, TimZaloResult, MatchStatus } from "@/types/ui";

// Layout
import { TopNavBar } from "@/components/layout/TopNavBar";
import type { NavTab } from "@/components/layout/TopNavBar";

// Đăng ký (embedded form)
import { DangKyForm } from "@/components/dang-ky/DangKyForm";

// Content Editor (Chính sách / Khóa học)
import { ContentEditor } from "@/components/content/ContentEditor";

// Shared
import { AvatarFallback, ChannelBadge, GroupBadge } from "@/components/shared";

// Chat (Workflow 2: Zalo→Supabase→Web + Workflow 3: Web→Zalo/Facebook)
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ConversationCard } from "@/components/chat/ConversationCard";

// Ghép mã & Lưu dữ liệu (Workflow 1 + 4)
import { TabThongTinHocVien } from "@/components/ghep-ma/TabThongTinHocVien";
import { TabChotThongTin } from "@/components/ghep-ma/TabChotThongTin";

// Zalo cá nhân (Workflow 5)
import { TimZaloModal } from "@/components/zalo-ca-nhan/TimZaloModal";

// Zalo nhóm (Workflow 6)
import { TaoNhomModal } from "@/components/zalo-nhom/TaoNhomModal";
import { TabThongTinNhom } from "@/components/zalo-nhom/TabThongTinNhom";

// ============================================================
// Main Component
// ============================================================

export default function Home() {
  // ── Top-level tab state (lifted from TopNavBar) ──
  const [activeTab, setActiveTab] = useState<NavTab>("tin-nhan");

  // ── Mobile responsive ──
  const isMobile = useIsMobile();
  const vvHeight = useVisualViewport();
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  const [conversations, setConversations] = useState<HoiThoaiWithDetails[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UITinNhan[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Right sidebar state
  const [rightTab, setRightTab] = useState<"hoc-vien" | "chot-info">("hoc-vien");
  const [hocVien, setHocVien] = useState<HocVien | null>(null);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("loading");
  const [khachSdt, setKhachSdt] = useState<string | null>(null);

  // Modal states
  const [showTimZaloModal, setShowTimZaloModal] = useState(false);
  const [showTaoNhomModal, setShowTaoNhomModal] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConvIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<HoiThoaiWithDetails[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔔 Âm thanh thông báo tin nhắn mới
  const notifySoundRef = useRef<HTMLAudioElement | null>(null);
  if (typeof window !== "undefined" && !notifySoundRef.current) {
    notifySoundRef.current = new Audio("/sounds/pop.mp3");
  }

  // Emoji refs & state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Click outside để đóng emoji picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Chèn emoji vào ô text
  const handleEmojiClick = (emojiObject: { emoji: string }) => {
    const start = textareaRef.current?.selectionStart || inputText.length;
    const end = textareaRef.current?.selectionEnd || inputText.length;

    const newText = inputText.substring(0, start) + emojiObject.emoji + inputText.substring(end);
    setInputText(newText);

    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + emojiObject.emoji.length, start + emojiObject.emoji.length);
    }, 0);
  };

  // Đồng bộ refs
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Auto-scroll khi messages thay đổi
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length === 0) { prevMsgCountRef.current = 0; return; }

    // Vừa load xong conversation → scroll instant (nhảy thẳng xuống cuối)
    // Tin nhắn mới đến → scroll smooth
    const isInitialLoad = prevMsgCountRef.current === 0 && messages.length > 0;
    const behavior = isInitialLoad ? "instant" as const : "smooth" as const;

    // setTimeout để đợi DOM render xong rồi mới scroll
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, isInitialLoad ? 50 : 0);

    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // --------------------------------------------------------
  // Fetch danh sách hội thoại ban đầu (hỗ trợ Group Chat)
  // --------------------------------------------------------
  useEffect(() => {
    const fetchConversations = async () => {
      const { data: hoiThoaiList, error: htError } = await supabase
        .from("hoi_thoai")
        .select("*, khach_hang(*), zalo_nhom(*)")
        .order("updated_at", { ascending: false });

      if (htError) {
        console.error("Lỗi fetch hội thoại:", htError);
        return;
      }

      if (!hoiThoaiList || hoiThoaiList.length === 0) {
        setConversations([]);
        return;
      }

      const hoiThoaiIds = (hoiThoaiList as HoiThoai[]).map((ht) => ht.id);
      let tinNhanMap: Record<string, TinNhan> = {};

      if (hoiThoaiIds.length > 0) {
        const { data: tinNhanList, error: tnError } = await supabase
          .from("tin_nhan")
          .select("*, nguoi_gui:khach_hang(*)")
          .in("hoi_thoai_id", hoiThoaiIds)
          .order("created_at", { ascending: false });

        if (tnError) {
          console.error("Lỗi fetch tin nhắn:", tnError);
        } else if (tinNhanList) {
          (tinNhanList as TinNhan[]).forEach((tn) => {
            if (!tinNhanMap[tn.hoi_thoai_id]) {
              tinNhanMap[tn.hoi_thoai_id] = tn;
            }
          });
        }
      }

      const merged: HoiThoaiWithDetails[] = (hoiThoaiList as (HoiThoai & {
        khach_hang: KhachHang | null;
        zalo_nhom: import("@/types/database").ZaloNhom | null;
      })[]).map((ht) => ({
        ...ht,
        khach_hang: ht.khach_hang || null,
        zalo_nhom: ht.zalo_nhom || null,
        tin_nhan_cuoi: tinNhanMap[ht.id] || null,
      }));

      setConversations(merged);
    };

    fetchConversations();
  }, []);

  // --------------------------------------------------------
  // Gửi tin nhắn → Optimistic UI + POST n8n Webhook
  // --------------------------------------------------------
  const handleSendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !selectedConvId || sending) return;

    const conv = conversationsRef.current.find((c) => c.id === selectedConvId);
    if (!conv) return;

    const tempId = `temp-${Date.now()}`;

    const tempMsg: UITinNhan = {
      id: tempId,
      _tempId: tempId,
      hoi_thoai_id: selectedConvId,
      chieu_gui: "Trung tâm gửi",
      noi_dung: text,
      loai_tin: "text",
      created_at: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");
    setSending(true);

    const payload = {
      zalo_id: conv.khach_hang?.zalo_id || "",
      text,
      hoi_thoai_id: selectedConvId,
      nguon_den: conv.nguon_den || "Zalo",
    };

    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === tempId ? { ...m, status: "sent" } : m
          )
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Lỗi gửi tin nhắn:", res.status, errData);
        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === tempId ? { ...m, status: "error" } : m
          )
        );
      }
    } catch (err) {
      console.error("Lỗi kết nối:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m._tempId === tempId ? { ...m, status: "error" } : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [inputText, selectedConvId, sending]);

  // Xử lý Enter gửi tin nhắn (Shift+Enter = xuống dòng)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // --------------------------------------------------------
  // Gửi ảnh → Optimistic UI + Supabase Storage + n8n Webhook
  // --------------------------------------------------------
  const handleSendImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedConvId || sending) return;

      e.target.value = "";

      const conv = conversationsRef.current.find((c) => c.id === selectedConvId);
      if (!conv) return;

      const tempId = `temp-img-${Date.now()}`;
      const previewUrl = URL.createObjectURL(file);

      const tempMsg: UITinNhan = {
        id: tempId,
        _tempId: tempId,
        hoi_thoai_id: selectedConvId,
        chieu_gui: "Trung tâm gửi",
        noi_dung: previewUrl,
        loai_tin: "chat.photo",
        created_at: new Date().toISOString(),
        status: "sending",
      };

      setMessages((prev) => [...prev, tempMsg]);
      setSending(true);

      const zaloId = conv.khach_hang?.zalo_id || "unknown";
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${zaloId}/${timestamp}_${safeName}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from("chat_media")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) {
          console.error("Lỗi upload ảnh:", uploadErr);
          setMessages((prev) =>
            prev.map((m) =>
              m._tempId === tempId ? { ...m, status: "error" } : m
            )
          );
          return;
        }

        const { data: urlData } = supabase.storage
          .from("chat_media")
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        const res = await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zalo_id: conv.khach_hang?.zalo_id || "",
            text: publicUrl,
            hoi_thoai_id: selectedConvId,
            nguon_den: conv.nguon_den || "Zalo",
            loai_tin: "chat.photo",
          }),
        });

        if (res.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m._tempId === tempId
                ? { ...m, noi_dung: publicUrl, status: "sent" }
                : m
            )
          );
        } else {
          console.error("Lỗi gửi ảnh qua n8n:", res.status);
          setMessages((prev) =>
            prev.map((m) =>
              m._tempId === tempId ? { ...m, status: "error" } : m
            )
          );
        }
      } catch (err) {
        console.error("Lỗi gửi ảnh:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === tempId ? { ...m, status: "error" } : m
          )
        );
      } finally {
        setSending(false);
        URL.revokeObjectURL(previewUrl);
      }
    },
    [selectedConvId, sending]
  );

  // --------------------------------------------------------
  // Fetch tin nhắn + tra cứu học viên khi chọn hội thoại
  // --------------------------------------------------------
  const handleSelectConversation = useCallback(async (convId: string) => {
    setSelectedConvId(convId);
    setLoadingMessages(true);
    setMessages([]);
    setRightTab("hoc-vien");
    setHocVien(null);
    setMatchStatus("loading");
    setKhachSdt(null);
    // Mobile: chuyển sang màn hình chat khi chọn hội thoại
    setMobileView("chat");

    const { data, error } = await supabase
      .from("tin_nhan")
      .select("*, nguoi_gui:khach_hang(*)")
      .eq("hoi_thoai_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Lỗi fetch tin nhắn chi tiết:", error);
    } else if (data) {
      setMessages(data as UITinNhan[]);
    }
    setLoadingMessages(false);

    // Matching SĐT → hoc_vien
    const conv = conversationsRef.current.find((c) => c.id === convId);
    const sdt = conv?.khach_hang?.sdt;

    if (!sdt || sdt.trim() === "") {
      setMatchStatus("no-sdt");
      return;
    }

    setKhachSdt(sdt);

    const { data: hvData, error: hvError } = await supabase
      .from("hoc_vien")
      .select("*")
      .eq("sdt", sdt)
      .limit(1)
      .maybeSingle();

    if (hvError) {
      console.error("Lỗi tra cứu học viên:", hvError);
      setMatchStatus("sdt-not-found");
      return;
    }

    if (hvData) {
      setHocVien(hvData as HocVien);
      setMatchStatus("found");
    } else {
      setMatchStatus("sdt-not-found");
    }
  }, []);

  // --------------------------------------------------------
  // Supabase Realtime — lắng nghe INSERT trên bảng tin_nhan
  // --------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel("realtime-tin-nhan")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tin_nhan",
        },
        async (payload) => {
          const rawMsg = payload.new as TinNhan & { nguoi_gui_id?: string | null };

          // 🔔 Phát âm thanh khi KHÁCH gửi tin nhắn (nếu user bật thông báo)
          const notifPref = typeof window !== "undefined" && localStorage.getItem("kn_notif") !== "off";
          if (rawMsg.chieu_gui === "Khách gửi" && notifySoundRef.current && notifPref) {
            try {
              notifySoundRef.current.currentTime = 0;
              notifySoundRef.current.play();
            } catch (err) {
              console.warn("[Notification] Trình duyệt chặn autoplay:", err);
            }
          }

          const enrichWithSender = async (): Promise<UITinNhan> => {
            if (!rawMsg.nguoi_gui_id) {
              return rawMsg as UITinNhan;
            }
            const { data: khData } = await supabase
              .from("khach_hang")
              .select("*")
              .eq("id", rawMsg.nguoi_gui_id)
              .single();

            return {
              ...(rawMsg as UITinNhan),
              nguoi_gui: khData ? (khData as KhachHang) : undefined,
            };
          };

          // 1) Nếu tin nhắn thuộc hội thoại đang mở
          if (rawMsg.hoi_thoai_id === selectedConvIdRef.current) {
            if (rawMsg.chieu_gui === "Trung tâm gửi") {
              setMessages((prev) => {
                const tempIdx = prev.findIndex(
                  (m) => m._tempId && m.noi_dung === rawMsg.noi_dung && m.chieu_gui === "Trung tâm gửi"
                );
                if (tempIdx !== -1) {
                  const updated = [...prev];
                  updated[tempIdx] = { ...rawMsg };
                  return updated;
                }
                return [...prev, rawMsg as UITinNhan];
              });
            } else {
              const enriched = await enrichWithSender();
              setMessages((prev) => {
                if (prev.some((m) => m.id === enriched.id)) return prev;
                return [...prev, enriched];
              });
            }
          }

          // 2) Enrich tin nhắn cuối với nguoi_gui (cho group preview)
          const enrichedMsg = await enrichWithSender();

          // 3) Cập nhật tin nhắn cuối + đẩy hội thoại lên đầu
          const convExists = conversationsRef.current.some(
            (c) => c.id === rawMsg.hoi_thoai_id
          );

          if (convExists) {
            // Hội thoại đã có trong list → update tin_nhan_cuoi + re-sort
            setConversations((prev) => {
              const updated = prev.map((conv) => {
                if (conv.id === rawMsg.hoi_thoai_id) {
                  return {
                    ...conv,
                    tin_nhan_cuoi: enrichedMsg,
                    updated_at: rawMsg.created_at,
                  };
                }
                return conv;
              });

              updated.sort((a, b) => {
                const timeA = new Date(a.updated_at).getTime();
                const timeB = new Date(b.updated_at).getTime();
                return timeB - timeA;
              });

              return updated;
            });
          } else {
            // Hội thoại MỚI (khách nhắn lần đầu) → fetch từ Supabase rồi thêm vào
            const { data: newHt } = await supabase
              .from("hoi_thoai")
              .select("*, khach_hang(*), zalo_nhom(*)")
              .eq("id", rawMsg.hoi_thoai_id)
              .single();

            if (newHt) {
              const newConv: HoiThoaiWithDetails = {
                ...newHt,
                khach_hang: newHt.khach_hang || null,
                zalo_nhom: newHt.zalo_nhom || null,
                tin_nhan_cuoi: enrichedMsg,
              };
              setConversations((prev) => {
                // Guard: tránh thêm trùng nếu đã có
                if (prev.some((c) => c.id === newConv.id)) return prev;
                return [newConv, ...prev];
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --------------------------------------------------------
  // Computed values
  // --------------------------------------------------------
  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const isGroupConv = !!selectedConv?.zalo_nhom_id;

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((conv) => {
      const nameDM = conv.khach_hang?.ho_ten?.toLowerCase() || "";
      const nameGroup = conv.zalo_nhom?.ten_nhom?.toLowerCase() || "";
      const q = searchQuery.toLowerCase();
      return nameDM.includes(q) || nameGroup.includes(q);
    })
    : conversations;

  // Xử lý "Bắt đầu Chat" từ modal Tìm Zalo
  const handleStartChatFromSearch = useCallback(async (result: TimZaloResult): Promise<void> => {
    const { data: khData } = await supabase
      .from("khach_hang")
      .select("id, zalo_id, ho_ten, sdt, avatar, fb_id, ghi_chu, is_zalo_friend, created_at")
      .eq("zalo_id", result.zalo_id)
      .maybeSingle();

    if (khData) {
      const { data: htData } = await supabase
        .from("hoi_thoai")
        .select("id")
        .eq("khach_hang_id", khData.id)
        .is("zalo_nhom_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (htData) {
        handleSelectConversation(htData.id);
        return;
      }

      const now = new Date().toISOString();
      const tempConvId = `temp-conv-${Date.now()}`;
      const newConv: HoiThoaiWithDetails = {
        id: tempConvId,
        khach_hang_id: khData.id,
        zalo_nhom_id: null,
        nguon_den: "Zalo",
        ai_dang_bat: false,
        nhan_vien_nhan: null,
        updated_at: now,
        khach_hang: khData as KhachHang,
        zalo_nhom: null,
        tin_nhan_cuoi: null,
      };
      setConversations((prev) => [newConv, ...prev.filter((c) => !c.id.startsWith("temp-conv-"))]);
      setSelectedConvId(tempConvId);
      setMessages([]);
      setLoadingMessages(false);
      setRightTab("hoc-vien");
      setHocVien(null);
      setMatchStatus("no-sdt");
      setKhachSdt(null);
      return;
    }

    const tempConvId = `temp-conv-${Date.now()}`;
    const now = new Date().toISOString();
    const newKhachHang: KhachHang = {
      id: `temp-kh-${Date.now()}`,
      zalo_id: result.zalo_id,
      fb_id: null,
      ho_ten: result.ten,
      sdt: null,
      avatar: result.avatar || null,
      ghi_chu: null,
      is_zalo_friend: result.is_zalo_friend,
      created_at: now,
    };
    const newConv: HoiThoaiWithDetails = {
      id: tempConvId,
      khach_hang_id: newKhachHang.id,
      zalo_nhom_id: null,
      nguon_den: "Zalo",
      ai_dang_bat: false,
      nhan_vien_nhan: null,
      updated_at: now,
      khach_hang: newKhachHang,
      zalo_nhom: null,
      tin_nhan_cuoi: null,
    };
    setConversations((prev) => [newConv, ...prev]);
    setSelectedConvId(tempConvId);
    setMessages([]);
    setLoadingMessages(false);
    setRightTab("hoc-vien");
    setHocVien(null);
    setMatchStatus("no-sdt");
    setKhachSdt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSelectConversation]);

  // ── Đồng bộ danh bạ Zalo ──
  const [dongBoLoading, setDongBoLoading] = useState(false);
  const [dongBoResult, setDongBoResult] = useState<"ok" | "err" | null>(null);

  const handleDongBoBanBe = async () => {
    if (dongBoLoading) return;
    setDongBoLoading(true);
    setDongBoResult(null);
    try {
      const res = await dongBoBanBe();
      setDongBoResult(res.ok ? "ok" : "err");
    } catch {
      setDongBoResult("err");
    } finally {
      setDongBoLoading(false);
      setTimeout(() => setDongBoResult(null), 4000);
    }
  };

  return (
    <div
      className="flex flex-col overflow-hidden bg-[#eef2f6]"
      style={{ height: vvHeight ? `${vvHeight}px` : '100dvh' }}
    >
      {/* Top Navigation Bar */}
      <TopNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSearch={() => setShowTimZaloModal(true)}
      />

      {/* Modal Tìm Zalo theo SĐT */}
      <TimZaloModal
        isOpen={showTimZaloModal}
        onClose={() => setShowTimZaloModal(false)}
        onStartChat={handleStartChatFromSearch}
      />

      {/* Modal Tạo Nhóm Mới */}
      <TaoNhomModal
        isOpen={showTaoNhomModal}
        onClose={() => setShowTaoNhomModal(false)}
      />

      {/* ══ Conditional Content — render theo activeTab ══ */}
      {activeTab === "dang-ky" ? (
        <DangKyForm />

      ) : activeTab === "chinh-sach" ? (
        <ContentEditor type="chinh-sach" />

      ) : activeTab === "khoa-hoc" ? (
        <ContentEditor type="khoa-hoc" />

      ) : (

        /* Main 3-Column Layout — Tab Tin Nhắn */
        <div className="flex flex-1 overflow-hidden">
          {/* ========================================== */}
          {/* Cột 1 — Danh sách hội thoại               */}
          {/* Desktop: 300px cố định | Mobile: full nếu mobileView=list, ẩn nếu chat */}
          {/* ========================================== */}
          <aside className={`
          w-full md:w-[360px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden
          ${isMobile && mobileView !== "list" ? "hidden" : ""}
        `}>
            {/* Header sidebar: Search + Nút tạo nhóm */}
            <div className="px-3 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                  />
                </div>
                {/* Nút tạo nhóm mới */}
                <button
                  id="btn-mo-tao-nhom-modal"
                  onClick={() => setShowTaoNhomModal(true)}
                  title="Tạo nhóm Zalo mới"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conversation Cards */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1.5 space-y-1 min-h-0">
              {filteredConversations.length === 0 && (
                <p className="p-3 text-gray-400 text-xs text-center">
                  {searchQuery ? "Không tìm thấy hội thoại." : "Chưa có hội thoại nào."}
                </p>
              )}
              {filteredConversations.map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conv={conv}
                  isSelected={conv.id === selectedConvId}
                  onSelect={() => handleSelectConversation(conv.id)}
                />
              ))}
            </div>

            {/* Nút Đồng bộ danh bạ */}
            <div className="relative z-10 flex-shrink-0 px-3 py-2.5 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
              <button
                id="btn-dong-bo-ban-be"
                onClick={handleDongBoBanBe}
                disabled={dongBoLoading}
                title="Đồng bộ danh sách bạn bè Zalo về hệ thống"
                className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all select-none ${dongBoLoading
                  ? "bg-teal-50 text-teal-500 cursor-wait border border-teal-200"
                  : dongBoResult === "ok"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : dongBoResult === "err"
                      ? "bg-red-50 text-red-500 border border-red-200"
                      : "bg-gray-50 hover:bg-teal-50 text-gray-500 hover:text-teal-600 border border-gray-200 hover:border-teal-300 cursor-pointer"
                  }`}
              >
                {dongBoLoading ? (
                  <><div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin flex-shrink-0" /><span>Đang đồng bộ...</span></>
                ) : dongBoResult === "ok" ? (
                  <><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span>Đồng bộ thành công!</span></>
                ) : dongBoResult === "err" ? (
                  <><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Lỗi đồng bộ. Thử lại.</span></>
                ) : (
                  <><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>Đồng bộ danh bạ Zalo</span></>
                )}
              </button>
            </div>
          </aside>

          {/* ========================================== */}
          {/* Cột 2 — Khung Chat (flex-1)               */}
          {/* ========================================== */}
          <main className={`
          flex-1 flex flex-col min-w-0 bg-white
          ${isMobile && mobileView !== "chat" ? "hidden" : ""}
        `}>
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2 md:gap-3 bg-white shrink-0">
                  {/* Nút Back — chỉ hiện trên mobile */}
                  {isMobile && (
                    <button
                      onClick={() => { setMobileView("list"); setSelectedConvId(null); }}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="relative flex-shrink-0">
                    {isGroupConv ? (
                      selectedConv.zalo_nhom?.avatar_nhom ? (
                        <img src={selectedConv.zalo_nhom.avatar_nhom} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.97 5.97 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.97 5.97 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
                          </svg>
                        </div>
                      )
                    ) : (
                      selectedConv.khach_hang?.avatar ? (
                        <img src={selectedConv.khach_hang.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <AvatarFallback name={selectedConv.khach_hang?.ho_ten} size="w-9 h-9" textSize="text-xs" />
                      )
                    )}
                    {isGroupConv ? <GroupBadge /> : <ChannelBadge nguonDen={selectedConv.nguon_den} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-sm text-gray-800 truncate">
                      {isGroupConv
                        ? (selectedConv.zalo_nhom?.ten_nhom || "Nhóm chưa có tên")
                        : (selectedConv.khach_hang?.ho_ten || "Khách chưa có tên")
                      }
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      {isGroupConv
                        ? "Zalo Group Chat"
                        : (selectedConv.nguon_den || "Không rõ nguồn")
                      }
                      {selectedConv.nhan_vien_nhan && ` · NV: ${selectedConv.nhan_vien_nhan}`}
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <span
                      className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium
                      ${selectedConv.ai_dang_bat
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                        }
                    `}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedConv.ai_dang_bat ? "bg-green-500" : "bg-gray-400"}`} />
                      AI {selectedConv.ai_dang_bat ? "Bật" : "Tắt"}
                    </span>

                    {/* Nút Info — chỉ hiện trên mobile */}
                    {isMobile && (
                      <button
                        onClick={() => setShowMobileInfo(true)}
                        className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                        title="Xem thông tin"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-3 bg-[#f6f8fa] chat-scrollbar">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-400">Đang tải tin nhắn...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-gray-400">Chưa có tin nhắn trong hội thoại này.</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((tin, i) => {
                        const prev = messages[i - 1];
                        const TIME_GAP_MS = 5 * 60 * 1000;
                        const withinTimeGap = prev
                          ? Math.abs(new Date(tin.created_at).getTime() - new Date(prev.created_at).getTime()) < TIME_GAP_MS
                          : false;

                        const isSameGroup = prev && withinTimeGap
                          ? prev.chieu_gui === tin.chieu_gui &&
                          (isGroupConv
                            ? (prev.nguoi_gui_id ?? null) === (tin.nguoi_gui_id ?? null)
                            : true)
                          : false;

                        const next = messages[i + 1];
                        const nextWithinTime = next
                          ? Math.abs(new Date(next.created_at).getTime() - new Date(tin.created_at).getTime()) < TIME_GAP_MS
                          : false;
                        const isLastInGroup = next && nextWithinTime
                          ? next.chieu_gui !== tin.chieu_gui ||
                          (isGroupConv
                            ? (next.nguoi_gui_id ?? null) !== (tin.nguoi_gui_id ?? null)
                            : false)
                          : true;

                        // Dải phân cách ngày (giống Zalo)
                        const showDateSep = !prev || !isSameDay(prev.created_at, tin.created_at);

                        return (
                          <div key={tin.id}>
                            {showDateSep && (
                              <div className="flex items-center justify-center my-3">
                                <span className="px-3 py-1 rounded-full bg-gray-200/80 text-[11px] text-gray-500 font-medium shadow-sm">
                                  {getDateLabel(tin.created_at)}
                                </span>
                              </div>
                            )}
                            <ChatBubble
                              tin={tin}
                              isGroupChat={isGroupConv}
                              isGrouped={isSameGroup}
                              isLastInGroup={isLastInGroup}
                            />
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className={`border-t border-gray-200 bg-white shrink-0 relative ${isMobile ? "chat-input-mobile mobile-safe-bottom" : ""}`}>
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-[60px] right-20 z-50 shadow-2xl rounded-xl"
                    >
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}

                  <div className="px-4 py-2.5">
                    <div className="flex items-end gap-2 border border-gray-200 rounded-lg bg-white focus-within:border-blue-400 transition-colors">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                          // iOS: scroll input vào vùng nhìn thấy khi keyboard mở
                          setTimeout(() => {
                            textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                          }, 300);
                        }}
                        placeholder="Trả lời tin nhắn từ Khai Nguyên Hoa Ngữ..."
                        className="flex-1 px-3 py-2.5 text-sm outline-none resize-none bg-transparent min-h-[40px] max-h-[100px]"
                        disabled={sending}
                      />
                      <div className="flex items-center gap-1 pr-1 pb-1.5">
                        <button
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
                          title="Biểu tượng cảm xúc"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmojiPicker((prev) => !prev);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
                          title="Gửi ảnh"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleSendImage}
                        />
                        <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded" title="Đính kèm file">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>
                        <button
                          onClick={handleSendMessage}
                          disabled={!inputText.trim() || sending}
                          className={`
                          w-8 h-8 rounded-full flex items-center justify-center transition-all ml-1
                          ${inputText.trim() && !sending
                              ? "bg-[#2563EB] hover:bg-blue-700 text-white cursor-pointer shadow-sm"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }
                        `}
                        >
                          {sending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 pl-1">Enter để gửi · Shift+Enter để xuống dòng</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#f6f8fa]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-400">Chọn một hội thoại</h3>
                  <p className="text-xs text-gray-300 mt-1">Nhấn vào hội thoại bên trái để xem tin nhắn</p>
                </div>
              </div>
            )}
          </main>

          {/* ========================================== */}
          {/* Cột 3 — Sidebar phải (Desktop only)       */}
          {/* Mobile dùng MobileInfoDrawer thay thế      */}
          {/* ========================================== */}
          <aside className={`w-[380px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col ${isMobile ? "hidden" : ""}`}>
            {selectedConv ? (
              <>
                {/* Tabs: động theo loại hội thoại */}
                <div className="flex border-b border-gray-200 shrink-0">
                  <button
                    onClick={() => setRightTab("hoc-vien")}
                    className={`
                    flex-1 py-2.5 text-xs font-medium transition-colors
                    ${rightTab === "hoc-vien"
                        ? `${isGroupConv ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50" : "text-[#2563EB] font-semibold border-b-2 border-[#2563EB] bg-blue-50/50"}`
                        : "text-gray-400 hover:text-gray-600"
                      }
                  `}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {isGroupConv ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.97 5.97 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.97 5.97 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
                          </svg>
                          Thông tin nhóm
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Thông tin học viên
                        </>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => setRightTab("chot-info")}
                    className={`
                    flex-1 py-2.5 text-xs font-medium transition-colors
                    ${rightTab === "chot-info"
                        ? "text-[#2563EB] font-semibold border-b-2 border-[#2563EB] bg-blue-50/50"
                        : "text-gray-400 hover:text-gray-600"
                      }
                  `}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Chốt thông tin
                    </span>
                  </button>
                </div>

                {/* Tab Content */}
                {rightTab === "hoc-vien" ? (
                  isGroupConv && selectedConv.zalo_nhom_id ? (
                    <TabThongTinNhom zaloNhomId={selectedConv.zalo_nhom_id} />
                  ) : (
                    <TabThongTinHocVien
                      hocVien={hocVien}
                      matchStatus={matchStatus}
                      khachSdt={khachSdt}
                      zaloId={selectedConv.khach_hang?.zalo_id || null}
                    />
                  )
                ) : (
                  <TabChotThongTin
                    messages={messages.map((m) => ({
                      noi_dung: m.noi_dung || "",
                      nguoi_gui_id: m.nguoi_gui_id ?? null,
                      created_at: m.created_at,
                    }))}
                    khachHoTen={selectedConv?.khach_hang?.ho_ten}
                  />
                )}

                {/* Bottom action bar */}
                <div className="px-4 py-2.5 border-t border-gray-100 flex gap-2 shrink-0">
                  <button className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${selectedConv.ai_dang_bat ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                    {selectedConv.ai_dang_bat ? "⏸ Tắt AI" : "▶ Kích hoạt AI"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-400">Chọn hội thoại để xem thông tin</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ══ Mobile Info Drawer ══ */}
      {isMobile && selectedConv && (
        <MobileInfoDrawer
          isOpen={showMobileInfo}
          onClose={() => setShowMobileInfo(false)}
        >
          {/* Tabs: giống cột 3 desktop */}
          <div className="flex border-b border-gray-200 shrink-0">
            <button
              onClick={() => setRightTab("hoc-vien")}
              className={`
                flex-1 py-3 text-xs font-medium transition-colors
                ${rightTab === "hoc-vien"
                  ? `${isGroupConv ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50" : "text-[#2563EB] font-semibold border-b-2 border-[#2563EB] bg-blue-50/50"}`
                  : "text-gray-400 hover:text-gray-600"
                }
              `}
            >
              <span className="flex items-center justify-center gap-1">
                {isGroupConv ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.97 5.97 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.97 5.97 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
                    </svg>
                    Nhóm
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Học viên
                  </>
                )}
              </span>
            </button>
            <button
              onClick={() => setRightTab("chot-info")}
              className={`
                flex-1 py-3 text-xs font-medium transition-colors
                ${rightTab === "chot-info"
                  ? "text-[#2563EB] font-semibold border-b-2 border-[#2563EB] bg-blue-50/50"
                  : "text-gray-400 hover:text-gray-600"
                }
              `}
            >
              <span className="flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Chốt thông tin
              </span>
            </button>
          </div>

          {/* Tab Content */}
          {rightTab === "hoc-vien" ? (
            isGroupConv && selectedConv.zalo_nhom_id ? (
              <TabThongTinNhom zaloNhomId={selectedConv.zalo_nhom_id} />
            ) : (
              <TabThongTinHocVien
                hocVien={hocVien}
                matchStatus={matchStatus}
                khachSdt={khachSdt}
                zaloId={selectedConv.khach_hang?.zalo_id || null}
              />
            )
          ) : (
            <TabChotThongTin
              messages={messages.map((m) => ({
                noi_dung: m.noi_dung || "",
                nguoi_gui_id: m.nguoi_gui_id ?? null,
                created_at: m.created_at,
              }))}
              khachHoTen={selectedConv?.khach_hang?.ho_ten}
            />
          )}
        </MobileInfoDrawer>
      )}
    </div>
  );
}
