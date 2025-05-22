import { supabase } from "@/lib/supabaseClient";
import {
  DAILY_REWARD_BY_NFT,
  REFERRAL_PERCENT,
  CENTER_PERCENT,
} from "@/lib/rewardRates";

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export async function calculateAndRecordRewards() {
  try {
    console.log("🧮 리워드 계산 시작");
    const today = getTodayDate();

    const { data: users, error: userError } = await supabase
      .from("users")
      .select("ref_code, name, wallet_address, ref_by, center_id");

    if (userError || !users) throw new Error("유저 조회 실패");

    const rewardsToInsert: any[] = [];
    const rewardInvests: any[] = [];
    const rewardReferrals: any[] = [];
    const rewardCenters: any[] = [];

    for (const user of users) {
      const { ref_code, name, wallet_address, ref_by, center_id } = user;
      const lowerAddress = wallet_address?.toLowerCase();

      const { data: nftRow } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", ref_code)
        .maybeSingle();

      const nft300 = nftRow?.nft300 || 0;
      const nft3000 = nftRow?.nft3000 || 0;
      const nft10000 = nftRow?.nft10000 || 0;

      const investReward =
        nft300 * DAILY_REWARD_BY_NFT.nft300 +
        nft3000 * DAILY_REWARD_BY_NFT.nft3000 +
        nft10000 * DAILY_REWARD_BY_NFT.nft10000;

      if (investReward === 0) continue;

      rewardsToInsert.push({
        ref_code,
        wallet_address: lowerAddress,
        reward_type: "invest",
        amount: investReward,
        reward_date: today,
      });

      rewardInvests.push({
        ref_code,
        name: name || "",
        reward_date: today,
        nft300_qty: nft300,
        nft3000_qty: nft3000,
        nft10000_qty: nft10000,
        reward_amount: investReward,
      });

      if (ref_by && ref_by !== ref_code) {
        const referralReward = investReward * REFERRAL_PERCENT;
        const { data: refUser } = await supabase
          .from("users")
          .select("name, wallet_address")
          .eq("ref_code", ref_by)
          .maybeSingle();

        rewardsToInsert.push({
          ref_code: ref_by,
          wallet_address: refUser?.wallet_address?.toLowerCase() || "",
          reward_type: "referral",
          amount: referralReward,
          reward_date: today,
        });

        rewardReferrals.push({
          ref_code: ref_by,
          invitee_code: ref_code,
          name: refUser?.name || "",
          reward_date: today,
          nft300_qty: nft300,
          nft3000_qty: nft3000,
          nft10000_qty: nft10000,
          reward_amount: referralReward,
        });
      }

      if (center_id && center_id !== ref_code) {
        const centerReward = investReward * CENTER_PERCENT;
        const { data: centerUser } = await supabase
          .from("users")
          .select("name, wallet_address")
          .eq("ref_code", center_id)
          .maybeSingle();

        rewardsToInsert.push({
          ref_code: center_id,
          wallet_address: centerUser?.wallet_address?.toLowerCase() || "",
          reward_type: "center",
          amount: centerReward,
          reward_date: today,
        });

        rewardCenters.push({
          ref_code: center_id,
          member_code: ref_code,
          name: centerUser?.name || "",
          reward_date: today,
          nft300_qty: nft300,
          nft3000_qty: nft3000,
          nft10000_qty: nft10000,
          reward_amount: centerReward,
        });
      }
    }

    // ✅ 저장 순서: rewards → reward_* → reward_transfers
    if (rewardsToInsert.length > 0) {
      await supabase.from("rewards").upsert(rewardsToInsert, {
        onConflict: "ref_code, reward_type, reward_date",
      });
    }

    if (rewardInvests.length > 0) {
      await supabase.from("reward_invests").upsert(rewardInvests, {
        onConflict: "ref_code, reward_date",
      });
    }

    if (rewardReferrals.length > 0) {
      await supabase.from("reward_referrals").upsert(rewardReferrals, {
        onConflict: "ref_code, reward_date",
      });
    }

    if (rewardCenters.length > 0) {
      await supabase.from("reward_centers").upsert(rewardCenters, {
        onConflict: "ref_code, reward_date",
      });
    }

    const { data: rewardsToday } = await supabase
      .from("rewards")
      .select("ref_code, wallet_address, reward_type, amount")
      .eq("reward_date", today);

    const rewardMap: Record<string, {
      wallet_address: string;
      reward_amount: number;
      referral_amount: number;
      center_amount: number;
    }> = {};

    for (const row of rewardsToday || []) {
      const ref = row.ref_code;
      const wallet = row.wallet_address;
      const type = row.reward_type;
      const amt = Number(row.amount) || 0;

      if (!rewardMap[ref]) {
        rewardMap[ref] = {
          wallet_address: wallet,
          reward_amount: 0,
          referral_amount: 0,
          center_amount: 0,
        };
      }

      if (type === "invest") rewardMap[ref].reward_amount += amt;
      else if (type === "referral") rewardMap[ref].referral_amount += amt;
      else if (type === "center") rewardMap[ref].center_amount += amt;
    }

    for (const ref_code in rewardMap) {
      const r = rewardMap[ref_code];
      const total = r.reward_amount + r.referral_amount + r.center_amount;

      await supabase.from("reward_transfers").upsert(
        {
          ref_code,
          wallet_address: r.wallet_address,
          reward_amount: r.reward_amount,
          referral_amount: r.referral_amount,
          center_amount: r.center_amount,
          total_amount: total,
          status: "pending",
          reward_date: today,
        },
        { onConflict: "ref_code, reward_date" }
      );
    }

    console.log(`✅ 총 ${rewardsToInsert.length}건의 리워드 저장 완료`);
    return { success: true, date: today };
  } catch (err: any) {
    console.error("❌ 리워드 계산 오류:", err?.message || err);
    return { success: false, error: err?.message || JSON.stringify(err) || "Unknown Error" };
  }
}
