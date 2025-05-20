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

    // ✅ 2. reward_transfers 테이블에 금액 합산 snapshot 저장
    await saveRewardTransfersSnapshot();

    // ✅ 3. 전체 유저 조회
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("ref_code, name, wallet_address");

    if (userError || !users) {
      return NextResponse.json({ error: "유저 조회 실패" }, { status: 500 });
    }

    // ✅ 4. 각 유저별 초대자/센터 기준 snapshot 저장
    for (const user of users) {
      const myCode = user.ref_code;

      const { data: invitees } = await supabase
        .from("users")
        .select("ref_code, name, wallet_address")
        .or(`ref_by.eq.${myCode},center_id.eq.${myCode}`);

      for (const invitee of invitees || []) {
        const { data: nft } = await supabase
          .from("nfts")
          .select("nft300, nft3000, nft10000")
          .eq("ref_code", invitee.ref_code)
          .maybeSingle();

        const nftMap = {
          nft300: nft?.nft300 || 0,
          nft3000: nft?.nft3000 || 0,
          nft10000: nft?.nft10000 || 0,
        };

        // 오늘 리워드
        const { data: referralRewards } = await supabase
          .from("rewards")
          .select("amount")
          .eq("ref_code", myCode)
          .eq("reward_type", "referral")
          .eq("ref_by", invitee.ref_code)
          .eq("reward_date", today);

        const { data: centerRewards } = await supabase
          .from("rewards")
          .select("amount")
          .eq("ref_code", myCode)
          .eq("reward_type", "center")
          .eq("center_id", invitee.ref_code)
          .eq("reward_date", today);

        const rewardToday =
          (referralRewards || []).reduce((sum, r) => sum + Number(r.amount), 0) +
          (centerRewards || []).reduce((sum, r) => sum + Number(r.amount), 0);

        // 누적 리워드
        const { data: totalReferralRewards } = await supabase
          .from("rewards")
          .select("amount")
          .eq("ref_code", myCode)
          .eq("reward_type", "referral")
          .eq("ref_by", invitee.ref_code);

        const { data: totalCenterRewards } = await supabase
          .from("rewards")
          .select("amount")
          .eq("ref_code", myCode)
          .eq("reward_type", "center")
          .eq("center_id", invitee.ref_code);

        const rewardTotal =
          (totalReferralRewards || []).reduce((sum, r) => sum + Number(r.amount), 0) +
          (totalCenterRewards || []).reduce((sum, r) => sum + Number(r.amount), 0);

        // ✅ invite_summaries 저장
        const { error: upsertError } = await supabase.from("invite_summaries").upsert({
          ref_code: myCode,
          invitee_code: invitee.ref_code,
          wallet_address: invitee.wallet_address,
          name: invitee.name,
          nft300: nftMap.nft300,
          nft3000: nftMap.nft3000,
          nft10000: nftMap.nft10000,
          reward_today: rewardToday,
          reward_total: rewardTotal,
          updated_at: new Date().toISOString(),
        });

        if (upsertError) {
          console.error("❌ invite_summaries upsert 오류:", upsertError.message);
        }

        // ✅ invite_summary_history 기록
        const { error: historyError } = await supabase.from("invite_summary_history").insert({
          ref_code: myCode,
          invitee_code: invitee.ref_code,
          wallet_address: invitee.wallet_address,
          name: invitee.name,
          nft300: nftMap.nft300,
          nft3000: nftMap.nft3000,
          nft10000: nftMap.nft10000,
          reward_today: rewardToday,
          reward_total: rewardTotal,
          recorded_at: today,
        });

        if (historyError) {
          console.error("❌ invite_summary_history insert 오류:", historyError.message);
        }
      }
    }

    return NextResponse.json({ success: true, date: today });

  } catch (err: any) {
    console.error("❌ /api/snapshot 에러:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || JSON.stringify(err) || "Unknown error" },
      { status: 500 }
    );
  }
}
