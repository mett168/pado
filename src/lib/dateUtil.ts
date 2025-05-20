// src/lib/dateUtil.ts

// 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환하는 유틸 함수
export function getTodayDate(): string {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return koreaTime.toISOString().split("T")[0];
}

