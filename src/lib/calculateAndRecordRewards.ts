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
    console.log("📸 리워드 계산 시작");
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

      await supabase.from("reward_invests").upsert({
        ref_code,
        ...baseFields,
        nft300_qty: nft300,
        nft3000_qty: nft3000,
        nft10000_qty: nft10000,
        reward_amount: investReward,
      }, { onConflict: ["ref_code", "reward_date"] });

      await supabase.from("rewards").upsert({
        ...baseFields,
        ref_code,
        ref_by,
        center_id,
        reward_type: "invest",
        role: role || "user",
        amount: investReward,
        memo: "NFT 투자 리워드",
      }, { onConflict: ["ref_code", "reward_type", "reward_date"] });

      count++;
    }

    // ✅ 내가 추천한 유저가 있을 경우 추천 리워드 계산
    for (const referrer of users) {
      const refCode = referrer.ref_code;
      const refName = referrer.name;
      const refWallet = referrer.wallet_address?.toLowerCase() || "";
      const refRole = referrer.role || "user";

      const { data: invitees } = await supabase
        .from("users")
        .select("ref_code")
        .eq("ref_by", refCode);

      let referralTotal = 0;

      for (const invitee of invitees || []) {
        const { data: nftRow } = await supabase
          .from("nfts")
          .select("nft300, nft3000, nft10000")
          .eq("ref_code", invitee.ref_code)
          .maybeSingle();

        if (!nftRow) continue;

        const investReward =
          (nftRow.nft300 || 0) * DAILY_REWARD_BY_NFT.nft300 +
          (nftRow.nft3000 || 0) * DAILY_REWARD_BY_NFT.nft3000 +
          (nftRow.nft10000 || 0) * DAILY_REWARD_BY_NFT.nft10000;

        const referralReward = investReward * REFERRAL_PERCENT;
        referralTotal += referralReward;

        await supabase.from("reward_referrals").upsert({
          ref_code: refCode,
          invitee_code: invitee.ref_code,
          name: refName,
          reward_date: today,
          nft300_qty: nftRow.nft300 || 0,
          nft3000_qty: nftRow.nft3000 || 0,
          nft10000_qty: nftRow.nft10000 || 0,
          reward_amount: referralReward,
        }, { onConflict: "ref_code,invitee_code,reward_date" });
      }

      if (referralTotal > 0) {
        await supabase.from("rewards").upsert({
          reward_date: today,
          wallet_address: refWallet,
          name: refName,
          ref_code: refCode,
          reward_type: "referral",
          role: refRole,
          amount: referralTotal,
          memo: `직접 초대한 유저 ${invitees?.length || 0}명 추천 리워드`,
        }, { onConflict: ["ref_code", "reward_type", "reward_date"] });
      }
    }

    // ✅ 내가 센터장인 경우, 하위 멤버 기준으로 센터 리워드 계산
    for (const centerUser of users) {
      const myRefCode = centerUser.ref_code;
      const myName = centerUser.name;
      const myWallet = centerUser.wallet_address?.toLowerCase() || "";
      const myRole = centerUser.role || "center";

      const { data: myMembers } = await supabase
        .from("users")
        .select("ref_code")
        .eq("center_id", myRefCode);

      let centerTotal = 0;

      for (const member of myMembers || []) {
        const { data: nftRow } = await supabase
          .from("nfts")
          .select("nft300, nft3000, nft10000")
          .eq("ref_code", member.ref_code)
          .maybeSingle();

        if (!nftRow) continue;

        const memberReward =
          (nftRow.nft300 || 0) * DAILY_REWARD_BY_NFT.nft300 +
          (nftRow.nft3000 || 0) * DAILY_REWARD_BY_NFT.nft3000 +
          (nftRow.nft10000 || 0) * DAILY_REWARD_BY_NFT.nft10000;

        const centerReward = memberReward * CENTER_PERCENT;
        centerTotal += centerReward;

        await supabase.from("reward_centers").upsert({
          ref_code: myRefCode,
          member_code: member.ref_code,
          name: myName,
          reward_date: today,
          nft300_qty: nftRow.nft300 || 0,
          nft3000_qty: nftRow.nft3000 || 0,
          nft10000_qty: nftRow.nft10000 || 0,
          reward_amount: centerReward,
        }, { onConflict: "ref_code,member_code,reward_date" });
      }

      if (centerTotal > 0) {
        await supabase.from("rewards").upsert({
          reward_date: today,
          wallet_address: myWallet,
          name: myName,
          ref_code: myRefCode,
          reward_type: "center",
          role: myRole,
          amount: centerTotal,
          memo: `소속 유저 ${myMembers?.length || 0}명 센터 리워드`,
        }, { onConflict: ["ref_code", "reward_type", "reward_date"] });
      }
    }

    console.log(`✅ 총 ${count}명에 대한 리워드 저장 완료`);
    return { success: true, date: today };
  } catch (err: any) {
    console.error("❌ 리워드 계산 오류:", err?.message || err);
    return { success: false, error: err?.message || JSON.stringify(err) || "Unknown Error" };
  }
}
