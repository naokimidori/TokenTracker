/**
 * 生成 2026 年基准热力图矩阵（与视觉设计稿点阵分布高度一致）
 */
export function generate2026BaselineHeatmap() {
  const weeks = [];
  const activeDaysCount = 104;

  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      let level = 0;
      let tokens = 0;

      const monthApprox = Math.floor((w / 53) * 12);
      const isWorkday = d < 5;

      const inActiveMonth1 = monthApprox >= 1 && monthApprox <= 2;
      const inActiveMonth2 = monthApprox >= 3 && monthApprox <= 8;

      if (inActiveMonth1 || inActiveMonth2) {
        if (isWorkday && (w % 3 !== 0 || d % 2 === 0)) {
          const randFactor = (w * 7 + d * 13) % 10;
          if (randFactor > 7) {
            level = 4;
            tokens = 150000000 + randFactor * 15000000;
          } else if (randFactor > 4) {
            level = 3;
            tokens = 80000000 + randFactor * 8000000;
          } else if (randFactor > 1) {
            level = 2;
            tokens = 30000000 + randFactor * 5000000;
          } else {
            level = 1;
            tokens = 5000000 + randFactor * 2000000;
          }
        }
      }

      const dayOfYear = w * 7 + d + 1;
      const dateStr = `2026-${String(Math.min(12, monthApprox + 1)).padStart(2, "0")}-${String(
        (dayOfYear % 28) + 1,
      ).padStart(2, "0")}`;

      days.push({
        date: dateStr,
        level,
        tokens,
      });
    }
    weeks.push(days);
  }

  return { weeks, activeDaysCount };
}
