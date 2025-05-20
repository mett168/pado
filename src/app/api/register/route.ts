import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateNextReferralCode(): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .select("ref_code")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ ref_code 조회 실패:", error.message);
    throw error;
  }

  let newNumber = 10100;
  if (data.length > 0 && data[0].ref_code?.startsWith("SW")) {
    const lastNum = parseInt(data[0].ref_code.slice(2));
    newNumber = lastNum + 1;
  }

  return `SW${newNumber}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    wallet_address,
    email = "",  
    phone = "01000000000",
    ref_by = "SW10100"
  } = body;

  if (!wallet_address) {
    return NextResponse.json({ error: "지갑 주소는 필수입니다." }, { status: 400 });
  }

  const normalizedAddress = wallet_address.toLowerCase();

  // 🔍 이미 등록된 유저 확인
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id, ref_code, nickname")
    .eq("wallet_address", normalizedAddress)
    .maybeSingle();

  if (lookupError) {
    console.error("❌ 유저 조회 실패:", lookupError.message);
    return NextResponse.json({ error: "유저 조회 실패" }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({
      message: "이미 등록된 유저입니다.",
      id: existing.id,
      ref_code: existing.ref_code,
      nickname: existing.nickname,
    });
  }

  // 🆕 신규 유저 등록
  const newRefCode = await generateNextReferralCode();

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      wallet_address: normalizedAddress,
      email,
      phone,
      nickname: newRefCode,
      ref_code: newRefCode,
      ref_by,                         // 추천인 (기본 SW10100)
      center_id: ref_by,              // 센터 ID = 추천인
      role: "user",
    })
    .select("id, ref_code, nickname")
    .single();

  if (insertError) {
    console.error("❌ 등록 실패:", insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "등록 완료",
    id: inserted.id,
    ref_code: inserted.ref_code,
    nickname: inserted.nickname,
  });
}
