import { supabase } from "@/lib/supabaseClient";
import { getKSTDateString } from "@/lib/dateUtil"; // ✅ 한국 날짜 유틸


export async function saveToRewardTransfers() {
  const today = getKSTDateString(); // ✅ 한국 기준 날짜


  // 1. 유저 리스트 조회 (지갑 주소 및 이름 확보용)
  const { data: users } = await supabase
    .from("users")
    .select("ref_code, name, wallet_address");
  if (!users) return;

  // 2. 각 리워드 테이블에서 오늘 기준 데이터 조회
  const { data: invests } = await supabase
    .from("reward_invests")
    .select("ref_code, reward_amount")
    .eq("reward_date", today);

  const { data: referrals } = await supabase
    .from("reward_referrals")
    .select("ref_code, reward_amount")
    .eq("reward_date", today);

  const { data: centers } = await supabase
    .from("reward_centers")
    .select("ref_code, reward_amount")
    .eq("reward_date", today);

  // 3. 사용자별 리워드 누적 계산
  const userMap = new Map<
    string,
    {
      ref_code: string;
      name: string;
      wallet_address: string;
      reward_date: string;
      reward_amount: number;
      referral_amount: number;
      center_amount: number;
      total_amount: number;
      status: string;
      tx_hash: string | null;
      error_message: string | null;
    }
  >();

  for (const u of users) {
    const ref_code = u.ref_code;
    userMap.set(ref_code, {
      ref_code,
      name: u.name || "",
      wallet_address: u.wallet_address?.toLowerCase() || "",
      reward_date: today,
      reward_amount: 0,
      referral_amount: 0,
      center_amount: 0,
      total_amount: 0,
      status: "pending",
      tx_hash: null,
      error_message: null,
    });
  }

  // 투자 리워드 누적
  for (const item of invests || []) {
    const user = userMap.get(item.ref_code);
    if (user) {
      user.reward_amount += +Number(item.reward_amount || 0).toFixed(3);
    }
  }

  // 추천 리워드 누적
  for (const item of referrals || []) {
    const user = userMap.get(item.ref_code);
    if (user) {
      user.referral_amount += +Number(item.reward_amount || 0).toFixed(3);
    }
  }

  // 센터 리워드 누적
  for (const item of centers || []) {
    const user = userMap.get(item.ref_code);
    if (user) {
      user.center_amount += +Number(item.reward_amount || 0).toFixed(3);
    }
  }

  // reward_transfers 저장 (upsert)
  for (const entry of userMap.values()) {
    entry.total_amount = +(
      entry.reward_amount + entry.referral_amount + entry.center_amount
    ).toFixed(3);

    const { error } = await supabase
      .from("reward_transfers")
      .upsert(entry, { onConflict: "ref_code,reward_date" });

    if (error) {
      console.error("❌ reward_transfers 저장 실패:", error.message, entry);
    }
  }

  console.log("✅ reward_transfers 저장 완료");
}
