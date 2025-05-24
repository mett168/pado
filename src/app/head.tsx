// 📁 src/app/head.tsx

export default function Head() {
  return (
    <>
      <title>SNOWWALLET</title>
      <meta name="description" content="눈덩이처럼 불어나는 나의 자산, SNOWWALLET" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#ffffff" />

      {/* 앱 아이콘 */}
      <link rel="icon" href="/icon-192.png" />
      <link rel="apple-touch-icon" href="/icon-192.png" />
      <link rel="manifest" href="/manifest.json" />

      {/* SNS / 공유 썸네일 */}
      <meta property="og:title" content="SNOWWALLET" />
      <meta property="og:description" content="눈덩이처럼 불어나는 나의 자산, SNOWWALLET" />
      <meta property="og:image" content="/og-image.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://snowwallet.io" />
    </>
  );
}
