"use client";

// Shared scroll and entrance animations (GSAP + ScrollTrigger + SplitText).
// Every effect leaves content visible if JavaScript or animation is unavailable,
// and collapses to the final state under prefers-reduced-motion.

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Heading whose lines rise out of a mask as it enters the viewport (or on load with `immediate`). */
export function SplitReveal({
  as: Tag = "h2",
  children,
  className,
  immediate = false,
  delay = 0,
  stagger = 0.09,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  immediate?: boolean;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { lang } = useLang();
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      const split = SplitText.create(ref.current, { type: "lines,words", mask: "lines", linesClass: "split-line", autoSplit: true });
      gsap.from(split.words, {
        yPercent: 115,
        rotate: 3,
        duration: 1.1,
        ease: "expo.out",
        stagger: { each: stagger * 0.35, from: "start" },
        delay,
        scrollTrigger: immediate ? undefined : { trigger: ref.current, start: "top 88%", once: true },
      });
      return () => split.revert();
    },
    { dependencies: [lang], revertOnUpdate: true },
  );
  // Remount on language change: SplitText rewrites the DOM, so React must not patch it in place.
  return (
    <Tag key={lang} ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Fades and lifts its children when scrolled into view. */
export function Reveal({ children, className, delay = 0, y = 40, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; y?: number; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (!ref.current || reduced()) return;
    gsap.from(ref.current, { y, opacity: 0, duration: 1.1, ease: "expo.out", delay, scrollTrigger: { trigger: ref.current, start: "top 90%", once: true } });
  }, []);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Staggers the direct children of a container into view. */
export function Stagger({ children, className, each = 0.08 }: { children: ReactNode; className?: string; each?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current || reduced()) return;
    gsap.from(ref.current.children, { y: 50, opacity: 0, duration: 1, ease: "expo.out", stagger: each, scrollTrigger: { trigger: ref.current, start: "top 85%", once: true } });
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Counts a number up when it scrolls into view. `format` renders the intermediate values. */
export function CountUp({ value, format, className }: { value: number; format: (v: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (reduced()) {
        el.textContent = format(value);
        return;
      }
      const o = { v: 0 };
      gsap.to(o, {
        v: value,
        duration: 2.2,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
        onUpdate: () => {
          el.textContent = format(o.v);
        },
      });
    },
    { dependencies: [value], revertOnUpdate: true },
  );
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

/** Moves its child vertically against the scroll (speed in % of its own height). */
export function Parallax({ children, className, speed = 12 }: { children: ReactNode; className?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current || reduced()) return;
    gsap.fromTo(ref.current, { yPercent: -speed / 2 }, { yPercent: speed / 2, ease: "none", scrollTrigger: { trigger: ref.current.parentElement ?? ref.current, start: "top bottom", end: "bottom top", scrub: true } });
  }, []);
  return (
    <div ref={ref} className={cx("will-change-transform", className)}>
      {children}
    </div>
  );
}

/** Pulls an element toward the pointer (desktop only). */
export function Magnetic({ children, className, strength = 0.3 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || reduced() || window.matchMedia("(hover: none)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div ref={ref} className={cx("inline-block", className)}>
      {children}
    </div>
  );
}
