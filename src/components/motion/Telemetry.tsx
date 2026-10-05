"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Counts from 0 to `value` once the element scrolls into view.
 * Used for the metric strip (5+, 1000+, 99.4%).
 */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1.9,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (reduce) {
      // Respects prefers-reduced-motion by snapping straight to the value.
      const frame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(frame);
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / (duration * 1000);
      // easeOutExpo — fast start, long settle, reads as "instrument calibrating"
      const eased = elapsed >= 1 ? 1 : 1 - Math.pow(2, -10 * elapsed);
      setDisplay(value * eased);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduce]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * A thin progress bar that fills when scrolled into view.
 * Drives the free-shipping meters and stock-level readouts.
 */
export function ProgressBar({
  value,
  tone = "blue",
  className,
  delay = 0,
  showTicks = false,
}: {
  value: number;
  tone?: "blue" | "cyan" | "amber" | "red";
  className?: string;
  delay?: number;
  showTicks?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();

  const tones = {
    blue: "bg-border-active shadow-glow",
    cyan: "bg-tertiary shadow-glow-tertiary",
    amber: "bg-amber-400",
    red: "bg-error",
  } as const;

  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      ref={ref}
      className={cn("relative h-1 w-full overflow-hidden bg-surface-deep", className)}
    >
      <motion.div
        className={cn("h-full origin-left", tones[tone])}
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: clamped / 100 } : { scaleX: 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }
        }
      />
      {showTicks ? (
        <div className="pointer-events-none absolute inset-0 flex justify-between">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="w-px bg-border-subtle" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Live "telemetry" sparkline. Draws a jagged trace then sweeps a highlight
 * across it — the signature motion of the diagnostic panels.
 */
export function TelemetryTrace({
  points = 46,
  className,
  animate = true,
}: {
  points?: number;
  className?: string;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();

  // Deterministic pseudo-random walk so SSR and client markup agree.
  const path = useMemo(() => {
    const width = 300;
    const height = 40;
    const mid = height / 2;
    const amplitude = height * 0.36;

    // Linear congruential sequence — pure, so no shared mutable state.
    const nextRandom = (() => {
      let seed = 7;
      return () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    })();

    const segments: string[] = [`M0,${mid}`];
    for (let i = 1; i <= points; i++) {
      const x = (i / points) * width;
      // Mostly flat with occasional spikes — reads like a real signal.
      const spike = nextRandom() > 0.78 ? 2.4 : 1;
      const y = mid + (nextRandom() - 0.5) * amplitude * spike;
      segments.push(` L${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return segments.join("");
  }, [points]);

  return (
    <svg
      viewBox="0 0 300 40"
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {animate && !reduce ? (
        <>
          <rect
            x="0"
            y="0"
            width="26"
            height="40"
            fill="url(#trace-sweep)"
            className="animate-sweep"
          />
          <defs>
            <linearGradient id="trace-sweep" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
        </>
      ) : null}
    </svg>
  );
}

/** Pulsing live-status dot. */
export function StatusDot({ tone = "cyan", className }: { tone?: "cyan" | "green"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 animate-pulse-dot",
        tone === "cyan" ? "bg-tertiary" : "bg-emerald-400",
        className,
      )}
      aria-hidden
    />
  );
}