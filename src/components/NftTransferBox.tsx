"use client";

import { useState } from "react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "@/lib/client";
import { supabase } from "@/lib/supabaseClient";

const CONTRACT_ADDRESS = "0xc925cd3fbbc506b69204fe97329c6b2b33d17f99";
// 기존 TOKEN_ID는 주석 처리 (고정 방식)
// const TOKEN_ID = 1;

export default function NftTransferBox({
  account,
  nftType = "nft300",
  onTransferComplete,
}: {
  account: any;
  nftType?: string;
  onTransferComplete?: () => void;
}) {
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [txPending, setTxPending] = useState(false);

  // ✅ 동적 TOKEN_ID 처리
  const TOKEN_ID =
    nftType === "nft3000" ? 2 : nftType === "nft10000" ? 3 : 1;

  const handleTransfer = async () => {
    console.log("🚀 handleTransfer 시작");
    if (!account?.address || !transferTo || !transferAmount) {
      console.warn("❌ 입력값 부족");
      return;
    }
    try {
      setTxPending(true);
      console.log("🔗 safeTransferFrom 실행 준비");

      const transaction = await prepareContractCall({
        contract: {
          address: CONTRACT_ADDRESS,
          chain: polygon,
          client,
        },
        method:
          "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
        params: [
          account.address,
          transferTo,
          BigInt(TOKEN_ID),
          BigInt(Math.floor(Number(transferAmount))),
          "0x",
        ],
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account,
      });
      console.log("✅ 전송 완료, 트랜잭션 해시:", transactionHash);

      // 🔍 Supabase용 ref_code 조회
      const { data: senderData } = await supabase
        .from("users")
        .select("ref_code")
        .eq("wallet_address", account.address.toLowerCase())
        .maybeSingle();

      const { data: receiverData } = await supabase
        .from("users")
        .select("ref_code")
        .eq("wallet_address", transferTo.toLowerCase())
        .maybeSingle();

      const senderRef = senderData?.ref_code || "unknown";
      const receiverRef = receiverData?.ref_code || "unknown";

      // ✅ Supabase 기록
      await supabase.from("nft_transfers").insert([
        {
          ref_code: senderRef,
          nft_type: nftType,
          direction: "out",
          purpose: "normal",
          quantity: Number(transferAmount),
          tx_hash: transactionHash,
          status: "completed",
        },
        {
          ref_code: receiverRef,
          nft_type: nftType,
          direction: "in",
          purpose: "normal",
          quantity: Number(transferAmount),
          tx_hash: transactionHash,
          status: "completed",
        },
      ]);

      alert("✅ NFT 전송 완료 및 기록 저장됨");
      if (onTransferComplete) onTransferComplete();
    } catch (err) {
      console.error("❌ 전송 실패:", err);
      alert("전송 실패: " + (err as Error).message);
    } finally {
      setTxPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <input
        type="number"
        placeholder="양도 수량을 입력하세요."
        className="w-full border rounded-md p-2 text-sm mb-2"
        value={transferAmount}
        onChange={(e) => setTransferAmount(e.target.value)}
      />
      <input
        type="text"
        placeholder="받는 사람 지갑 주소를 입력하세요."
        className="w-full border rounded-md p-2 text-sm mb-2"
        value={transferTo}
        onChange={(e) => setTransferTo(e.target.value)}
      />
      <button
        onClick={handleTransfer}
        disabled={txPending}
        className="w-full bg-[#0066D6] text-white py-2 rounded-md text-sm"
      >
        {txPending ? "전송 중..." : "NFT 양도하기"}
      </button>
      <p className="text-xs text-gray-400 mt-1">
        입력한 주소로 양도한 후에는 소유권이 모두 받은 사람에게 이전됩니다.
      </p>
    </div>
  );
}
