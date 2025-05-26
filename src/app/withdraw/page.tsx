"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { balanceOf } from "thirdweb/extensions/erc20";
import { client } from "@/lib/client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getKSTDateString, getKSTISOString } from "@/lib/dateUtil"; // ✅ 추가

const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

export default function WithdrawPage() {
  const router = useRouter();
  const account = useActiveAccount();

  const [balance, setBalance] = useState("0.00");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("1.0");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const contract = useMemo(() => {
    return getContract({
      client,
      chain: polygon,
      address: USDT_ADDRESS,
    });
  }, []);

  const fetchBalance = async () => {
    if (!account?.address) return;
    try {
      const result = await balanceOf({ contract, address: account.address });
      const formatted = (Number(result) / 1e6).toFixed(2);
      setBalance(formatted);
      localStorage.setItem("usdt_balance", formatted);
    } catch (err) {
      console.error("❌ 잔액 조회 실패:", err);
      setBalance("0.00");
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [account]);

  const handleWithdraw = async () => {
    if (!account?.address) {
      setStatus("❌ 로그인 후 이용해 주세요.");
      return;
    }

    if (!toAddress || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      setStatus("❌ 받는 주소를 확인하세요");
      return;
    }

    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setStatus("❌ 금액을 다시 입력하세요");
      return;
    }

    setLoading(true);
    setStatus("출금 처리 중...");

    try {
      const walletAddress = account.address.toLowerCase();
      const amountInWei = BigInt(Math.floor(amountNumber * 10 ** 6));

      const tx = prepareContractCall({
        contract,
        method: "function transfer(address _to, uint256 _value) returns (bool)",
        params: [toAddress, amountInWei],
      });

      const result = await sendTransaction({
        account,
        transaction: tx,
      });

      console.log("✅ 트랜잭션 성공:", result.transactionHash);
      setStatus(`✅ 출금 성공! TX: ${result.transactionHash}`);

      const today = getKSTDateString();
      const now = getKSTISOString();

      // ✅ Supabase 기록 (user 출금)
      let refCode = "unknown";
      try {
        const { data: user } = await supabase
          .from("users")
          .select("ref_code")
          .eq("wallet_address", walletAddress)
          .single();

        if (user?.ref_code) {
          refCode = user.ref_code;
        }
      } catch (err) {
        console.warn("❌ ref_code 조회 실패:", err);
      }

      const insertResult = await supabase.from("usdt_history").insert({
        wallet_address: walletAddress,
        ref_code: refCode,
        direction: "out",
        purpose: "user",
        amount: amountNumber,
        tx_hash: result.transactionHash + "-recv",
        status: "completed",
        reward_date: today, // ✅ 한국 날짜 저장
        // executed_at: now, // ⭕ 선택: 출금 시간 저장
      });

      if (insertResult.error) {
        console.error("[❌ Supabase 기록 실패]", insertResult.error);
        setStatus(`⚠️ 기록 실패: ${insertResult.error.message}`);
      } else {
        console.log("[✅ Supabase 기록 성공]");
      }

      // ✅ Supabase 기록 (user 입금)
      try {
        const { data: existing } = await supabase
          .from("usdt_history")
          .select("id")
          .eq("tx_hash", result.transactionHash)
          .maybeSingle();

        if (existing) {
          console.warn("⚠️ 입금 기록 생략 - 이미 존재하는 트랜잭션 해시:", result.transactionHash);
        } else {
          const { data: receiver } = await supabase
            .from("users")
            .select("ref_code")
            .eq("wallet_address", toAddress.toLowerCase())
            .maybeSingle();

          const receiverRefCode = receiver?.ref_code || "unknown";

          const inResult = await supabase.from("usdt_history").insert({
            wallet_address: toAddress.toLowerCase(),
            ref_code: receiverRefCode,
            direction: "in",
            purpose: "user",
            amount: amountNumber,
            tx_hash: result.transactionHash,
            status: "completed",
            reward_date: today, // ✅ 한국 날짜 저장
            // executed_at: now, // ⭕ 선택: 입금 시간 저장
          });

          if (inResult.error) {
            console.warn("❌ 유저간 입금 기록 실패:", inResult.error.message);
          } else {
            console.log("✅ 유저간 입금 기록 성공");
          }
        }
      } catch (err) {
        console.error("❌ 수신자 입금 기록 중 오류:", err);
      }

      setTimeout(() => {
        fetchBalance();
      }, 2000);
    } catch (err: any) {
      console.error("[X] 출금 오류:", err);
      setStatus(`❌ 실패: ${err.details || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-10">
      <div className="flex items-center px-4 py-3 bg-white border-b">
        <button onClick={() => router.back()}>
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="ml-2 text-base font-semibold text-gray-800">USDT 출금</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-800">현재 잔액</p>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-center space-x-2">
              <img src="/tether-icon.png" alt="Tether" className="w-6 h-6" />
              <span className="text-sm font-medium text-gray-700">Tether</span>
            </div>
            <span className="text-base font-bold text-gray-800">{balance} USDT</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">주소 입력</label>
          <input
            type="text"
            placeholder="주소를 입력하세요."
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">출금 수량</label>
          <div className="relative">
            <input
              type="number"
              placeholder="출금 수량을 입력하세요."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setAmount(balance)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600"
            >
              전부
            </button>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={loading}
          className={`w-full py-3 rounded-xl text-white font-semibold ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "처리 중..." : "출금하기"}
        </button>

        {status && (
          <div
            className={`p-3 rounded text-sm ${
              status.includes("✅")
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
