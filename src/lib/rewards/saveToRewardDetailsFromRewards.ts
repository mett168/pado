import { supabase } from "@/lib/supabaseClient";
import { DAILY_REWARD_BY_NFT, REFERRAL_PERCENT, CENTER_PERCENT } from "@/lib/rewardRates";

export async function saveToRewardDetailsFromRewards() {
  const today = new Date().toISOString().split("T")[0];

  const { data: rewards } = await supabase
    .from("rewards")
    .select("ref_code, reward_type, amount, reward_date, name, wallet_address")
    .eq("reward_date", today);

  if (!rewards) return;

  for (const reward of rewards) {
    const {
      ref_code,
      reward_type,
      amount,
      reward_date,
      name,
      wallet_address
    } = reward;

    const finalName = name || "이름없음";
    const finalWallet = wallet_address?.toLowerCase() || "";

    // 1. 투자 리워드 처리
    if (reward_type === "invest") {
      const { data: nftRow } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", ref_code)
        .maybeSingle();

      const nft300 = Number(nftRow?.nft300) || 0;
      const nft3000 = Number(nftRow?.nft3000) || 0;
      const nft10000 = Number(nftRow?.nft10000) || 0;

      await supabase.from("reward_invests").upsert({
        ref_code,
        reward_date,
        reward_amount: amount,
        nft300_qty: nft300,
        nft3000_qty: nft3000,
        nft10000_qty: nft10000,
        wallet_address: finalWallet,
        name: finalName,
        memo: "NFT 투자 리워드"
      }, { onConflict: "ref_code,reward_date" });
    }

    // 2. 추천 리워드 처리
    if (reward_type === "referral") {
      const { data: invitees } = await supabase
        .from("users")
        .select("ref_code")
        .eq("ref_by", ref_code);

      for (const invitee of invitees || []) {
        if (!invitee?.ref_code) continue;

        const { data: nftRow } = await supabase
          .from("nfts")
          .select("nft300, nft3000, nft10000")
          .eq("ref_code", invitee.ref_code)
          .maybeSingle();

        const nft300 = Number(nftRow?.nft300) || 0;
        const nft3000 = Number(nftRow?.nft3000) || 0;
        const nft10000 = Number(nftRow?.nft10000) || 0;

        const rewardAmount = +(
          (nft300 * DAILY_REWARD_BY_NFT.nft300 +
            nft3000 * DAILY_REWARD_BY_NFT.nft3000 +
            nft10000 * DAILY_REWARD_BY_NFT.nft10000) * REFERRAL_PERCENT
        ).toFixed(3);

        await supabase.from("reward_referrals").upsert({
          ref_code,
          invitee_code: invitee.ref_code,
          reward_date,
          reward_amount: rewardAmount,
          nft300_qty: nft300,
          nft3000_qty: nft3000,
          nft10000_qty: nft10000,
          wallet_address: finalWallet,
          name: finalName,
          memo: "추천 리워드"
        }, { onConflict: "ref_code,invitee_code,reward_date" });
      }
    }

    // 3. 센터 리워드 처리
    if (reward_type === "center") {
      const { data: members } = await supabase
        .from("users")
        .select("ref_code")
        .eq("center_id", ref_code);

      for (const member of members || []) {
        if (!member?.ref_code) continue;

        const { data: nftRow } = await supabase
          .from("nfts")
          .select("nft300, nft3000, nft10000")
          .eq("ref_code", member.ref_code)
          .maybeSingle();

        const nft300 = Number(nftRow?.nft300) || 0;
        const nft3000 = Number(nftRow?.nft3000) || 0;
        const nft10000 = Number(nftRow?.nft10000) || 0;

        const rewardAmount = +(
          (nft300 * DAILY_REWARD_BY_NFT.nft300 +
            nft3000 * DAILY_REWARD_BY_NFT.nft3000 +
            nft10000 * DAILY_REWARD_BY_NFT.nft10000) * CENTER_PERCENT
        ).toFixed(3);

        await supabase.from("reward_centers").upsert({
          ref_code,
          member_code: member.ref_code,
          reward_date,
          reward_amount: rewardAmount,
          nft300_qty: nft300,
          nft3000_qty: nft3000,
          nft10000_qty: nft10000,
          wallet_address: finalWallet,
          name: finalName,
          memo: "센터 리워드"
        }, { onConflict: "ref_code,member_code,reward_date" });
      }
    }
  }
}
