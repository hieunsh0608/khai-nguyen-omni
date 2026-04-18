"use client";

// ============================================================
// ContentEditor — Trình soạn thảo nội dung cho Chính sách / Khóa học
//
// Flow:
// 1. Mount → GET nội dung từ n8n webhook (action: "get")
// 2. Người dùng chỉnh sửa trực tiếp
// 3. Bấm "Lưu" → POST nội dung qua n8n (action: "save") → Supabase
//
// Webhook: NEXT_PUBLIC_WEBHOOK_NOI_DUNG
// Payload:
//   GET:  { action: "get",  type: "chinh-sach" | "khoa-hoc" }
//   SAVE: { action: "save", type: "chinh-sach" | "khoa-hoc", content: "..." }
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Save,
  Edit3,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
  BookOpen,
} from "lucide-react";

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_NOI_DUNG || "";

export type ContentType = "chinh-sach" | "khoa-hoc";

interface ContentEditorProps {
  type: ContentType;
}

// ─── Config theo loại nội dung ───
const CONFIG: Record<
  ContentType,
  {
    title: string;
    subtitle: string;
    icon: typeof FileText;
    gradient: string;
    accentBg: string;
    accentText: string;
    placeholder: string;
  }
> = {
  "chinh-sach": {
    title: "Chính sách trung tâm",
    subtitle:
      "Viết nội dung chính sách để CSKH tra cứu khi tư vấn khách hàng",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600",
    accentBg: "bg-blue-50",
    accentText: "text-blue-600",
    placeholder: `Ví dụ:

📌 CHÍNH SÁCH HỌC PHÍ
• Học phí khóa HSK 0-2: 2.500.000đ / 3 tháng
• Học phí khóa HSK 3: 3.000.000đ / 3 tháng
• Giảm 10% khi đăng ký nhóm từ 3 người trở lên

📌 CHÍNH SÁCH BẢO LƯU
• Được bảo lưu tối đa 1 lần trong khóa học
• Thời gian bảo lưu tối đa 30 ngày
• Liên hệ CSKH trước khi nghỉ để được hỗ trợ

📌 CHÍNH SÁCH HOÀN PHÍ
• Hoàn 100% nếu hủy trước buổi học đầu tiên
• Hoàn 50% nếu hủy trong tuần đầu tiên
• Không hoàn phí sau tuần đầu tiên`,
  },
  "khoa-hoc": {
    title: "Danh sách khóa học",
    subtitle:
      "Cập nhật thông tin khóa học, lịch khai giảng, học phí để CSKH tư vấn chính xác",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-600",
    placeholder: `Ví dụ:

📚 KHÓA HSK 0-2 (Cơ bản)
• Thời lượng: 3 tháng (36 buổi)
• Lịch học: T2-T4-T6 hoặc T3-T5-T7
• Ca học: 18h-19h30 hoặc 19h45-21h15
• Học phí: 2.500.000đ
• Khai giảng: 01/05/2026

📚 KHÓA HSK 3 (Trung cấp)
• Thời lượng: 4 tháng (48 buổi)
• Lịch học: T2-T4-T6 hoặc T3-T5-T7
• Ca học: 18h-19h30 hoặc 19h45-21h15
• Học phí: 3.000.000đ
• Khai giảng: 15/05/2026

📚 KHÓA HSK 4 (Nâng cao)
• Thời lượng: 5 tháng (60 buổi)
• Học phí: 3.500.000đ
• Khai giảng: Liên hệ`,
  },
};

