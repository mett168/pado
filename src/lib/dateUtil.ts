// 한국시간 ISO 문자열 (타임스탬프 저장용)
export function getKSTISOString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString(); // ISO 포맷 ('Z'는 그대로지만 KST 기준 값)
}

// 한국 날짜 문자열 (YYYY-MM-DD) 저장용
export function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

