"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { readContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "@/lib/client";
import BottomNav from "@/components/BottomNav";
import { NftBurnBox } from "@/components/NftBurnBox";

const CONTRACT_ADDRESS = "0xc925cd3fbbc506b69204fe97329c6b2b33d17f99"; // SNOWBOT3000 주소
const TOKEN_ID = 2;

export default function NftPage3000() {
  const account = useActiveAccount();
  const router = useRouter();
  const [nftCount, setNftCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTBalance = useCallback(async () => {
    if (!account?.address) return;
    try {
      setLoading(true);
      const result = await readContract({
        contract: {
          client,
          chain: polygon,
          address: CONTRACT_ADDRESS,
        },
        method: "function balanceOf(address account, uint256 id) view returns (uint256)",
        params: [account.address, BigInt(TOKEN_ID)],
      });
      const count = Number(result);
      setNftCount(count);
      localStorage.setItem("nft_count_2", count.toString());
    } catch (err) {
      setError("NFT 조회 실패: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchNFTBalance();
  }, [fetchNFTBalance]);

  return (
    <main className="min-h-screen bg-[#f4f6f9] pb-24 px-0 pt-2 max-w-[500px] mx-auto relative">
      <section className="space-y-4">
        {/* 카드 박스 */}
        <div className="bg-[#DDF0F5] origin-top-left rounded-2xl shadow-md p-5">
  <div className="flex items-center gap-4">
    <img
      src="/snowbot3000.png"
      alt="SNOWBOT 3000"
      className="w-16 h-16 rounded-xl border"
    />
    <div className="flex-1 text-sm font-semibold text-gray-800 space-y-1">
      {/* 이름 */}
      <p>PADOPASS 100,000,000</p>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  </div>
</div>



        {/* 해지 신청 */}
        <div>
          <p className="text-md font-semibold text-gray-800 mb-1 pl-2">해지 신청</p>
          <NftBurnBox account={account} onBurnComplete={fetchNFTBalance} nftType="nft3000" />
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
