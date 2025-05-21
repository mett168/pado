import { Suspense } from "react";
import InviteDetailClient from "./InviteDetailClient"; // 👈 클라이언트 컴포넌트로 분리

export default function InviteDetailPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-gray-400">로딩 중...</div>}>
      <InviteDetailClient />
    </Suspense>
  );
}
