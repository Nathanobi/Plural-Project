import { useState } from "react";
import { Check, Copy } from "lucide-react";
import "./CopyButton.css";

// Bouton "Copier" avec retour visuel de 1,5 s.
export default function CopyButton({ text, label = "Copier" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="copy-button" onClick={copy}>
      {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
      {copied ? "Copié" : label}
    </button>
  );
}