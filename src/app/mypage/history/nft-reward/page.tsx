"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";

// ✅ NFT 타입 정의
type NFTType = "snow300" | "snow3000" | "snow10000";

export default function NftRewardHistoryPage() {
  const account = useActiveAccount();

  // ✅ NFT 보유 수량 상태
  const [nftBalances, setNftBalances] = useState<Record<NFTType, number>>({
    snow300: 0,
    snow3000: 0,
    snow10000: 0,
  });

  const [rewardAmount, setRewardAmount] = useState(0);

  // 오늘 날짜 반환 함수
  const getToday = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!account?.address) return;

    const fetchData = async () => {
      const wallet = account.address.toLowerCase();

      // ✅ 1. NFT 보유 현황 조회
      const { data: nftData } = await supabase
        .from("nfts")
        .select("nft_type, quantity")
        .eq("owner_wallet", wallet);

      const balances: Record<NFTType, number> = {
        snow300: 0,
        snow3000: 0,
        snow10000: 0,
      };

      nftData?.forEach((nft) => {
        if (nft.nft_type in balances) {
          balances[nft.nft_type as NFTType] += nft.quantity;
        }
      });

      setNftBalances(balances);

      // ✅ 2. 오늘의 투자 리워드 조회
      const { data: rewardData } = await supabase
        .from("rewards")
        .select("amount")
        .eq("wallet_address", wallet)
        .eq("reward_type", "invest")
        .eq("reward_date", getToday())
        .maybeSingle();

      setRewardAmount(rewardData?.amount || 0);
    };

    fetchData();
  }, [account]);

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 pt-4 pb-24 max-w-md mx-auto">
      <h1 className="text-lg font-semibold mb-4">NFT 보상내역</h1>

      <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-700 space-y-3">
        <div className="font-semibold text-blue-600">📦 보유 NFT</div>
        <div>SNOWBOT 300: {nftBalances.snow300}개</div>
        <div>SNOWBOT 3000: {nftBalances.snow3000}개</div>
        <div>SNOWBOT 10000: {nftBalances.snow10000}개</div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mt-4 text-sm text-gray-700">
        <div className="font-semibold text-blue-600 mb-2">💰 오늘의 투자 리워드</div>
        <div className="text-xl font-bold text-green-600">{rewardAmount.toFixed(2)} USDT</div>
      </div>
    </main>
  );
}
