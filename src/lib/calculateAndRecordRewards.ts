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
    console.log("\uD83D\uDDFC\uFE0F 리워드 계산 시작");
    const today = getTodayDate();

    const { data: users, error: userError } = await supabase
      .from("users")
      .select("ref_code, name, wallet_address, ref_by, center_id, role");

    if (userError || !users) throw new Error("유저 조회 실패");
    console.log("총 유저 수:", users.length);

    let count = 0;

    for (const user of users) {
      const { ref_code, name, ref_by, center_id, wallet_address, role } = user;
      const lowerAddress = wallet_address?.toLowerCase();

      console.log("➡️ 유저 처리 시작:", ref_code);

      const { data: nftRow, error: nftError } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", ref_code)
        .maybeSingle();

      if (nftError) {
        console.error("❌ NFT 조회 실패:", ref_code, nftError);
        continue;
      }

      const nft300 = nftRow?.nft300 || 0;
      const nft3000 = nftRow?.nft3000 || 0;
      const nft10000 = nftRow?.nft10000 || 0;

      const investReward =
        nft300 * DAILY_REWARD_BY_NFT.nft300 +
        nft3000 * DAILY_REWARD_BY_NFT.nft3000 +
        nft10000 * DAILY_REWARD_BY_NFT.nft10000;

      if (investReward === 0) {
        console.log("⏭ NFT 없음, 건너뜀:", ref_code);
        continue;
      }

      const baseFields = {
        reward_date: today,
        wallet_address: lowerAddress,
        name: name || "",
      };

      console.log("📥 reward_invests 저장 시도:", ref_code, investReward);

      const { error: investError } = await supabase.from("reward_invests").upsert(
        {
          ref_code,
          ...baseFields,
          nft300_qty: nft300,
          nft3000_qty: nft3000,
          nft10000_qty: nft10000,
          reward_amount: investReward,
        },
        { onConflict: "ref_code" }
      );

      if (investError) {
        console.error("❌ reward_invests 저장 실패:", { ref_code, investReward, nft300, nft3000, nft10000, error: investError });
      } else {
        console.log("✅ reward_invests 저장 완료:", ref_code, investReward);
      }

      await supabase.from("rewards").upsert(
        {
          ...baseFields,
          ref_code,
          ref_by,
          center_id,
          reward_type: "invest",
          role: role || "user",
          amount: investReward,
          memo: "NFT 투자 리워드",
        },
        { onConflict: "ref_code" }
      );

      if (ref_by && ref_by !== ref_code) {
        const referralReward = investReward * REFERRAL_PERCENT;

        const { data: refUser } = await supabase
          .from("users")
          .select("name, wallet_address, role, center_id")
          .eq("ref_code", ref_by)
          .maybeSingle();

        await supabase.from("reward_referrals").upsert(
          {
            ref_code: ref_by,
            invitee_code: ref_code,
            name: refUser?.name || "",
            reward_date: today,
            nft300_qty: nft300,
            nft3000_qty: nft3000,
            nft10000_qty: nft10000,
            reward_amount: referralReward,
          },
          { onConflict: "ref_code" }
        );

        if (refUser) {
          await supabase.from("rewards").upsert(
            {
              reward_date: today,
              wallet_address: refUser.wallet_address?.toLowerCase() || "",
              name: refUser.name || "",
              ref_code: ref_by,
              ref_by: null,
              center_id: refUser.center_id || null,
              reward_type: "referral",
              role: refUser.role || "user",
              amount: referralReward,
              memo: `${ref_code} 피추천 리워드`,
            },
            { onConflict: "ref_code" }
          );
        }
      }

      if (center_id && center_id !== ref_code) {
        const centerReward = investReward * CENTER_PERCENT;

        const { data: centerUser } = await supabase
          .from("users")
          .select("name, wallet_address, role")
          .eq("ref_code", center_id)
          .maybeSingle();

        await supabase.from("reward_centers").upsert(
          {
            ref_code: center_id,
            member_code: ref_code,
            name: centerUser?.name || "",
            reward_date: today,
            nft300_qty: nft300,
            nft3000_qty: nft3000,
            nft10000_qty: nft10000,
            reward_amount: centerReward,
          },
          { onConflict: "ref_code" }
        );

        if (centerUser) {
          await supabase.from("rewards").upsert(
            {
              reward_date: today,
              wallet_address: centerUser.wallet_address?.toLowerCase() || "",
              name: centerUser.name || "",
              ref_code: center_id,
              ref_by: null,
              center_id: null,
              reward_type: "center",
              role: centerUser.role || "center",
              amount: centerReward,
              memo: `${ref_code} 소속 센터 리워드`,
            },
            { onConflict: "ref_code" }
          );
        }
      }

      count++;
    }

    const { data: rewardsToday, error: rewardFetchError } = await supabase
      .from("rewards")
      .select("ref_code, wallet_address, reward_type, amount")
      .eq("reward_date", today);

    if (rewardFetchError) {
      console.error("❌ reward_transfers 산정용 리워드 불러오기 실패:", rewardFetchError.message);
    } else {
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

        const { error: insertError } = await supabase.from("reward_transfers").upsert(
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
          { onConflict: "ref_code" }
        );

        if (insertError) {
          console.error(`❌ reward_transfers 저장 실패 - ${ref_code}:`, insertError.message);
        } else {
          console.log(`✅ reward_transfers 저장 완료 - ${ref_code} (합계 ${total})`);
        }
      }
    }

    console.log(`✅ 총 ${count}명에 대한 리워드 저장 완료`);
    return { success: true, date: today };
  } catch (err: any) {
    console.error("❌ 리워드 계산 오류:", err?.message || err);
    return { success: false, error: err?.message || JSON.stringify(err) || "Unknown Error" };
  }
}
