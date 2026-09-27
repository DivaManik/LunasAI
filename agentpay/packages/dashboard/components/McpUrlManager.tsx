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
      <div className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 p-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="self-start rounded bg-yellow-400 px-3 py-1.5 text-sm font-bold text-black hover:bg-yellow-500 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate MCP URL"}
        </button>
        <p className="text-xs text-gray-500">
          ℹ️ Setelah generate, paste URL ke: Claude Web → Settings → Connectors →
          Add MCP Server
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-yellow-300 bg-yellow-50 p-4">
      <p className="text-sm font-bold text-yellow-800">
        🔑 MCP URL — Rahasia, jangan bagikan!
      </p>
      <p className="text-xs text-red-600">
        ⚠️ Simpan URL ini sekarang! Tidak bisa dilihat lagi setelah refresh.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs"
        />
        <button
          onClick={handleCopyUrl}
          className="shrink-0 rounded bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          {urlCopied ? "✓ Tersalin" : "Salin URL"}
        </button>
      </div>

      <div className="text-xs text-gray-600">
        <p className="font-medium">Cara pakai:</p>
        <ol className="list-inside list-decimal">
          <li>Buka claude.ai → Settings → Connectors → Add MCP Server</li>
          <li>Paste URL di atas</li>
          <li>Tanya Claude: &quot;cek info card saya&quot;</li>
        </ol>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleRevoke}
        disabled={isRevoking}
        className="self-start rounded bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
      >
        {isRevoking ? "Memproses..." : "Revoke & Generate Ulang"}
      </button>
    </div>
  );
}
