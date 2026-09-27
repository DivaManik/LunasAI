# Prompt Lanjutan untuk Frontend Team (V2 Upgrade)

> Copy-paste prompt di bawah ini ke terminal Frontend Team yang sudah ada, atau buka terminal baru.

---

```
Ini adalah lanjutan pekerjaan Frontend Team untuk proyek AgentPay.

Dashboard V1 sudah selesai dengan wagmi + MetaMask. Sekarang kamu harus
mengganti wagmi dengan Privy (embedded wallet) dan menambah halaman
OAuth consent untuk MCP server.

Baca jobdesk lengkap V2 di: E:\Hackaton\BNB\docs\agents\08-privy-team.md

Sebelum mulai, baca file-file ini untuk refresh konteks:
1. E:\Hackaton\BNB\agentpay\packages\dashboard\app\layout.tsx
2. E:\Hackaton\BNB\agentpay\packages\dashboard\app\page.tsx
3. E:\Hackaton\BNB\agentpay\packages\dashboard\components\CreateCardForm.tsx
4. E:\Hackaton\BNB\agentpay\packages\dashboard\components\SignMessage.tsx
5. E:\Hackaton\BNB\agentpay\packages\dashboard\.env.local

Tugasmu sekarang:
1. Install @privy-io/react-auth di packages/dashboard
2. Buat lib/privy.ts — konfigurasi Privy untuk BNB Testnet (chain ID 97)
3. Update app/layout.tsx — ganti WagmiProvider dengan PrivyProvider
4. Buat components/LoginButton.tsx — tombol login baru pakai Privy
5. Update components/CreateCardForm.tsx — ganti useWriteContract wagmi dengan Privy + viem walletClient
6. Update components/SignMessage.tsx — ganti useSignMessage wagmi dengan Privy walletClient.signMessage
7. Buat app/oauth/authorize/page.tsx — halaman consent untuk MCP OAuth flow
8. Tambah ke packages/dashboard/.env.local:
   NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxx
   (ganti dengan App ID nyata jika sudah punya, pakai placeholder jika belum)
9. Test di browser: login Google, buat card, sign message, buka /oauth/authorize?session=test&cardId=1
10. Buat laporan: docs/agents/reports/04-frontend-team-report-v2-privy.md

Skills yang bisa kamu pakai:
- superpowers:executing-plans — untuk jalankan task satu per satu
- superpowers:systematic-debugging — jika ada hydration error, Privy modal tidak muncul, atau wagmi conflict
- context7 (mcp__plugin_context7_context7__resolve-library-id + query-docs) — untuk cek docs @privy-io/react-auth terbaru

Aturan:
- Jangan hapus file yang sudah ada, hanya update
- Jangan ubah packages lain (backend, bot, shop, contracts)
- Semua component yang pakai Privy hooks wajib "use client"
- Jika NEXT_PUBLIC_PRIVY_APP_ID belum ada nilai nyata, catat di laporan

Working directory: E:\Hackaton\BNB
```
