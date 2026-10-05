"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered reveal.
 *
 * Every animated surface on the site goes through this so timing and easing
 * stay consistent, and `prefers-reduced-motion` is honoured in one place.
 */

type Direction = "up" | "down" | "left" | "right" | "none";

const offset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 26 },
  down: { x: 0, y: -26 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
  none: { x: 0, y: 0 },
};

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.65,
  direction = "up",
  /** Fraction of the element that must be visible before it animates. */
  amount = 0.25,
  once = true,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: Direction;
  amount?: number;
  once?: boolean;
  as?: "div" | "section" | "li" | "span" | "article";
}) {
  const reduce = useReducedMotion();
  const { x, y } = offset[direction];
  const MotionTag = motion[as];

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, x, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Staggered container — children using `RevealItem` cascade in sequence.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: "div" | "ul" | "section";
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const MotionTag = motion[as];

  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className,
  direction = "up",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  as?: "div" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const { x, y } = offset[direction];

  if (reduce) return <div className={className}>{children}</div>;

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, x, y, filter: "blur(5px)" },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Word-by-word masked headline — each word rises from behind an invisible
 * boundary, the way a hero headline should feel.
 *
 * Deliberately CSS-driven (see `.word-mask` in globals.css). A motion-driven
 * version has to wait for hydration plus an IntersectionObserver callback, and
 * because the hidden state is `translateY(112%)` the server paints the words
 * clipped — so the headline sat blank for a beat on every reload. A CSS
 * animation starts at first paint, so the reveal is immediate and identical.
 *
 * Per-word `delay` / `stagger` are handed to CSS as inline animation delays.
 */
export function SplitText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");

  return (
    <span className={cn("inline", className)}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="word-mask">
          <span
            className={cn("word-mask__word", wordClassName)}
            style={{ animationDelay: `${delay + i * stagger}s` }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </span>
  );
}