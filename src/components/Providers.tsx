"use client";

import { ReactNode } from "react";
import { ThirdwebProvider as TWProvider } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";

// 타입 오류 우회용 래핑 (가능하면 향후 타입 정의로 개선 권장)
const ThirdwebProvider = TWProvider as any;

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThirdwebProvider
      activeChain={polygon}
      autoConnect={true} // ✅ 자동 연결 설정
      wallets={[
        inAppWallet({
          auth: {
            strategy: "session", // ✅ 세션 유지 전략 명시
          },
        }),
      ]}
    >
      {children}
    </ThirdwebProvider>
  );
}
