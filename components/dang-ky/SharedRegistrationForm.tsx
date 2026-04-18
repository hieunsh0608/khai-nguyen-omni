"use client";

// ============================================================
// SharedRegistrationForm — Single Source of Truth
// Form đăng ký DUY NHẤT dùng ở cả 3 vị trí:
//   1. /dang-ky        (standalone page cho khách)
//   2. Tab "Đăng ký"   (NavBar dashboard cho CSKH)
//   3. Cột phải chat   ("Chốt thông tin" — auto-fill từ AI trích xuất)
//
// Mọi submit đều POST cùng payload → NEXT_PUBLIC_WEBHOOK_LUU_DANG_KY
// Payload chuẩn: { ho_ten, sdt, nam_sinh, lich_hoc, co_so, cap_do, nguon, cskh }
// ============================================================

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  User,
  Phone,
  Calendar,
  MapPin,
  BookOpen,
  Share2,
  CheckCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";

// ─── CONFIG ───
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_LUU_DANG_KY || "";

// ─── TYPES ───
export type RegistrationFormValues = {
  ho_ten: string;
  sdt: string;
  nam_sinh: string;
  lich_hoc: string;
  co_so: string;
  cap_do: string;
  nguon: string;
};

export interface SharedRegistrationFormProps {
  /** Compact mode cho sidebar (nhỏ hơn, bỏ icon, bỏ header) */
  compact?: boolean;
  /** Dữ liệu điền sẵn (auto-fill từ DB khi CSKH đang chat) */
  initialData?: Partial<RegistrationFormValues>;
  /** Tên CSKH (tracking) — từ URL param hoặc hardcode */
  cskh?: string;
  /** ID prefix cho input fields (tránh trùng DOM id) */
  idPrefix?: string;
}

// ─── SELECT OPTIONS (Single Source of Truth) ───
const CO_SO_OPTIONS = ["Gia Lộc", "Hải Dương", "Online"];
const CAP_DO_OPTIONS = ["HSK 0-2", "HSK 3", "HSK 4"];
const LICH_HOC_OPTIONS = [
  "Thứ 2-4-6 ( 18h - 19h30 )",
  "Thứ 2-4-6 ( 19h45 - 21h15 )",
  "Thứ 3-5-7 ( 18h - 19h30 )",
  "Thứ 3-5-7 ( 19h45 - 21h15 )",
  "Khác",
];
const NGUON_OPTIONS = ["Facebook", "Người quen", "Web", "Khác"];

// ─── SUB-COMPONENTS ───

