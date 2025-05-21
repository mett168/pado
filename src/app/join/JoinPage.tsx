// src/app/join/JoinPage.tsx
"use client";

import { useSearchParams } from "next/navigation";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">회원가입 페이지</h1>
      {ref && <p className="text-sm text-gray-500">추천 코드: {ref}</p>}
    </div>
  );
}
