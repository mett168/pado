// 📁 src/lib/rewards/1-calculateAndSaveToRewards.ts
import { supabase } from "@/lib/supabaseClient";
import { DAILY_REWARD_BY_NFT, REFERRAL_PERCENT, CENTER_PERCENT } from "@/lib/rewardRates";

export async function calculateAndSaveToRewards() {
  const today = new Date().toISOString().split("T")[0];

  const { data: users } = await supabase
    .from("users")
    .select("ref_code, name, wallet_address, ref_by, center_id, role");

  if (!users) return;

  // 1. 투자 리워드 계산 및 저장 (NFT 기준)
  for (const user of users) {
    const { ref_code, name, wallet_address, ref_by, center_id, role } = user;
    if (!ref_code) continue;

    const { data: nftRow } = await supabase
      .from("nfts")
      .select("nft300, nft3000, nft10000")
      .eq("ref_code", ref_code)
      .maybeSingle();

    const nft300 = Number(nftRow?.nft300) || 0;
    const nft3000 = Number(nftRow?.nft3000) || 0;
    const nft10000 = Number(nftRow?.nft10000) || 0;

    const investReward = +(
      nft300 * DAILY_REWARD_BY_NFT.nft300 +
      nft3000 * DAILY_REWARD_BY_NFT.nft3000 +
      nft10000 * DAILY_REWARD_BY_NFT.nft10000
    ).toFixed(3);

    await supabase.from("rewards").upsert({
      ref_code,
      ref_by,
      center_id,
      reward_date: today,
      reward_type: "invest",
      role,
      amount: investReward,
      wallet_address: wallet_address?.toLowerCase() || "",
      name,
      memo: investReward > 0 ? "NFT 투자 리워드" : "보유 NFT 없음"
    }, {
      onConflict: "ref_code,reward_type,reward_date"
    });
  }

  // 2. 추천 리워드 계산 및 저장 (초대한 유저들의 NFT 기준)
  for (const referrer of users) {
    const { ref_code: refCode, name: refName, wallet_address, role } = referrer;
    if (!refCode) continue;

    const { data: invitees } = await supabase
      .from("users")
      .select("ref_code")
      .eq("ref_by", refCode);

    let totalReferral = 0;

    for (const invitee of invitees || []) {
      if (!invitee?.ref_code) continue;

      const { data: nftRow } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", invitee.ref_code)
        .maybeSingle();

      if (!nftRow) continue;

      const reward = +(
        REFERRAL_PERCENT *
        (Number(nftRow.nft300) * DAILY_REWARD_BY_NFT.nft300 +
         Number(nftRow.nft3000) * DAILY_REWARD_BY_NFT.nft3000 +
         Number(nftRow.nft10000) * DAILY_REWARD_BY_NFT.nft10000)
      ).toFixed(3);

      totalReferral += reward;
    }

    await supabase.from("rewards").upsert({
      ref_code: refCode,
      reward_type: "referral",
      reward_date: today,
      role,
      amount: totalReferral,
      wallet_address: wallet_address?.toLowerCase() || "",
      name: refName,
      memo: totalReferral > 0 ? `추천 리워드` : "추천 유저 없음 또는 리워드 없음"
    }, {
      onConflict: "ref_code,reward_type,reward_date"
    });
  }

  // 3. 센터 리워드 계산 및 저장 (센터 소속 유저들의 NFT 기준)
  for (const center of users) {
    const { ref_code: centerCode, name, wallet_address, role } = center;
    if (!centerCode) continue;

    const { data: members } = await supabase
      .from("users")
      .select("ref_code")
      .eq("center_id", centerCode);

    let centerTotal = 0;

    for (const member of members || []) {
      if (!member?.ref_code) continue;

      const { data: nftRow } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", member.ref_code)
        .maybeSingle();

      if (!nftRow) continue;

      const reward = +(
        CENTER_PERCENT *
        (Number(nftRow.nft300) * DAILY_REWARD_BY_NFT.nft300 +
         Number(nftRow.nft3000) * DAILY_REWARD_BY_NFT.nft3000 +
         Number(nftRow.nft10000) * DAILY_REWARD_BY_NFT.nft10000)
      ).toFixed(3);

      centerTotal += reward;
    }

    await supabase.from("rewards").upsert({
      ref_code: centerCode,
      reward_type: "center",
      reward_date: today,
      role: role || "center",
      amount: centerTotal,
      wallet_address: wallet_address?.toLowerCase() || "",
      name,
      memo: centerTotal > 0 ? `센터 리워드` : "소속 유저 없음 또는 리워드 없음"
    }, {
      onConflict: "ref_code,reward_type,reward_date"
    });
  }
}
