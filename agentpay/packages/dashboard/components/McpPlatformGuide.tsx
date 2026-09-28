"use client";

import { useEffect, useState, type ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";

const TABS = ["claude", "cursor", "windsurf", "vscode"] as const;
type Tab = (typeof TABS)[number];

const STORAGE_KEY = "mcp-platform-tab";

function isTab(value: string | null): value is Tab {
  return !!value && (TABS as readonly string[]).includes(value);
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mono overflow-x-auto rounded-lg border border-line bg-surface p-3 text-[11px] leading-[1.6] text-ink">
      {children}
    </pre>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="mono rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] text-brand">
      {children}
    </code>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(217,119,6,0.1)] text-xs font-semibold text-brand">
        {n}
      </span>
      <div className="flex-1 pt-0.5">{children}</div>
    </li>
  );
}

function ClaudeGuide({ lang, url }: { lang: Lang; url: string }) {
  const p = t.dashboard.mcpPage;
  const config = `{
  "mcpServers": {
    "lunasai": {
      "url": "${url}",
      "type": "sse"
    }
  }
}`;
  return (
    <ol className="flex flex-col gap-3 text-sm text-muted">
      <Step n={1}>{p.claudeStep1[lang]}</Step>
      <Step n={2}>{p.claudeStep2[lang]}</Step>
      <Step n={3}>
        <div className="flex flex-col gap-2">
          <span>
            {p.claudeStep3[lang]} <InlineCode>claude_desktop_config.json</InlineCode>
          </span>
          <CodeBlock>{config}</CodeBlock>
        </div>
      </Step>
      <Step n={4}>{p.claudeStep4[lang]}</Step>
      <Step n={5}>{p.claudeStep5[lang]}</Step>
    </ol>
  );
}

function CursorGuide({ lang, url }: { lang: Lang; url: string }) {
  const p = t.dashboard.mcpPage;
  return (
    <ol className="flex flex-col gap-3 text-sm text-muted">
      <Step n={1}>{p.cursorStep1[lang]}</Step>
      <Step n={2}>{p.cursorStep2[lang]}</Step>
      <Step n={3}>{p.cursorStep3[lang]}</Step>
      <Step n={4}>
        <div className="flex flex-col gap-1.5">
          <span>{p.cursorStep4[lang]}</span>
          <ul className="mono flex flex-col gap-1 text-[12px] text-ink">
            <li>{p.cursorStep4Name[lang]}</li>
            <li>{p.cursorStep4Type[lang]}</li>
            <li>
              {p.cursorStep4Url[lang]} <InlineCode>{url}</InlineCode>
            </li>
          </ul>
        </div>
      </Step>
      <Step n={5}>{p.cursorStep5[lang]}</Step>
    </ol>
  );
}

function WindsurfGuide({ lang, url }: { lang: Lang; url: string }) {
  const p = t.dashboard.mcpPage;
  return (
    <ol className="flex flex-col gap-3 text-sm text-muted">
      <Step n={1}>{p.windsurfStep1[lang]}</Step>
      <Step n={2}>{p.windsurfStep2[lang]}</Step>
      <Step n={3}>{p.windsurfStep3[lang]}</Step>
      <Step n={4}>
        <div className="flex flex-col gap-1.5">
          <span>{p.windsurfStep4[lang]}</span>
          <ul className="mono flex flex-col gap-1 text-[12px] text-ink">
            <li>{p.windsurfStep4Name[lang]}</li>
            <li>
              {p.windsurfStep4Url[lang]} <InlineCode>{url}</InlineCode>
            </li>
          </ul>
        </div>
      </Step>
      <Step n={5}>{p.windsurfStep5[lang]}</Step>
      <Step n={6}>{p.windsurfStep6[lang]}</Step>
    </ol>
  );
}

function VscodeGuide({ lang, url }: { lang: Lang; url: string }) {
  const p = t.dashboard.mcpPage;
  return (
    <ol className="flex flex-col gap-3 text-sm text-muted">
      <Step n={1}>{p.vscodeStep1[lang]}</Step>
      <Step n={2}>{p.vscodeStep2[lang]}</Step>
      <Step n={3}>{p.vscodeStep3[lang]}</Step>
      <Step n={4}>{p.vscodeStep4[lang]}</Step>
      <Step n={5}>
        {p.vscodeStep5[lang]} <InlineCode>{url}</InlineCode>
      </Step>
      <Step n={6}>{p.vscodeStep6[lang]}</Step>
      <li className="flex items-start gap-3 rounded-lg border border-[rgba(234,88,12,0.2)] bg-[rgba(234,88,12,0.06)] px-3 py-2.5 text-ember">
        <span className="pt-0.5 text-xs">{p.vscodeStep7[lang]}</span>
      </li>
    </ol>
  );
}

export function McpPlatformGuide({ mcpUrl }: { mcpUrl: string | null }) {
  const { lang } = useLangContext();
  const p = t.dashboard.mcpPage;
  const url = mcpUrl ?? "<MCP_URL>";

  const [tab, setTab] = useState<Tab>("claude");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isTab(stored)) setTab(stored);
    } catch {
      // ignore
    }
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  const TAB_LABELS: Record<Tab, string> = {
    claude: p.tabClaude[lang],
    cursor: p.tabCursor[lang],
    windsurf: p.tabWindsurf[lang],
    vscode: p.tabVscode[lang],
  };

  return (
    <section className="panel h-fit px-6 py-5">
      <h2 className="mb-4 font-display text-base font-semibold">{p.guideTitle[lang]}</h2>

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-line pb-4">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === key
                ? "border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.1)] text-brand"
                : "border-transparent text-muted hover:border-line hover:bg-white/[0.04] hover:text-ink"
            }`}
          >
            {TAB_LABELS[key]}
            {key === "vscode" && (
              <span className="text-[10px] text-ember">{p.experimental[lang]}</span>
            )}
          </button>
        ))}
      </div>

      {!mcpUrl && <p className="mb-3 text-xs text-dim">{p.urlPlaceholderNote[lang]}</p>}

      {tab === "claude" && <ClaudeGuide lang={lang} url={url} />}
      {tab === "cursor" && <CursorGuide lang={lang} url={url} />}
      {tab === "windsurf" && <WindsurfGuide lang={lang} url={url} />}
      {tab === "vscode" && <VscodeGuide lang={lang} url={url} />}
    </section>
  );
}
