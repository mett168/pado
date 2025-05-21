// src/app/join/page.tsx
import { Suspense } from "react";
import JoinClientPage from "./JoinClientPage";

export default function JoinPageWrapper() {
  return (
    <Suspense fallback={<p>로딩 중...</p>}>
      <JoinClientPage />
    </Suspense>
  );
}

