"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InviteRedirectPage({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    if (code) {
      localStorage.setItem("ref_by", code);
      console.log("✅ 추천 코드 저장됨:", code);
      router.replace("/");
    }
  }, [code]);

  return null;
}
