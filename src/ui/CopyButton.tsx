import { useState } from "preact/hooks";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <button
      type="button"
      class="copy-btn"
      title="Copy address"
      aria-label="Copy address"
      onClick={onClick}
    >
      {copied ? "✓" : "⧉"}
    </button>
  );
}
