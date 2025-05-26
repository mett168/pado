"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InviteDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const refCode = searchParams.get("code");

  const [summary, setSummary] = useState({
    nft300: 0,
    nft3000: 0,
    nft10000: 0,
  });
  const [history, setHistory] = useState<{ date: string; amount: number }[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!refCode) return;

      // 유저 name 조회
      const { data: user } = await supabase
        .from("users")
        .select("name")
        .eq("ref_code", refCode)
        .maybeSingle();

      if (user?.name) setName(user.name);

      // NFT 보유 수량 조회
      const { data: nfts } = await supabase
        .from("nfts")
        .select("nft300, nft3000, nft10000")
        .eq("ref_code", refCode);

      const count = { nft300: 0, nft3000: 0, nft10000: 0 };
      nfts?.forEach((row) => {
        count.nft300 += row.nft300 || 0;
        count.nft3000 += row.nft3000 || 0;
        count.nft10000 += row.nft10000 || 0;
      });
      setSummary(count);

      // 리워드 내역 조회
      const { data: historyData, error: historyError } = await supabase
        .from("reward_transfers")
        .select("created_at, total_amount")
        .eq("ref_code", refCode)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("❌ 리워드 기록 조회 실패:", historyError.message);
      }

      if (historyData) {
        const formatted = historyData.map((item: any) => {
          const kst = new Date(new Date(item.created_at).getTime() + 9 * 60 * 60 * 1000);
          const dateStr = `${kst.getFullYear()}. ${kst.getMonth() + 1}. ${kst.getDate()}.`;
          return {
            date: dateStr,
            amount: item.total_amount,
          };
        });
        setHistory(formatted);
      }
    };

    fetchData();
  }, [refCode]);

  const nftAssets = [
    {
      label: "SNOWBOT 300",
      image: "/snow100.png",
      qty: summary.nft300,
    },
    {
      label: "SNOWBOT 3000",
      image: "/snowbot3000.png",
      qty: summary.nft3000,
    },
    {
      label: "SNOWBOT 10000",
      image: "/snowbot10000.png",
      qty: summary.nft10000,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-24">
      {/* 상단바 */}
      <div className="w-full py-3 flex items-center px-2">
        <button onClick={() => router.push("/invite")} className="mr-3">
          <img src="/icon-back.png" alt="뒤로가기" className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-800">
          {name || "상세정보"}
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-2">
        {/* NFT 자산현황 */}
        <h2 className="font-semibold text-sm text-gray-700 mb-2 pl-2">
          {name ? `${name} 님의 NFT 자산현황` : "NFT 자산현황"}
        </h2>
        <div className="bg-white rounded-xl shadow p-4 flex flex-col space-y-3">
          {nftAssets.map((nft, idx) => (
            <div key={idx} className="flex items-center">
              <img
                src={nft.image}
                alt={nft.label}
                className="w-14 h-14 rounded mr-4"
              />
              <div>
                <p className="text-sm font-semibold text-gray-800">{nft.label}</p>
                <p className="text-xs text-gray-500">
                  보유 수량: <span className="text-blue-600 font-medium">{nft.qty}개</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 리워드 내역 */}
        <h2 className="font-semibold text-sm text-gray-700 mt-6 mb-2 pl-2">
          {name ? `${name} 님 데일리 리워드 내역` : "데일리 리워드 내역"}
        </h2>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="grid grid-cols-2 text-sm font-semibold text-gray-700 border-b pb-2">
            <span>날짜</span>
            <span className="text-right">리워드(USDT)</span>
          </div>
          <ul className="text-sm divide-y">
            {history.length > 0 ? (
              history.map((item, i) => (
                <li key={i} className="flex justify-between py-1">
                  <span>{item.date}</span>
                  <span className="font-semibold">{item.amount}</span>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-gray-400">
                리워드 내역이 없습니다.
              </li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
