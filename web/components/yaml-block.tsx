"use client";

import * as React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language = "yaml",
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <pre
        className={cn(
          "rounded-md border border-[var(--border)] bg-[var(--muted)] p-4 text-xs font-mono overflow-x-auto",
          className
        )}
      >
        {code}
      </pre>
    );
  }
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--border)] overflow-hidden text-xs",
        className
      )}
    >
      <SyntaxHighlighter
        language={language}
        style={resolvedTheme === "dark" ? vscDarkPlus : oneLight}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.75rem",
          lineHeight: 1.6,
        }}
        codeTagProps={{ style: { fontFamily: "var(--font-geist-mono)" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
