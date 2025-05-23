import { NextResponse } from "next/server";
import { calculateAndSaveToRewards } from "@/lib/rewards/calculateAndSaveToRewards";
import { saveToRewardDetailsFromRewards } from "@/lib/rewards/saveToRewardDetailsFromRewards";
import { saveToRewardTransfers } from "@/lib/rewards/saveToRewardTransfers";

export async function POST() {
  try {
    // 1단계: 리워드 계산
    await calculateAndSaveToRewards();

    // 2단계: 리워드 세부 저장
    await saveToRewardDetailsFromRewards();

    // 3단계: 송금 내역 저장
    await saveToRewardTransfers();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("스냅샷 작업 실패:", error);
    return NextResponse.json({ error: "스냅샷 작업 실패", detail: error }, { status: 500 });
  }
}

