import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { clsx } from "clsx";

function cn(...inputs) {
  return clsx(inputs);
}

// 滚轮表面基数 0-9
const FACES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// 末尾追加 0，使 9 翻转到 0 时平滑落在相同的表面，实现无缝连续回滚
const WHEEL = [...FACES, 0];

// 每个数字单元的高度倍率，留出遮罩渐变空间
const LINE = 1.5;

// 平滑渐变遮罩：顶部和底部自然淡出，避免生硬截断
const FADE = `linear-gradient(to bottom,
  transparent 0%,
  rgb(0 0 0 / 0.06) 5.5%,
  rgb(0 0 0 / 0.5) 11%,
  rgb(0 0 0 / 0.94) 16.5%,
  black 22%,
  black 78%,
  rgb(0 0 0 / 0.94) 83.5%,
  rgb(0 0 0 / 0.5) 89%,
  rgb(0 0 0 / 0.06) 94.5%,
  transparent 100%)`;

const EASE = [0.22, 1, 0.36, 1];
const BOUNCE = 0.18;
const LEAVE = { duration: 0.18, ease: EASE };
const INSTANT = { duration: 0 };

// 弹性弹簧配置
const spring = (duration) => ({
  type: "spring",
  visualDuration: duration,
  bounce: BOUNCE,
});

const MAX_DECIMALS = 15;
const MAX_PAD = 24;
const MIN_DURATION = 0.01;
const MAX_DURATION = 60;

const mod = (n, m) => ((n % m) + m) % m;
const clamp = (n, low, high) =>
  Math.min(high, Math.max(low, Number.isFinite(n) ? n : low));
const isDigit = (char) => Boolean(char && "0123456789".includes(char));

// 占位标尺：利用 CSS Grid 重叠放置所有 0-9 数字，确保无等宽字体时轮宽依然保持绝对稳定
const SIZER = FACES.map((face) => (
  <span key={face} aria-hidden className="invisible [grid-area:1/1]">
    {face}
  </span>
));

// 滚轮垂直堆叠：垂直排列 0-9 及末位闭环 0
const STACK = WHEEL.map((face, index) => (
  <span
    key={index}
    className="flex items-center justify-center"
    style={{ height: `${LINE}em` }}
  >
    {face}
  </span>
));

const EVERY_THREE = /\B(?=(\d{3})+(?!\d))/g;
const EVERY_TWO = /\B(?=(\d{2})+(?!\d))/g;

// 数字千分位或特定国家分组格式化
function group(whole, separator, grouping) {
  if (!separator) return whole;
  if (grouping !== "indian") return whole.replace(EVERY_THREE, separator);

  // 印度记数体系：末尾 3 位，其余按 2 位配对分组
  const head = whole.slice(0, -3);
  if (!head) return whole;
  return `${head.replace(EVERY_TWO, separator)}${separator}${whole.slice(-3)}`;
}

// 测量数值参数、小数精度与宽度
function measure(value, decimals, padStart, duration) {
  const amount = Number.isFinite(value) ? value : 0;
  const places = clamp(Math.trunc(decimals), 0, MAX_DECIMALS);
  const pad = clamp(Math.trunc(padStart), 1, MAX_PAD);
  const scaled = Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.round(Math.abs(amount) * 10 ** places),
  );

  return {
    amount,
    scaled,
    places,
    pace: clamp(duration, MIN_DURATION, MAX_DURATION),
    width: Math.max(String(scaled).length, places + pad),
  };
}

// 格式化输出字符序列
function format({ scaled, places, width }, separator, decimalSeparator, grouping) {
  const raw = String(scaled).padStart(width, "0");
  const whole = group(
    raw.slice(0, raw.length - places) || "0",
    separator,
    grouping,
  );
  return places
    ? `${whole}${decimalSeparator}${raw.slice(raw.length - places)}`
    : whole;
}

// 将字符串拆解为可独立动画定位的单元格数组
function toCells(chars, width) {
  const cells = [];
  let seen = 0;
  let run = 0;

  for (const char of chars) {
    if (isDigit(char)) {
      run = 0;
      cells.push({ kind: "digit", key: width - seen++, digit: Number(char) });
    } else {
      cells.push({ kind: "mark", key: `mark-${width - seen}-${run++}`, char });
    }
  }
  return cells;
}

// 单个数字滚轮的运动控制 Hook
function useWheel(from, digit, dir, duration, reduced) {
  const pos = useMotionValue(from);
  const goal = useRef(from);
  const heading = useRef(dir);

  useEffect(() => {
    heading.current = dir;
  }, [dir]);

  useEffect(() => {
    if (reduced) {
      goal.current = digit;
      pos.set(digit);
      return undefined;
    }
    if (mod(goal.current, 10) !== digit) {
      const at = pos.get();
      goal.current =
        heading.current < 0
          ? at - mod(at - digit, 10)
          : at + mod(digit - at, 10);
    }
    const roll = animate(pos, goal.current, spring(duration));
    return () => roll.stop();
  }, [digit, duration, reduced, pos]);

  return useTransform(pos, (p) => `${(-mod(p, 10) * 100) / WHEEL.length}%`);
}

