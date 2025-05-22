"use client";

import { useState } from "react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "@/lib/client";
import { supabase } from "@/lib/supabaseClient";

const CONTRACT_ADDRESS = "0xc925cd3fbbc506b69204fe97329c6b2b33d17f99";
const RECEIVER = "0xFa0614c4E486c4f5eFF4C8811D46A36869E8aEA1"; // 고정 수신 주소

export function NftBurnBox({
  account,
  onBurnComplete,
  nftType = "nft300"
}: {
  account: any;
  onBurnComplete?: () => void;
  nftType?: string;
}) {
  const [burnAmount, setBurnAmount] = useState("");
  const [txPending, setTxPending] = useState(false);

  // ✅ TOKEN_ID 동적 처리
  const TOKEN_ID =
    nftType === "nft3000" ? 2 : nftType === "nft10000" ? 3 : 1;

  const handleBurn = async () => {
    if (!account?.address || !burnAmount) {
      alert("지갑 주소 또는 해지 수량이 없습니다.");
      return;
    }

    try {
      setTxPending(true);

      const transaction = await prepareContractCall({
        contract: {
          address: CONTRACT_ADDRESS,
          chain: polygon,
          client,
        },
        method:
          "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
        params: [account.address, RECEIVER, BigInt(TOKEN_ID), BigInt(Math.floor(Number(burnAmount))), "0x"],
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account,
      });

      console.log("🔥 NFT 해지 완료 → 전송됨:", transactionHash);

      // 🔍 ref_code 조회
      const { data: senderData } = await supabase
        .from("users")
        .select("ref_code")
        .eq("wallet_address", account.address.toLowerCase())
        .maybeSingle();

      const senderRef = senderData?.ref_code || "unknown";

      // ✅ Supabase 기록 (출금 only, 목적: return)
      await supabase.from("nft_transfers").insert([
        {
          ref_code: senderRef,
          nft_type: nftType,
          direction: "out",
          purpose: "return",
          quantity: Number(burnAmount),
          tx_hash: transactionHash,
          status: "completed",
        },
      ]);

      alert("✅ NFT 해지 완료 및 기록 저장됨");

      if (onBurnComplete) {
        onBurnComplete(); // ✅ 잔고 갱신 요청
      }
    } catch (err) {
      console.error("❌ 해지 실패:", err);
      alert("해지 실패: " + (err as Error).message);
    } finally {
      setTxPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 mt-2">
      <input
        type="number"
        placeholder="해지 수량을 입력하세요."
        className="w-full border rounded-md p-2 text-sm mb-2"
        value={burnAmount}
        onChange={(e) => setBurnAmount(e.target.value)}
      />
      <button
        onClick={handleBurn}
        disabled={txPending}
        className="w-full bg-[#0066D6] text-white py-2 rounded-md text-sm"
      >
        {txPending ? "해지 중..." : "NFT 해지하기"}
      </button>
      <p className="text-xs text-gray-400 mt-1">
        구매한 NFT를 <strong>지정된 주소로 전송하여 환불</strong> 처리합니다. 전송 후에는 리워드가 중단되며, 24시간 이내 USDT로 환불됩니다.
      </p>
    </div>
  );
}
