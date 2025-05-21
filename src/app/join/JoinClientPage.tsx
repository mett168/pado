// src/app/join/JoinClientPage.tsx
"use client";

import { useSearchParams } from "next/navigation";

export default function JoinClientPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">회원가입</h1>
      {ref && <p className="text-sm text-gray-500">추천코드: {ref}</p>}
    </main>
  );
}