// ─── Render nội dung text → HTML đơn giản ───
function renderContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold: **text** hoặc __text__
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    // Headers: dòng bắt đầu bằng # ## ###
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-slate-700 mt-4 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-slate-800 mt-5 mb-1.5">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-slate-900 mt-6 mb-2">$1</h2>')
    // Bullet points: • hoặc -
    .replace(/^[•\-] (.+)$/gm, '<li class="ml-4 text-slate-600">$1</li>')
    // Emoji headings (dòng bắt đầu bằng emoji + chữ in hoa)
    .replace(
      /^(📌|📚|🔔|⭐|💰|📋|🎯|✅|❌|⚠️|🏫|👨‍🏫|📅) (.+)$/gm,
      '<p class="font-bold text-slate-800 mt-4 mb-1">$1 $2</p>'
    )
    // Line breaks
    .replace(/\n/g, "<br />");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ContentEditor({ type }: ContentEditorProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState(""); // track để biết có thay đổi chưa
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "err">("idle");
  const [loadError, setLoadError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasChanges = content !== savedContent;

  // ── Load nội dung từ n8n ──
  useEffect(() => {
    if (!WEBHOOK_URL) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get", type }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const loaded = data.content || data.noi_dung || "";
        setContent(loaded);
        setSavedContent(loaded);
      } catch {
        console.error(`[ContentEditor] Failed to load ${type}`);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [type]);

  // ── Lưu nội dung qua n8n → Supabase ──
  const handleSave = useCallback(async () => {
    if (saving || !hasChanges) return;
    setSaving(true);
    setSaveStatus("idle");

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          type,
          content,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedContent(content);
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      console.error(`[ContentEditor] Failed to save ${type}`);
      setSaveStatus("err");
      setTimeout(() => setSaveStatus("idle"), 4000);
    } finally {
      setSaving(false);
    }
  }, [content, saving, hasChanges, type]);

  // ── Chuyển sang edit mode ──
  const enterEditMode = () => {
    setMode("edit");
    setTimeout(() => {
      textareaRef.current?.focus();
      // Đặt cursor cuối text
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.value.length;
      }
    }, 50);
  };

  // ── Ctrl+S để lưu nhanh ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && mode === "edit") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, mode]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Đang tải nội dung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${cfg.accentBg} flex items-center justify-center`}
          >
            <Icon size={20} className={cfg.accentText} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{cfg.title}</h2>
            <p className="text-xs text-slate-400">{cfg.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Trạng thái lưu */}
          {saveStatus === "ok" && (
            <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium animate-[fadeIn_0.2s_ease-out]">
              <CheckCircle size={14} />
              Đã lưu
            </span>
          )}
          {saveStatus === "err" && (
            <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
              <AlertCircle size={14} />
              Lỗi lưu
            </span>
          )}

          {/* Indicator thay đổi chưa lưu */}
          {hasChanges && saveStatus === "idle" && (
            <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Chưa lưu
            </span>
          )}

          {/* Nút chuyển mode */}
          <button
            onClick={() =>
              mode === "view" ? enterEditMode() : setMode("view")
            }
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
              ${
                mode === "edit"
                  ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  : `${cfg.accentBg} ${cfg.accentText} border-transparent hover:opacity-80`
              }
            `}
          >
            {mode === "edit" ? (
              <>
                <Eye size={14} />
                Xem
              </>
            ) : (
              <>
                <Edit3 size={14} />
                Chỉnh sửa
              </>
            )}
          </button>

          {/* Nút Lưu */}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`
              flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${
                saving || !hasChanges
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : `bg-gradient-to-r ${cfg.gradient} text-white shadow-sm hover:shadow-md cursor-pointer`
              }
            `}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save size={14} />
                Lưu
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 px-6 py-5 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {loadError && (
            <div className="mb-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <AlertCircle size={14} />
              Không tải được nội dung đã lưu. Bạn có thể viết mới.
            </div>
          )}

          {mode === "edit" ? (
            /* ── Edit mode ── */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  Chế độ chỉnh sửa
                </span>
                <span className="text-[10px] text-slate-400">
                  Ctrl+S để lưu nhanh
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={cfg.placeholder}
                className="w-full min-h-[500px] px-5 py-4 text-sm text-slate-700 leading-relaxed
                  resize-y outline-none placeholder:text-slate-300 font-mono"
                style={{ tabSize: 2 }}
              />
            </div>
          ) : (
            /* ── View mode ── */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div
                className={`h-1 bg-gradient-to-r ${cfg.gradient}`}
              />

              {content ? (
                <div
                  className="px-6 py-5 text-sm text-slate-600 leading-relaxed prose-content"
                  dangerouslySetInnerHTML={{
                    __html: renderContent(content),
                  }}
                />
              ) : (
                /* Empty state */
                <div className="px-8 py-16 text-center">
                  <div
                    className={`w-14 h-14 rounded-2xl ${cfg.accentBg} flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon size={24} className={cfg.accentText} />
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Chưa có nội dung
                  </p>
                  <p className="text-xs text-slate-400 mb-5">
                    Bấm &quot;Chỉnh sửa&quot; để bắt đầu viết
                  </p>
                  <button
                    onClick={enterEditMode}
                    className={`
                      inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                      ${cfg.accentBg} ${cfg.accentText} hover:opacity-80 transition-opacity
                    `}
                  >
                    <Edit3 size={14} />
                    Bắt đầu viết
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
