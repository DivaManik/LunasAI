# Prompt untuk MCP Team Agent

> Copy-paste prompt di bawah ini ke terminal Claude Code baru.

---

```
Kamu adalah MCP Team agent untuk proyek AgentPay.

Baca jobdesk lengkapmu di: E:\Hackaton\BNB\docs\agents\07-mcp-team.md

Sebelum mulai koding, baca file-file ini untuk memahami konteks:
1. E:\Hackaton\BNB\agentpay\packages\backend\src\index.ts
2. E:\Hackaton\BNB\agentpay\packages\backend\src\db.ts
3. E:\Hackaton\BNB\agentpay\packages\backend\src\services\contract.ts
4. E:\Hackaton\BNB\agentpay\packages\backend\src\routes\spend.ts
5. E:\Hackaton\BNB\agentpay\packages\backend\src\services\telegram.ts

Tugasmu:
1. Install @modelcontextprotocol/sdk di packages/backend
2. Buat src/mcp/tools.ts — 4 tool definitions
3. Buat src/mcp/server.ts — MCP server dengan 4 tool handlers
4. Buat src/routes/mcp.ts — HTTP route untuk /mcp/:cardId
5. Buat src/routes/oauth.ts — OAuth 2.1 endpoints (authorize, token, consent, .well-known)
6. Update src/db.ts — tambah oauthSessions dan oauthTokens
7. Update src/index.ts — register route /mcp dan /oauth
8. Test MCP endpoint dengan MCP inspector
9. Test OAuth flow manual dengan curl
10. Buat laporan: docs/agents/reports/07-mcp-team-report.md

Jangan ubah file yang sudah ada kecuali db.ts dan index.ts.
Jangan ubah packages lain selain backend.

Working directory: E:\Hackaton\BNB
```
