"use client";

import TopBar from "@/components/TopBar";
import NftPage3000 from "./NftPage3000";

export default function NftMainPage() {
  return (
    <>
      {/* ✅ 상단 TopBar */}
      <TopBar title="NFT 관리" showBack />

      {/* ✅ 메인 콘텐츠 */}
      <main className="min-h-screen bg-[#f4f6f9] pb-20 w-full">
        <div className="px-3 pt-4 space-y-2 max-w-[500px] mx-auto">
          {/* NFT 내용 표시 (3000만 표시) */}
          <NftPage3000 />
        </div>
      </main>
    </>
  );
}
