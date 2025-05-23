// 📁 src/lib/rewards/3-saveToRewardTransfers.ts
import { supabase } from "@/lib/supabaseClient";

export async function saveToRewardTransfers() {
  const today = new Date().toISOString().split("T")[0];

  const { data: rewards, error } = await supabase
    .from("rewards")
    .select("ref_code, wallet_address, reward_type, amount, reward_date, name")
    .eq("reward_date", today);

  if (error) {
    console.error("❌ 리워드 조회 실패:", error);
    return;
  }
  if (!rewards || rewards.length === 0) {
    console.log("ℹ️ 오늘 날짜의 리워드가 없습니다.");
    return;
  }

  const userMap = new Map<
    string,
    {
      ref_code: string;
      wallet_address: string;
      reward_date: string;
      reward_amount: number;
      referral_amount: number;
      center_amount: number;
      total_amount: number;
      name: string;
      status: string;
      tx_hash: string | null;
      error_message: string | null;
    }
  >();

  for (const reward of rewards) {
    const { ref_code, wallet_address, reward_type, amount, reward_date, name } = reward;
    if (!ref_code) continue;

    if (!userMap.has(ref_code)) {
      userMap.set(ref_code, {
        ref_code,
        wallet_address: wallet_address?.toLowerCase() || "",
        reward_date,
        reward_amount: 0,
        referral_amount: 0,
        center_amount: 0,
        total_amount: 0,
        name: name || "", // name 누락 방지
        status: "pending",
        tx_hash: null,
        error_message: null,
      });
    }

    const record = userMap.get(ref_code)!;
    const rewardValue = Number(amount || 0);

    if (reward_type === "invest") {
      record.reward_amount += rewardValue;
    } else if (reward_type === "referral") {
      record.referral_amount += rewardValue;
    } else if (reward_type === "center") {
      record.center_amount += rewardValue;
    }

    record.total_amount =
      record.reward_amount + record.referral_amount + record.center_amount;
  }

  for (const entry of userMap.values()) {
    const { error } = await supabase.from("reward_transfers").upsert(
      { ...entry },
      { onConflict: "ref_code,reward_date" }
    );
    if (error) {
      console.error("❌ reward_transfers 저장 실패:", error, entry);
    }
  }

  console.log("✅ reward_transfers 저장 완료");
}
