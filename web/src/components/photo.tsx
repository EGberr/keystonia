"use client";

import Image from "next/image";
import { useState } from "react";
import { cx } from "@/lib/format";

/** Local, openly licensed photo with a graceful gradient fallback while assets are missing. */
export function Photo({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority,
  rounded = "rounded-2xl",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx("relative overflow-hidden bg-surface-2", rounded, className)}>
      {failed ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent-soft),transparent_60%),linear-gradient(135deg,var(--surface-2),var(--surface-3))]" />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      )}
    </div>
  );
}
