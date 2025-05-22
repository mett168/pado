import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";
import { calculateAndRecordRewards } from "@/lib/calculateAndRecordRewards";
import { saveRewardTransfersSnapshot } from "@/lib/snapshotUtil";

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// ✅ GET 요청도 POST 로직으로 처리
export async function GET() {
  return await POST();
}

export async function POST() {
  try {
    const today = getTodayDate();
    console.log("✅ [CRON] /api/snapshot 실행됨:", new Date().toISOString());

    const result = await calculateAndRecordRewards();
    if (!result.success) {
      console.error("❌ 리워드 계산 실패:", result.error);
      return NextResponse.json({ error: "리워드 계산 실패", detail: result }, { status: 500 });
    }

    await saveRewardTransfersSnapshot();

    return NextResponse.json({ success: true, date: today });

  } catch (err: any) {
    console.error("❌ /api/snapshot 에러:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || JSON.stringify(err) || "Unknown error" },
      { status: 500 }
    );
  }
}
