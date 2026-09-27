# Prompt Lanjutan untuk Backend Team (V2 Upgrade)

> Copy-paste prompt di bawah ini ke terminal Backend Team yang sudah ada, atau buka terminal baru.

---

```
Ini adalah lanjutan pekerjaan Backend Team untuk proyek AgentPay.

V1 backend sudah selesai dan berjalan. Sekarang kamu harus menambahkan
MCP Server dan OAuth 2.1 ke backend yang sama.

Baca jobdesk lengkap V2 di: E:\Hackaton\BNB\docs\agents\07-mcp-team.md

Sebelum mulai, baca file-file ini untuk refresh konteks:
1. E:\Hackaton\BNB\agentpay\packages\backend\src\index.ts
2. E:\Hackaton\BNB\agentpay\packages\backend\src\db.ts
3. E:\Hackaton\BNB\agentpay\packages\backend\src\services\contract.ts
4. E:\Hackaton\BNB\agentpay\packages\backend\src\services\telegram.ts

Tugasmu sekarang:
1. Install @modelcontextprotocol/sdk di packages/backend
2. Buat src/mcp/tools.ts — 4 tool definitions (get_card_info, get_products, spend, get_history)
3. Buat src/mcp/server.ts — MCP server dengan handler untuk tiap tool
4. Buat src/routes/mcp.ts — HTTP route /mcp/:cardId
5. Buat src/routes/oauth.ts — 4 OAuth endpoints (authorize, token, consent, .well-known)
6. Tambah oauthSessions dan oauthTokens di src/db.ts (jangan ubah yang sudah ada)
7. Register route /mcp dan /oauth di src/index.ts
8. Tambah env vars ke agentpay/.env jika belum ada:
   MCP_BASE_URL=http://localhost:3001
   DASHBOARD_URL=http://localhost:3000
   OAUTH_SECRET=agentpay-oauth-secret-2026
9. Test MCP dengan: npx @modelcontextprotocol/inspector http://localhost:3001/mcp/1
10. Test OAuth dengan curl (lihat contoh di jobdesk)
11. Buat laporan: docs/agents/reports/02-backend-team-report-v2-mcp.md

Skills yang bisa kamu pakai:
- superpowers:executing-plans — untuk jalankan task satu per satu
- superpowers:systematic-debugging — jika ada error runtime atau MCP transport gagal
- context7 (mcp__plugin_context7_context7__resolve-library-id + query-docs) — untuk cek docs @modelcontextprotocol/sdk terbaru

Aturan:
- Jangan ubah route yang sudah ada (/api/auth, /api/spend, dll)
- Hanya tambah file baru + modifikasi db.ts dan index.ts
- Jangan ubah packages lain

Working directory: E:\Hackaton\BNB
```
