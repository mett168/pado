import { client } from "@/lib/client";
import { polygon } from "thirdweb/chains";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { balanceOf } from "thirdweb/extensions/erc20";
import { supabase } from "@/lib/supabaseClient";

const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

// ✅ 반드시 stateMutability 포함
const USDT_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable", // ✅ 필수!!
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    outputs: [
      { name: "success", type: "bool" }
    ]
  }
] as const;

export async function sendUSDT(to: string, amount: number) {
  console.log("🚀 [sendUSDT] 호출됨");
  console.log("📌 수신자 주소:", to);
  console.log("📌 송금 금액:", amount);

  if (!to || amount <= 0) {
    console.error("❌ [입력 오류] 잘못된 주소 또는 금액:", to, amount);
    throw new Error("잘못된 주소 또는 금액");
  }

  try {
    const adminWallet = privateKeyToAccount({
      client,
      privateKey: process.env.ADMIN_PRIVATE_KEY!,
    });

    const adminAddress = adminWallet.address;
    console.log("✅ [지갑 연결 성공] 관리자 주소:", adminAddress);

    const balance = await balanceOf({
      contract: {
        address: USDT_ADDRESS,
        chain: polygon,
        client,
      },
      address: adminAddress,
    });

    console.log("💰 [잔고 확인] USDT 잔액:", Number(balance) / 1e6, "USDT");

    const parsedAmount = BigInt(Math.floor(amount * 1_000_000));
    console.log("🔢 [전송 금액]", parsedAmount.toString());

    const contract = getContract({
      address: USDT_ADDRESS,
      chain: polygon,
      client,
      abi: USDT_ABI,
    });

    const transaction = prepareContractCall({
      contract,
      method: "transfer",
      params: [to, parsedAmount],
    });

    const result = await sendTransaction({
      transaction,
      account: adminWallet,
    });

    const txHash = result.transactionHash;
    if (!txHash) {
      throw new Error("트랜잭션 해시 없음 → 전송 실패");
    }

    console.log("🎉 [전송 성공] 트랜잭션 해시:", txHash);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("ref_code")
      .eq("wallet_address", to.toLowerCase())
      .maybeSingle();

    if (userError) {
      console.warn("⚠️ [유저 조회 오류]:", userError.message);
    }

    const refCode = user?.ref_code || "unknown";

    const { error: insertError } = await supabase.from("usdt_history").insert({
      ref_code: refCode,
      direction: "out",
      amount: amount,
      tx_hash: txHash,
      status: "completed",
    });

    if (insertError) {
      console.warn("⚠️ [기록 저장 오류]:", insertError.message);
    }

    console.log("📝 [기록 완료] usdt_history 저장됨");

    return { transactionHash: txHash };
  } catch (error: any) {
    const errMsg = error?.message || "알 수 없는 오류";
    console.error("❌ [예외 발생] sendUSDT 오류:", errMsg);
    throw new Error("송금 중 오류 발생: " + errMsg);
  }
}
