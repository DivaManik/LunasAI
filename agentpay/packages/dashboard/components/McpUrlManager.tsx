"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/constants";

function storageKey(cardId: string | number): string {
  return `mcp-url-${cardId}`;
}

function readStoredUrl(cardId: string | number): string | null {
  try {
    return localStorage.getItem(storageKey(cardId));
  } catch {
    return null;
  }
}

export function McpUrlManager({ cardId }: { cardId: string | number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(readStoredUrl(cardId));
  }, [cardId]);

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cards/${cardId}/register-mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { mcpUrl } = await res.json();

      try {
        localStorage.setItem(storageKey(cardId), mcpUrl);
      } catch {
        // localStorage bisa gagal di private mode — URL tetap ditampilkan dari state
      }
      setUrl(mcpUrl);
    } catch {
      setError("Gagal generate MCP URL. Coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRevoke() {
    setError(null);
    setIsRevoking(true);
    try {
      await fetch(`${BACKEND_URL}/api/cards/${cardId}/mcp-secret`, {
        method: "DELETE",
      });
      try {
        localStorage.removeItem(storageKey(cardId));
      } catch {
        // ignore
      }
      setUrl(null);
    } catch {
      setError("Gagal revoke MCP URL. Coba lagi.");
    } finally {
      setIsRevoking(false);
    }
  }

  async function handleCopyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  if (!url) {
    return (
      <div className="flex flex-col gap-2.5">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-small btn-small-amber self-start"
        >
          {isGenerating ? "Generating..." : "Generate MCP URL"}
        </button>
        <p className="text-xs text-muted">
          Setelah generate, paste URL ke: Claude Web → Settings → Connectors → Add MCP Server
        </p>
        {error && <p className="text-xs text-ember">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-gold">🔑 MCP URL — Rahasia, jangan bagikan!</p>
      <p className="text-xs text-ember">
        Simpan URL ini sekarang! Tidak bisa dilihat lagi setelah refresh.
      </p>

      <input
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="mono my-1 w-full rounded-lg border border-[rgba(217,119,6,0.12)] bg-[rgba(217,119,6,0.06)] px-3.5 py-2.5 text-xs text-brand focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={handleCopyUrl} className="btn-small btn-small-amber">
          {urlCopied ? "✓ Tersalin" : "Salin URL"}
        </button>
        <button onClick={handleRevoke} disabled={isRevoking} className="btn-small">
          {isRevoking ? "Memproses..." : "Revoke & Generate Ulang"}
        </button>
      </div>

      <div className="mt-1 text-xs text-muted">
        <p className="font-medium text-ink">Cara pakai:</p>
        <ol className="list-inside list-decimal">
          <li>Buka claude.ai → Settings → Connectors → Add MCP Server</li>
          <li>Paste URL di atas</li>
          <li>Tanya Claude: &quot;cek info card saya&quot;</li>
        </ol>
      </div>

      {error && <p className="text-xs text-ember">{error}</p>}
    </div>
  );
}