function FieldLabel({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return compact ? (
    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-1">
      {children}
    </label>
  ) : (
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
      {children}
    </label>
  );
}

function InputWrapper({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none z-10">
      {children}
    </span>
  );
}

function SelectChevron() {
  return (
    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      <ChevronDown size={16} />
    </span>
  );
}

// Compact styles (sidebar 300px)
const compactInput =
  "w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-gray-50 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300";

const compactSelect =
  "w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-gray-50 outline-none focus:border-blue-400 focus:bg-white transition-all appearance-none cursor-pointer pr-8";

// Full styles (center page / tab)
const fullInput =
  "w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-gray-900 font-medium text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 shadow-sm hover:border-red-300";

const fullSelect =
  "w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 shadow-sm hover:border-red-300 appearance-none cursor-pointer";

// ─── SUCCESS SCREEN ───

function SuccessScreen({
  name,
  onReset,
  compact,
}: {
  name: string;
  onReset: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center text-center py-6 px-3 animate-[fadeIn_0.3s_ease-out]">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <CheckCircle size={24} className="text-emerald-600" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-gray-800">Đã gửi thành công! ✅</p>
        <p className="text-xs text-gray-400 mt-1">
          Đã lưu thông tin <span className="font-medium text-gray-600">{name}</span>
        </p>
        <button
          onClick={onReset}
          className="mt-4 px-4 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
        >
          Đăng ký thêm người mới
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4 animate-fade-in">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
          <CheckCircle size={48} className="text-red-600" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-400 flex items-center justify-center">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Đăng ký thành công! 🎉
      </h2>
      <p className="text-slate-500 text-sm mb-1">
        Cảm ơn bạn <span className="font-semibold text-red-600">{name}</span>!
      </p>
      <p className="text-slate-500 text-sm">
        Chúng tôi sẽ liên hệ với bạn sớm nhất.
      </p>
      <div className="mt-8 w-full bg-red-50 rounded-2xl p-4 border border-red-100">
        <p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-2">
          Bước tiếp theo
        </p>
        <p className="text-sm text-slate-600">
          Giáo viên tư vấn sẽ gọi điện xác nhận lịch học và giải đáp thắc mắc
          của bạn trong vòng <strong>24 giờ</strong>.
        </p>
      </div>
      <button
        onClick={onReset}
        className="mt-6 px-6 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
      >
        Đăng ký thêm người mới
      </button>
    </div>
  );
}

// ─── UTILS ───

function formatName(str: string) {
  if (!str) return "";
  return str
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SharedRegistrationForm({
  compact = false,
  initialData,
  cskh = "",
  idPrefix = "reg",
}: SharedRegistrationFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    defaultValues: {
      ho_ten: initialData?.ho_ten || "",
      sdt: initialData?.sdt || "",
      nam_sinh: initialData?.nam_sinh || "",
      lich_hoc: initialData?.lich_hoc || "",
      co_so: initialData?.co_so || "",
      cap_do: initialData?.cap_do || "",
      nguon: initialData?.nguon || "",
    },
  });

  // ── Auto-fill: khi initialData thay đổi (AI trích xuất trả về) ──
  useEffect(() => {
    if (initialData) {
      const fields: (keyof RegistrationFormValues)[] = [
        "ho_ten", "sdt", "nam_sinh", "lich_hoc", "co_so", "cap_do", "nguon",
      ];
      for (const key of fields) {
        if (initialData[key] !== undefined) {
          setValue(key, initialData[key]!);
        }
      }
    }
  }, [initialData, setValue]);

  // ── Submit — payload chuẩn, cùng 1 webhook ──
  const onSubmit = async (data: RegistrationFormValues) => {
    const payload = {
      ho_ten: data.ho_ten,
      sdt: data.sdt,
      nam_sinh: data.nam_sinh,
      lich_hoc: data.lich_hoc,
      co_so: data.co_so,
      cap_do: data.cap_do,
      nguon: data.nguon,
      cskh,
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      console.error("[SharedRegistrationForm] Webhook error");
    }

    setSubmittedName(data.ho_ten);
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSubmittedName("");
    reset({
      ho_ten: initialData?.ho_ten || "",
      sdt: initialData?.sdt || "",
      nam_sinh: "",
      lich_hoc: "",
      co_so: "",
      cap_do: "",
      nguon: "",
    });
  };

  // Style helpers
  const inputCls = compact ? compactInput : fullInput;
  const selectCls = compact ? compactSelect : fullSelect;
  const spacing = compact ? "space-y-2.5" : "space-y-5";
  const errorCls = compact
    ? "text-[10px] text-red-500 mt-1 flex items-center gap-0.5"
    : "text-xs text-red-500 mt-1.5 flex items-center gap-1";

  // ── Đã submit thành công ──
  if (isSubmitted) {
    return <SuccessScreen name={submittedName} onReset={handleReset} compact={compact} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={spacing}>
      {/* Header (chỉ ở full mode) */}
      {!compact && (
        <div className="mb-1">
          <h2 className="text-lg font-bold text-slate-800">
            Đăng ký học thử miễn phí
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Điền thông tin bên dưới — giáo viên sẽ liên hệ bạn sớm nhất!
          </p>
        </div>
      )}

      {/* ───────── Họ và tên ───────── */}
      <div>
        <FieldLabel compact={compact}>
          Họ và tên <span className="text-red-400">*</span>
        </FieldLabel>
        <InputWrapper>
          {!compact && <IconBox><User size={16} /></IconBox>}
          <input
            id={`${idPrefix}-ho_ten`}
            type="text"
            placeholder="Nguyễn Văn A"
            className={inputCls}
            {...register("ho_ten", {
              required: "Vui lòng nhập họ và tên",
              minLength: { value: 2, message: "Tên phải có ít nhất 2 ký tự" },
              onBlur: (e) => {
                const formatted = formatName(e.target.value);
                setValue("ho_ten", formatted, { shouldValidate: true });
              },
            })}
          />
        </InputWrapper>
        {errors.ho_ten && (
          <p className={errorCls}><span>⚠</span> {errors.ho_ten.message}</p>
        )}
      </div>

      {/* ───────── Số điện thoại ───────── */}
      <div>
        <FieldLabel compact={compact}>
          Số điện thoại <span className="text-red-400">*</span>
        </FieldLabel>
        <InputWrapper>
          {!compact && <IconBox><Phone size={16} /></IconBox>}
          <input
            id={`${idPrefix}-sdt`}
            type="tel"
            placeholder="0912 345 678"
            className={inputCls}
            {...register("sdt", {
              required: "Vui lòng nhập số điện thoại",
              pattern: {
                value: /^(0[3|5|7|8|9])+([0-9]{8})$/,
                message: "Số điện thoại không hợp lệ",
              },
            })}
            pattern="^(0[3|5|7|8|9])+([0-9]{8})$"
            title="Vui lòng nhập đúng định dạng số điện thoại 10 số của Việt Nam"
          />
        </InputWrapper>
        {errors.sdt && (
          <p className={errorCls}><span>⚠</span> {errors.sdt.message}</p>
        )}
      </div>

      {/* ───────── Năm sinh ───────── */}
      <div>
        <FieldLabel compact={compact}>Năm sinh</FieldLabel>
        <InputWrapper>
          {!compact && <IconBox><Calendar size={16} /></IconBox>}
          <input
            id={`${idPrefix}-nam_sinh`}
            type="number"
            placeholder="2005"
            min={1950}
            max={2020}
            className={inputCls}
            {...register("nam_sinh", {
              min: { value: 1950, message: "Năm sinh không hợp lệ" },
              max: { value: 2020, message: "Năm sinh không hợp lệ" },
            })}
          />
        </InputWrapper>
        {errors.nam_sinh && (
          <p className={errorCls}><span>⚠</span> {errors.nam_sinh.message}</p>
        )}
      </div>

      {/* ───────── Lịch học phù hợp ───────── */}
      <div>
        <FieldLabel compact={compact}>
          Lịch học phù hợp <span className="text-red-400">*</span>
        </FieldLabel>
        <InputWrapper>
          {!compact && <IconBox><Calendar size={16} /></IconBox>}
          <Controller
            name="lich_hoc"
            control={control}
            rules={{ required: "Vui lòng chọn lịch học" }}
            render={({ field }) => (
              <select id={`${idPrefix}-lich_hoc`} {...field} className={selectCls}>
                <option value="">-- Chọn lịch học --</option>
                {LICH_HOC_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          />
          {!compact && <SelectChevron />}
        </InputWrapper>
        {errors.lich_hoc && (
          <p className={errorCls}><span>⚠</span> {errors.lich_hoc.message}</p>
        )}
      </div>

      {/* ───────── Cơ sở muốn học ───────── */}
      <div>
        <FieldLabel compact={compact}>
          Cơ sở muốn học <span className="text-red-400">*</span>
        </FieldLabel>
        <InputWrapper>
          {!compact && <IconBox><MapPin size={16} /></IconBox>}
          <Controller
            name="co_so"
            control={control}
            rules={{ required: "Vui lòng chọn cơ sở" }}
            render={({ field }) => (
              <select id={`${idPrefix}-co_so`} {...field} className={selectCls}>
                <option value="">-- Chọn cơ sở --</option>
                {CO_SO_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          />
          {!compact && <SelectChevron />}
        </InputWrapper>
        {errors.co_so && (
          <p className={errorCls}><span>⚠</span> {errors.co_so.message}</p>
        )}
      </div>

      {/* ───────── Cấp độ muốn học ───────── */}
      <div>
        <FieldLabel compact={compact}>
          Cấp độ muốn học <span className="text-red-400">*</span>
        </FieldLabel>
        <InputWrapper>
          {!compact && <IconBox><BookOpen size={16} /></IconBox>}
          <Controller
            name="cap_do"
            control={control}
            rules={{ required: "Vui lòng chọn cấp độ" }}
            render={({ field }) => (
              <select id={`${idPrefix}-cap_do`} {...field} className={selectCls}>
                <option value="">-- Chọn cấp độ --</option>
                {CAP_DO_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          />
          {!compact && <SelectChevron />}
        </InputWrapper>
        {errors.cap_do && (
          <p className={errorCls}><span>⚠</span> {errors.cap_do.message}</p>
        )}
      </div>

      {/* ───────── Biết đến chúng tôi qua ───────── */}
      <div>
        <FieldLabel compact={compact}>Biết đến chúng tôi qua</FieldLabel>
        <InputWrapper>
          {!compact && <IconBox><Share2 size={16} /></IconBox>}
          <Controller
            name="nguon"
            control={control}
            render={({ field }) => (
              <select id={`${idPrefix}-nguon`} {...field} className={selectCls}>
                <option value="">-- Chọn nguồn --</option>
                {NGUON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          />
          {!compact && <SelectChevron />}
        </InputWrapper>
      </div>

      {/* ───────── Nút Submit ───────── */}
      {compact ? (
        <button
          id={`${idPrefix}-submit-btn`}
          type="submit"
          disabled={isSubmitting}
          className={`
            w-full py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5
            ${isSubmitting
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-sm hover:shadow-md cursor-pointer"
            }
          `}
        >
          {isSubmitting ? (
            <><Loader2 size={14} className="animate-spin" /> Đang gửi...</>
          ) : (
            "Gửi đăng ký →"
          )}
        </button>
      ) : (
        <button
          id={`${idPrefix}-submit-btn`}
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm
            bg-gradient-to-r from-red-600 to-red-700
            hover:from-red-700 hover:to-red-800
            active:scale-[0.98]
            disabled:opacity-70 disabled:cursor-not-allowed
            shadow-lg shadow-red-200
            transition-all duration-200
            flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" /> Đang gửi...</>
          ) : (
            "Gửi đăng ký ngay →"
          )}
        </button>
      )}

      {!compact && (
        <div className="text-center text-xs pt-1 space-y-1.5">
          <p className="text-slate-400">Thông tin của bạn được bảo mật hoàn toàn 🔒</p>
        </div>
      )}
    </form>
  );
}
