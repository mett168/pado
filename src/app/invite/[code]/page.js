'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InviteRedirectPage({ params }) {
  const router = useRouter();

  useEffect(() => {
    if (params?.code) {
      localStorage.setItem("ref_by", params.code);
      router.replace("/");
    }
  }, [params]);

  return null;
}
