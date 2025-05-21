"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { readContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "@/lib/client";
import BottomNav from "@/components/BottomNav";
import NftTransferBox from "@/components/NftTransferBox";
import { NftBurnBox } from "@/components/NftBurnBox";

const CONTRACT_ADDRESS = "0xc925cd3fbbc506b69204fe97329c6b2b33d17f99"; // SNOWBOT10000 주소
const TOKEN_ID = 3;

export default function NftPage10000() {
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
      localStorage.setItem("nft_count_3", count.toString());
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
    <main className="min-h-screen bg-[#f4f6f9] pb-24 px-0 pt-4 max-w-[500px] mx-auto relative">
      <section className="space-y-4">
        {/* 카드 박스 */}
        <div className="bg-green-100 origin-top-left rounded-2xl shadow-md p-6">
          <div className="flex items-center space-x-6">
            <img src="/snowbot10000.png" alt="SNOW BOT 10000" className="w-24 h-24 rounded-xl border" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-800 text-sm font-semibold">이름</span>
                <span className="font-semibold text-gray-800 text-lg">SNOW BOT 10000</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-800 text-sm font-semibold">총 수량</span>
                <span className="text-base text-gray-800 font-semibold">
                  {loading ? "조회 중..." : nftCount ?? 0}
                </span>
              </div>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">양도 신청</p>
          <NftTransferBox account={account} onTransferComplete={fetchNFTBalance} nftType="nft10000" />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">해지 신청</p>
          <NftBurnBox account={account} onBurnComplete={fetchNFTBalance} nftType="nft10000" />
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
