import React, { useMemo } from "react";
import { AnimatedCounter } from "../../components/AnimatedCounter.jsx";

/**
 * 解析带前缀/后缀的数值字符串
 * 例如 "$58.91" -> { prefix: "$", num: 58.91, suffix: "", precision: 2 }
 * "289.3M" -> { prefix: "", num: 289.3, suffix: "M", precision: 1 }
 * "79.48%" -> { prefix: "", num: 79.48, suffix: "%", precision: 2 }
 * "289,320,112" -> { prefix: "", num: 289320112, suffix: "", precision: 0 }
 */
function parseMetricValue(input) {
  if (input == null) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    const str = String(input);
    const precision = str.includes(".") ? str.split(".")[1].length : 0;
    return { prefix: "", num: input, suffix: "", precision };
  }

  const str = String(input).trim();
  if (!str || str === "—" || str === "-") return null;

  // 提取前缀
  const prefixMatch = str.match(/^[^\d\-+]*/);
  const prefix = prefixMatch ? prefixMatch[0] : "";
  const remainder = str.slice(prefix.length);

  // 提取数字部分（允许包含千分位逗号）与后缀
  const numSuffixMatch = remainder.match(/^([-+]?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!numSuffixMatch) return null;

  const rawNumStr = numSuffixMatch[1];
  const suffix = numSuffixMatch[2] || "";
  const cleanNumStr = rawNumStr.replace(/,/g, "");
  const num = Number(cleanNumStr);
  if (!Number.isFinite(num)) return null;

  const decimalPart = cleanNumStr.includes(".") ? cleanNumStr.split(".")[1] : "";
  const precision = decimalPart.length;

  return { prefix, num, suffix, precision };
}

/**
 * AnimatedMetric - 仪表盘高品质数字滚轮动效组件
 * 底层基于 RareUI AnimatedCounter 移植的独立滚轮（odometer）机制
 * 专用于大盘关键指标（Hero 总量、成本、指标轨道、模型占比）的高品质数字过渡
 */
export function AnimatedMetric({
  value,
  prefix: propPrefix,
  suffix: propSuffix,
  precision: propPrecision,
  durationMs = 600,
  className = "",
}) {
  const parsed = useMemo(() => parseMetricValue(value), [value]);

  if (parsed == null) {
    return <span className={`v3-mono-num ${className}`}>{String(value ?? "—")}</span>;
  }

  const targetNum = parsed.num;
  const targetPrecision = propPrecision ?? parsed.precision;
  const prefix = propPrefix ?? parsed.prefix;
  const suffix = propSuffix ?? parsed.suffix;
  const duration = Math.max(0.1, durationMs / 1000);

  return (
    <AnimatedCounter
      value={targetNum}
      decimals={targetPrecision}
      duration={duration}
      prefix={prefix}
      suffix={suffix}
      className={`v3-mono-num ${className}`}
    />
  );
}

export default AnimatedMetric;
