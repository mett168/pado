// src/lib/sendUSDT.ts

import { client } from "@/lib/client";
import { polygon } from "thirdweb/chains";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { balanceOf } from "thirdweb/extensions/erc20";
import { supabase } from "@/lib/supabaseClient"; // ✅ Supabase import

const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58E8F";

export async function sendUSDT(to: string, amount: number) {
  console.log("🚀 [sendUSDT] 호출됨");
  console.log("📌 수신자 주소:", to);
  console.log("📌 송금 금액:", amount);

  if (!to || amount <= 0) {
    console.error("❌ [입력 오류] 잘못된 주소 또는 금액:", to, amount);
    throw new Error("잘못된 주소 또는 금액");
  }

  try {
    // ✅ 관리자 지갑 연결
    const adminWallet = privateKeyToAccount({
      client,
      privateKey: process.env.ADMIN_PRIVATE_KEY!,
    });

    const adminAddress = adminWallet.address;
    console.log("✅ [지갑 연결 성공] 관리자 주소:", adminAddress);

    // ✅ USDT 잔고 확인
    const balance = await balanceOf({
      contract: {
        address: USDT_ADDRESS,
        chain: polygon,
        client,
      },
      address: adminAddress,
    });
    console.log("💰 [잔고 확인] USDT 잔액:", Number(balance) / 1e6, "USDT");

    // ✅ 금액 변환 (소수점 6자리 → 정수)
    const parsedAmount = BigInt(Math.floor(amount * 1_000_000));
    console.log("🔢 [금액 변환] 전송 금액:", parsedAmount.toString());

    // ✅ 트랜잭션 구성
    const transaction = await prepareContractCall({
      contract: {
        address: USDT_ADDRESS,
        chain: polygon,
        client,
      },
      method: "function transfer(address recipient, uint256 amount)",
      params: [to, parsedAmount],
    });
    console.log("📦 [트랜잭션 준비 완료]");

    // ✅ 전송
    const result = await sendTransaction({
      transaction,
      account: adminWallet,
    });

    if (!result.transactionHash) {
      throw new Error("트랜잭션 해시 없음 → 전송 실패");
    }

    const txHash = result.transactionHash;
    console.log("🎉 [전송 성공] 트랜잭션 해시:", txHash);

    // ✅ Supabase에 ref_code 조회
    const { data: user, error } = await supabase
      .from("users")
      .select("ref_code")
      .eq("wallet_address", to.toLowerCase())
      .single();

    const refCode = user?.ref_code || "unknown";

    // ✅ Supabase 기록 저장
    await supabase.from("usdt_history").insert({
      ref_code: refCode,
      direction: "out",
      amount: amount,
      tx_hash: txHash,
      status: "completed",
    });

    console.log("📝 [기록 완료] usdt_history 저장됨");

    return { transactionHash: txHash };
  } catch (error: any) {
    console.error("❌ [예외 발생] sendUSDT 오류:", error);
    throw new Error("송금 중 오류 발생: " + (error?.message || "알 수 없는 오류"));
  }
}
