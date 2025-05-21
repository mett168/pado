"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InviteDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const refCode = searchParams.get("code");

  const [summary, setSummary] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!refCode) return;

      const { data: rewardRow } = await supabase
        .from("reward_referrals")
        .select("nft300_qty, nft3000_qty, nft10000_qty, name")
        .eq("invitee_code", refCode)
        .order("reward_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: historyData } = await supabase
        .from("invite_summary_history")
        .select("summary_date, reward_total")
        .eq("invitee_code", refCode)
        .order("summary_date", { ascending: false });

      if (rewardRow) {
        setSummary({
          name: rewardRow.name,
          nft300: rewardRow.nft300_qty,
          nft3000: rewardRow.nft3000_qty,
          nft10000: rewardRow.nft10000_qty,
        });
      }
      if (historyData) setHistory(historyData);
    };

    fetchData();
  }, [refCode]);

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-24">
      <div className="w-full py-3 flex items-center px-2">
        <button onClick={() => router.push("/invite")} className="mr-3">
          <img src="/icon-back.png" alt="뒤로가기" className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-800">
          {summary?.name || "상세정보"}
        </h1>
      </div>

      <div className="max-w-md mx-auto px-0 pt-2">
        <h2 className="font-semibold text-sm text-gray-700 mb-2">친구의 NFT 자산현황</h2>
        <div className="bg-white rounded-xl shadow p-4 flex justify-between">
          <div className="text-center">
            <img src="/snow100.png" className="w-20 h-20 rounded" alt="NFT300" />
            <p className="text-xs font-bold mt-2">SNOWBOT 300</p>
            <p className="text-xs text-gray-500">
              보유수량: {summary?.nft300 || 0}개
            </p>
          </div>

          <div className="text-center">
            <img src="/snowbot3000.png" className="w-20 h-20 rounded" alt="NFT3000" />
            <p className="text-xs font-bold mt-2">SNOWBOT 3000</p>
            <p className="text-xs text-gray-500">
              보유수량: {summary?.nft3000 || 0}개
            </p>
          </div>

          <div className="text-center">
            <img src="/snowbot10000.png" className="w-20 h-20 rounded" alt="NFT10000" />
            <p className="text-xs font-bold mt-2">SNOWBOT 10000</p>
            <p className="text-xs text-gray-500">
              보유수량: {summary?.nft10000 || 0}개
            </p>
          </div>
        </div>

        <h2 className="font-semibold text-sm text-gray-700 mt-6 mb-2">
          친구초대 데일리 리워드 내역
        </h2>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="grid grid-cols-2 text-sm font-semibold text-gray-700 border-b pb-2">
            <span>날짜</span>
            <span className="text-right">리워드(USDT)</span>
          </div>
          <ul className="text-sm divide-y">
            {history.map((item, i) => (
              <li key={i} className="flex justify-between py-1">
                <span>{item.summary_date}</span>
                <span className="font-semibold">{item.reward_total}</span>
              </li>
            ))}
            {history.length === 0 && (
              <li className="py-6 text-center text-gray-400">리워드 내역이 없습니다.</li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
