// 📁 src/lib/rewards/3-saveToRewardTransfers.ts
import { supabase } from "@/lib/supabaseClient";

export async function saveToRewardTransfers() {
  const today = new Date().toISOString().split("T")[0];

  const { data: rewards } = await supabase
    .from("rewards")
    .select("ref_code, wallet_address, reward_type, amount, reward_date, name")
    .eq("reward_date", today);

  if (!rewards) return;

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
        name,
        status: "pending",
        tx_hash: null,
        error_message: null,
      });
    }

    const record = userMap.get(ref_code)!;

    if (reward_type === "invest") {
      record.reward_amount += Number(amount || 0);
    } else if (reward_type === "referral") {
      record.referral_amount += Number(amount || 0);
    } else if (reward_type === "center") {
      record.center_amount += Number(amount || 0);
    }

    record.total_amount =
      record.reward_amount + record.referral_amount + record.center_amount;
  }

  for (const entry of userMap.values()) {
    await supabase.from("reward_transfers").upsert(
      { ...entry },
      { onConflict: "ref_code,reward_date" } // ✅ 문자열 형식으로 수정
    );
  }
}
