"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterInfoPage() {
  const account = useActiveAccount();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async () => {
    if (!account?.address) {
      alert("지갑이 연결되지 않았습니다.");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ name, email, phone })
      .eq("wallet_address", account.address.toLowerCase());  // ✅ 여기!

    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      router.push("/home");
    }
  };

  return (
    <main className="min-h-screen bg-[#eef3f8] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-[#333]">📋 정보 입력하기</h2>
        <p className="text-sm text-[#555]">서비스 이용을 위해 아래의 정보를 입력 후 제출해주세요.</p>

        <input
          className="w-full p-3 border border-gray-300 rounded-lg bg-white placeholder-gray-400"
          placeholder="성함을 입력하세요."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full p-3 border border-gray-300 rounded-lg bg-white placeholder-gray-400"
          placeholder="등록 이메일 주소를 입력하세요."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex w-full gap-2">
          <span className="px-4 py-3 rounded-lg bg-gray-200 text-sm">+82</span>
          <input
            className="flex-1 p-3 border border-gray-300 rounded-lg bg-white placeholder-gray-400"
            placeholder="휴대폰 번호를 입력하세요."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg mt-4"
        >
          제출하기
        </button>
      </div>
    </main>
  );
}
