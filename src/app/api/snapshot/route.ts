import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";
import { calculateAndRecordRewards } from "@/lib/calculateAndRecordRewards";
import { saveRewardTransfersSnapshot } from "@/lib/snapshotUtil";

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export async function POST() {
  try {
    const today = getTodayDate();

    // ✅ 1. 리워드 계산
    const result = await calculateAndRecordRewards();
    if (!result.success) {
      console.error("❌ 리워드 계산 실패:", result.error);
      return NextResponse.json({ error: "리워드 계산 실패", detail: result }, { status: 500 });
    }

    // ✅ 2. reward_transfers snapshot 저장
    await saveRewardTransfersSnapshot();

    // ✅ 완료
    return NextResponse.json({ success: true, date: today });

  } catch (err: any) {
    console.error("❌ /api/snapshot 에러:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || JSON.stringify(err) || "Unknown error" },
      { status: 500 }
    );
  }
}