const shifts = ({ reduced, dep, shift }) => ({
  layout: !reduced,
  layoutDependency: dep,
  transition: shift,
});

const fades = (reduced) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: reduced ? INSTANT : LEAVE },
});

// 固定文本前缀/后缀包装
function Fixed({ children, ...slot }) {
  return (
    <motion.span {...shifts(slot)} className="inline-block">
      {children}
    </motion.span>
  );
}

// 分隔符与标点符号渲染（适配 React 18 forwardRef）
const Mark = React.forwardRef(function Mark({ char, ...slot }, ref) {
  return (
    <motion.span
      ref={ref}
      data-slot="animated-counter-mark"
      {...shifts(slot)}
      {...fades(slot.reduced)}
      className="inline-block"
    >
      {char}
    </motion.span>
  );
});

// 单列数字滚轮渲染（适配 React 18 forwardRef）
const Digit = memo(
  React.forwardRef(function Digit(
    { digit, from, dir, duration, ...slot },
    ref,
  ) {
    const y = useWheel(from, digit, dir, duration, slot.reduced);

    return (
      <motion.span
        ref={ref}
        data-slot="animated-counter-digit"
        {...shifts(slot)}
        {...fades(slot.reduced)}
        className="relative inline-grid overflow-hidden"
        style={{
          height: `${LINE}em`,
          lineHeight: LINE,
          maskImage: FADE,
          WebkitMaskImage: FADE,
        }}
      >
        {SIZER}
        <motion.span style={{ y }} className="absolute inset-x-0 top-0">
          {STACK}
        </motion.span>
      </motion.span>
    );
  }),
);

/**
 * AnimatedCounter - RareUI 高品质数字滚轮计数器组件
 * 移植自 https://www.rareui.com/components/animatedcounter
 *
 * @param {number} value 要展示的数值
 * @param {number} [decimals=0] 保留小数位数
 * @param {number} [duration=0.6] 滚轮停驻动画过渡时长(秒)
 * @param {number} [padStart=1] 最少展示整数位数（补零占位）
 * @param {string} [separator=","] 千分位分隔符
 * @param {string} [decimalSeparator="."] 小数点字符
 * @param {"western" | "indian"} [grouping="western"] 分组模式
 * @param {React.ReactNode} [prefix] 前缀（如货币符号、图标）
 * @param {React.ReactNode} [suffix] 后缀（如单位、百分号）
 * @param {string} [className] 根容器样式名
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 0.6,
  padStart = 1,
  separator = ",",
  decimalSeparator = ".",
  grouping = "western",
  prefix,
  suffix,
  className = "",
  ...props
}) {
  const reduced = useReducedMotion() ?? false;

  const shape = measure(value, decimals, padStart, duration);
  const chars = format(shape, separator, decimalSeparator, grouping);
  const cells = toCells(chars, shape.width);
  const negative = shape.amount < 0 && shape.scaled > 0;

  const [previous, setPrevious] = useState(shape.amount);
  const [dir, setDir] = useState(1);
  if (previous !== shape.amount) {
    setDir(shape.amount >= previous ? 1 : -1);
    setPrevious(shape.amount);
  }

  // 初始挂载状态；后续新增的位数自 0 滚动滑入
  const [seed] = useState(() => {
    const faces = {};
    for (const cell of cells) {
      if (cell.kind === "digit") faces[cell.key] = cell.digit;
    }
    return faces;
  });

  const shift = useMemo(
    () => (reduced ? INSTANT : spring(shape.pace)),
    [reduced, shape.pace],
  );

  const slot = { reduced, dep: chars.length, shift };

  return (
    <span
      data-slot="animated-counter"
      className={cn("inline-flex items-center tabular-nums", className)}
      {...props}
    >
      {prefix != null && <Fixed {...slot}>{prefix}</Fixed>}

      <span className="sr-only">
        {negative ? "-" : ""}
        {chars}
      </span>

      <span aria-hidden className="inline-flex select-none items-center">
        {negative && <Fixed {...slot}>{"-"}</Fixed>}
        <AnimatePresence mode="popLayout" initial={false}>
          {cells.map((cell) => {
            if (cell.kind === "digit") {
              return (
                <Digit
                  key={cell.key}
                  {...slot}
                  digit={cell.digit}
                  from={seed[cell.key] ?? 0}
                  dir={dir}
                  duration={shape.pace}
                />
              );
            }
            return <Mark key={cell.key} {...slot} char={cell.char} />;
          })}
        </AnimatePresence>
      </span>

      {suffix != null && <Fixed {...slot}>{suffix}</Fixed>}
    </span>
  );
}

export default AnimatedCounter;
