"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/** Page transition: an ink curtain lifts off every new page while the content rises in. */
export default function Template({ children }: { children: React.ReactNode }) {
  const curtain = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(curtain.current, { display: "none" });
      return;
    }
    gsap
      .timeline()
      .set(curtain.current, { yPercent: 0, display: "block" })
      .to(curtain.current, { yPercent: -100, duration: 0.9, ease: "expo.inOut", delay: 0.05 })
      .from(page.current, { y: 40, opacity: 0, duration: 0.9, ease: "expo.out", clearProps: "transform,opacity" }, "-=0.45")
      .set(curtain.current, { display: "none" });
  }, []);

  return (
    <>
      <div ref={curtain} aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden bg-ink" />
      <div ref={page}>{children}</div>
    </>
  );
}
