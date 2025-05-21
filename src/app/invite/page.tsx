"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import Link from "next/link";

interface InviteeSummary {
  name: string;
  total_reward: number;
  created_at: string;
  ref_code: string;
  nft300: number;
  nft3000: number;
  nft10000: number;
}

export default function InvitePage() {
  const account = useActiveAccount();
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [invitees, setInvitees] = useState<InviteeSummary[]>([]);

  useEffect(() => {
    const fetchReferralCode = async () => {
      if (!account?.address) return;
      const lowerAddress = account.address.toLowerCase();
      const { data } = await supabase
        .from("users")
        .select("ref_code")
        .eq("wallet_address", lowerAddress)
        .maybeSingle();

      if (data?.ref_code) {
        setInviteCode(data.ref_code);
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setInviteLink(`${origin}/join?ref=${data.ref_code}`);
      }
    };
    fetchReferralCode();
  }, [account]);

  useEffect(() => {
    const fetchInviteesFromUsers = async () => {
      if (!inviteCode) return;

      const { data, error } = await supabase
        .from("users")
        .select("ref_code, name, created_at")
        .eq("ref_by", inviteCode)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ 초대 유저 조회 실패:", error.message);
        return;
      }

      if (data) {
        setInvitees(
          data.map((user: any) => ({
            name: user.name || user.ref_code,
            total_reward: 0,
            created_at: user.created_at,
            ref_code: user.ref_code,
            nft300: 0,
            nft3000: 0,
            nft10000: 0,
          }))
        );
      }
    };
    fetchInviteesFromUsers();
  }, [inviteCode]);

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("복사 실패: 수동으로 복사해주세요.");
    }
  };

  return (
    <>
      <TopBar title="친구초대" showBack />
      <main className="min-h-screen bg-[#f5f7fa] pb-32 w-full">
        <div className="px-4 pt-4 max-w-md mx-auto">
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">나의 추천 코드</h2>
            <div className="bg-white p-4 rounded-xl shadow space-y-2 text-center">
              <div className="text-blue-600 font-bold text-xl">
                {inviteCode || "불러오는 중..."}
              </div>
              {inviteLink && (
                <>
                  <a
                    href={inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline break-all block"
                  >
                    {inviteLink}
                  </a>
                  <button
                    onClick={handleCopy}
                    className="mt-2 w-full bg-blue-600 text-white py-2 rounded text-sm font-semibold"
                  >
                    {copied ? "✅ 복사됨" : "초대 링크 복사하기"}
                  </button>
                </>
              )}
            </div>
          </section>

          <div className="mb-2 text-left text-base font-semibold text-gray-700">나의 초대 친구</div>
          <div className="bg-white p-4 rounded-xl shadow min-h-[200px]">
            <div className="grid grid-cols-3 text-center text-sm font-semibold text-gray-700 border-b pb-2">
              <div>친구</div>
              <div>추천 리워드</div>
              <div>날짜</div>
            </div>
            {invitees.length > 0 ? (
              invitees.map((user, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-3 text-sm text-center py-2 border-b last:border-none items-center"
                >
                  <div className="flex justify-center items-center gap-1">
                    <span>{user.name}</span>
                    <Link href={`/invite-detail?code=${user.ref_code}`}>
                      <button className="bg-gray-200 text-xs px-2 py-0.5 rounded">상세보기</button>
                    </Link>
                  </div>
                  <div>{user.total_reward.toFixed(1)}</div>
                  <div>{new Date(user.created_at).toLocaleDateString()}</div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-gray-400">초대한 친구가 없습니다.</p>
            )}
          </div>
        </div>
        <BottomNav />
      </main>
    </>
  );
}
