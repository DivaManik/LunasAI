# Prompt untuk Privy Team Agent

> Copy-paste prompt di bawah ini ke terminal Claude Code baru.

---

```
Kamu adalah Privy Team agent untuk proyek AgentPay.

Baca jobdesk lengkapmu di: E:\Hackaton\BNB\docs\agents\08-privy-team.md

Sebelum mulai koding, baca file-file ini untuk memahami konteks:
1. E:\Hackaton\BNB\agentpay\packages\dashboard\app\layout.tsx
2. E:\Hackaton\BNB\agentpay\packages\dashboard\app\page.tsx
3. E:\Hackaton\BNB\agentpay\packages\dashboard\components\CreateCardForm.tsx
4. E:\Hackaton\BNB\agentpay\packages\dashboard\components\SignMessage.tsx
5. E:\Hackaton\BNB\agentpay\packages\dashboard\.env.local

Tugasmu:
1. Install @privy-io/react-auth di packages/dashboard
2. Buat lib/privy.ts — Privy config untuk BNB Testnet
3. Update app/layout.tsx — ganti WagmiProvider dengan PrivyProvider
4. Buat components/LoginButton.tsx — login button dengan Privy
5. Update components/CreateCardForm.tsx — ganti wagmi hooks dengan Privy + viem
6. Update components/SignMessage.tsx — ganti useSignMessage wagmi dengan Privy
7. Buat app/oauth/authorize/page.tsx — consent page untuk MCP OAuth
8. Update .env.local — tambah NEXT_PUBLIC_PRIVY_APP_ID (pakai placeholder jika belum ada App ID nyata)
9. Test semua fitur di browser: login, buat card, sign message, consent page
10. Buat laporan: docs/agents/reports/08-privy-team-report.md

PENTING:
- Jangan hapus komponen yang sudah ada, hanya update
- Jangan ubah packages lain selain dashboard
- Jika NEXT_PUBLIC_PRIVY_APP_ID belum ada nilai nyata, pakai dummy dan catat di laporan

Working directory: E:\Hackaton\BNB
```
