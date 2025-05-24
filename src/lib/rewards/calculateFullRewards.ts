import { supabase } from "@/lib/supabaseClient";
import { DAILY_REWARD_BY_NFT, REFERRAL_PERCENT, CENTER_PERCENT } from "@/lib/rewardRates";

export async function calculateFullRewards() {
  const today = new Date().toISOString().split("T")[0];

  const { data: users } = await supabase
    .from("users")
    .select("ref_code, name, wallet_address, ref_by, center_id");

  if (!users) return;

  // 1. 투자 리워드 저장
  for (const user of users) {
    const { ref_code, name, wallet_address, ref_by, center_id } = user;
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

    await supabase.from("reward_invests").insert({
      ref_code,
      name,
      ref_by,
      center_id,
      nft300_qty: nft300,
      nft3000_qty: nft3000,
      nft10000_qty: nft10000,
      reward_date: today,
      reward_amount: investReward,
      memo: investReward > 0 ? "NFT 투자 리워드" : "보유 NFT 없음"
    });
  }

  // 2. 추천 리워드 저장
  for (const referrer of users) {
    const { ref_code, name: refName } = referrer;
    if (!ref_code) continue;

    const { data: invitees } = await supabase
      .from("users")
      .select("ref_code, name")
      .eq("ref_by", ref_code);

    for (const invitee of invitees || []) {
      const { ref_code: inviteeCode, name: inviteeName } = invitee;
      if (!inviteeCode) continue;

      const { data: nftRow } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", inviteeCode)
        .maybeSingle();

      const nft300 = Number(nftRow?.nft300) || 0;
      const nft3000 = Number(nftRow?.nft3000) || 0;
      const nft10000 = Number(nftRow?.nft10000) || 0;

      const rewardAmount = +(
        (nft300 * DAILY_REWARD_BY_NFT.nft300 +
          nft3000 * DAILY_REWARD_BY_NFT.nft3000 +
          nft10000 * DAILY_REWARD_BY_NFT.nft10000) * REFERRAL_PERCENT
      ).toFixed(3);

      await supabase.from("reward_referrals").insert({
        ref_code,
        name: refName,
        invitee_code: inviteeCode,
        invitee_name: inviteeName,
        nft300_qty: nft300,
        nft3000_qty: nft3000,
        nft10000_qty: nft10000,
        reward_date: today,
        reward_amount: rewardAmount,
        memo: "추천 리워드"
      });
    }
  }

  // 3. 센터 리워드 저장
  for (const center of users) {
    const { ref_code, name } = center;
    if (!ref_code) continue;

    const { data: members } = await supabase
      .from("users")
      .select("ref_code, name")
      .eq("center_id", ref_code);

    for (const member of members || []) {
      const { ref_code: memberCode, name: memberName } = member;
      if (!memberCode) continue;

      const { data: nftRow } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", memberCode)
        .maybeSingle();

      const nft300 = Number(nftRow?.nft300) || 0;
      const nft3000 = Number(nftRow?.nft3000) || 0;
      const nft10000 = Number(nftRow?.nft10000) || 0;

      const rewardAmount = +(
        (nft300 * DAILY_REWARD_BY_NFT.nft300 +
          nft3000 * DAILY_REWARD_BY_NFT.nft3000 +
          nft10000 * DAILY_REWARD_BY_NFT.nft10000) * CENTER_PERCENT
      ).toFixed(3);

      await supabase.from("reward_centers").insert({
        ref_code,
        name,
        member_code: memberCode,
        member_name: memberName,
        nft300_qty: nft300,
        nft3000_qty: nft3000,
        nft10000_qty: nft10000,
        reward_date: today,
        reward_amount: rewardAmount,
        memo: "센터 리워드"
      });
    }
  }
}
