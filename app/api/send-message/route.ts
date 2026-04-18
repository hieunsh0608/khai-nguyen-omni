import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_SEND_ZALO || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { zalo_id, text, hoi_thoai_id, nguon_den, loai_tin } = body;
    if (!text || !hoi_thoai_id) {
      return NextResponse.json(
        { error: "Thiếu text hoặc hoi_thoai_id" },
        { status: 400 }
      );
    }

    // Forward to n8n webhook
    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zalo_id: zalo_id || "",
        text,
        hoi_thoai_id,
        nguon_den: nguon_den || "Zalo",
        loai_tin: loai_tin || "text",
      }),
    });

    const n8nData = await n8nRes.text();

    if (!n8nRes.ok) {
      console.error("n8n webhook error:", n8nRes.status, n8nData);
      return NextResponse.json(
        { error: "Lỗi từ n8n", detail: n8nData },
        { status: n8nRes.status }
      );
    }

    return NextResponse.json({ success: true, data: n8nData });
  } catch (err) {
    console.error("API send-message error:", err);
    return NextResponse.json(
      { error: "Lỗi server nội bộ" },
      { status: 500 }
    );
  }
}
