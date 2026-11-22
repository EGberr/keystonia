"use client";

import { memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/lib/format";

const CITE_GROUP = /\[((?:[SD]\d+)(?:\s*[,;]\s*[SD]\d+)*)\]/g;

/** Turns [S1], [D2] and [S1, D2] into markdown links that render as citation chips. */
export function linkCitations(text: string) {
  return text.replace(CITE_GROUP, (_, ids: string) =>
    ids
      .split(/\s*[,;]\s*/)
      .map((id) => `[${id}](#cite-${id})`)
      .join(""),
  );
}

export function CitationChip({ id, active, onClick }: { id: string; active?: boolean; onClick?: (id: string) => void }) {
  const isData = id.startsWith("D");
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className={cx(
        "num mx-[1px] inline-flex -translate-y-[1px] items-center rounded-md border px-1.5 py-[1px] align-baseline text-[10.5px] font-medium leading-4 transition-colors",
        isData
          ? "border-transparent bg-accent text-[#141414] hover:brightness-95"
          : "border-line-strong bg-accent-soft text-accent-ink hover:border-accent-ink",
        active && "ring-2 ring-accent-ink/40",
      )}
      title={isData ? "Survey dataset" : "Research passage"}
    >
      {id}
    </button>
  );
}

export const Answer = memo(function Answer({
  text,
  streaming,
  activeCite,
  onCite,
}: {
  text: string;
  streaming?: boolean;
  activeCite?: string | null;
  onCite: (id: string) => void;
}) {
  return (
    <div className={cx("prose-answer", streaming && "caret")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }: { href?: string; children?: ReactNode }) => {
            if (href?.startsWith("#cite-")) {
              const id = href.slice(6);
              return <CitationChip id={id} active={activeCite === id} onClick={onCite} />;
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-2">
                {children}
              </a>
            );
          },
        }}
      >
        {linkCitations(text)}
      </ReactMarkdown>
    </div>
  );
});
