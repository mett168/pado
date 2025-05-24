"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import NftPage300 from "./NftPage300";
import NftPage3000 from "./NftPage3000";
import NftPage10000 from "./NftPage10000";

export default function NftMainPage() {
  const [selected, setSelected] = useState<"3000" | "10000" | "300">("3000");

  return (
    <>
      {/* ✅ TopBar는 항상 전체폭 */}
      <TopBar title="NFT 관리" showBack />

      {/* ✅ 홈과 동일하게 main은 전체폭, 내부 콘텐츠만 정렬 */}
      <main className="min-h-screen bg-[#f4f6f9] pb-20 w-full">
        <div className="px-3 pt-4 space-y-2 max-w-[500px] mx-auto">
          {/* 탭 버튼 */}
          <div className="flex gap-x-2 mb-1 mt-1">
            <button
              className={`px-4 py-2 rounded-lg text-sm ${
                selected === "3000" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setSelected("3000")}
            >
              SNOWBOT 3000
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm ${
                selected === "10000" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setSelected("10000")}
            >
              SNOWBOT 10000
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm ${
                selected === "300" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setSelected("300")}
            >
              SNOWBOT 300
            </button>
          </div>

          {/* NFT 내용 표시 */}
          {selected === "3000" && <NftPage3000 />}
          {selected === "10000" && <NftPage10000 />}
          {selected === "300" && <NftPage300 />}
        </div>
      </main>
    </>
  );
}
