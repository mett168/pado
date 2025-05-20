"use client";

import { ReactNode } from "react";
// ✅ 타입 무시 처리
import { ThirdwebProvider as TWProvider } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";

// ✅ 커스텀 ThirdwebProvider로 래핑
const ThirdwebProvider = TWProvider as any;

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThirdwebProvider
      activeChain={polygon}
      wallets={[inAppWallet()]}
    >
      {children}
    </ThirdwebProvider>
  );
}
