"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

interface Invitee {
  ref_code: string;
  name: string;
  created_at: string;
  total_reward: number;
  nft300: number;
  nft3000: number;
  nft10000: number;
}

export default function InvitePage() {
  const account = useActiveAccount();
  const [refCode, setRefCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [invitees, setInvitees] = useState<Invitee[]>([]);

  // ✅ 추천코드 + 초대링크 생성
  useEffect(() => {
    const loadRefCode = async () => {
      if (!account?.address) return;

      const { data } = await supabase
        .from("users")
        .select("ref_code")
        .eq("wallet_address", account.address.toLowerCase())
        .single();

      if (data?.ref_code) {
        setRefCode(data.ref_code);
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setInviteLink(`${origin}/invite/${data.ref_code}`);
      }
    };
    loadRefCode();
  }, [account]);

  // ✅ 내가 초대한 유저 목록 불러오기
  useEffect(() => {
    const loadInvitees = async () => {
      if (!refCode) return;

      const { data } = await supabase
        .from("users")
        .select("ref_code, name, created_at")
        .eq("ref_by", refCode)
        .order("created_at", { ascending: false });

      if (data) {
        setInvitees(
          data.map((user: any) => ({
            ref_code: user.ref_code,
            name: user.name || user.ref_code,
            created_at: user.created_at,
            total_reward: 0,
            nft300: 0,
            nft3000: 0,
            nft10000: 0,
          }))
        );
      }
    };
    loadInvitees();
  }, [refCode]);

  // ✅ 초대링크 복사
  const handleCopy = async () => {
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
        <div className="px-4 pt-4 max-w-md mx-auto space-y-6">
          {/* ✅ 추천 코드 및 초대링크 */}
          <section className="bg-white p-4 rounded-xl shadow text-center space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">나의 추천 코드</h2>
            <div className="text-xl font-bold text-blue-600">{refCode || "불러오는 중..."}</div>
            {inviteLink && (
              <>
                <a
                  href={inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline break-all block"
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
          </section>

          {/* ✅ 초대 친구 목록 (테이블) */}
          <section className="bg-white p-4 rounded-xl shadow">
            <h3 className="text-base font-semibold text-gray-800 mb-2">나의 초대 친구</h3>
            {invitees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-center border">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-semibold">
                      <th className="p-2 border">친구</th>
                      <th className="p-2 border">추천 리워드</th>
                      <th className="p-2 border">날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitees.map((user, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 border">
                          <div className="flex items-center justify-center gap-2">
                            <span>{user.name}</span>
                            <Link href={`/invite-detail?code=${user.ref_code}`}>
                              <button className="bg-gray-200 text-xs px-2 py-0.5 rounded">
                                상세보기
                              </button>
                            </Link>
                          </div>
                        </td>
                        <td className="p-2 border">{user.total_reward.toFixed(1)}</td>
                        <td className="p-2 border">
                          {new Date(user.created_at).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-4">초대한 친구가 없습니다.</p>
            )}
          </section>
        </div>
        <BottomNav />
      </main>
    </>
  );
}
