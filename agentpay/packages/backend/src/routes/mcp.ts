import { Hono } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "../mcp/server";
import { oauthTokens, cardSecretHashes, hashSecret } from "../db";
import { badCredRateLimit, cardRateLimit } from "../middleware/rateLimit";
import { hostValidation } from "../middleware/hostValidation";

const MAX_BODY_BYTES = 1024 * 1024; // 1MB

const mcp = new Hono();

mcp.use("/:secret", hostValidation());
mcp.use("/:secret", badCredRateLimit());

mcp.all("/:secret", async (c) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
    return c.json({ error: "Request too large" }, 413);
  }

  const secret = c.req.param("secret");

  // Lane A: per-card secret in the URL path — the secret itself encodes the
  // cardId indirectly via the cardSecretHashes lookup, so nothing else in the
  // URL is needed. Only the SHA-256 hash is ever stored/compared, never the
  // secret itself.
  let cardId = cardSecretHashes.get(hashSecret(secret));

  if (!cardId) {
    // Lane C: OAuth access token, scoped to a single cardId. Here the URL
    // segment isn't a valid per-card secret, so treat it as a Bearer token
    // request instead.
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.slice("Bearer ".length);
    const tokenData = oauthTokens.get(token);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      return c.json({ error: "Token invalid atau expired" }, 401);
    }

    cardId = tokenData.cardId;
  }

  if (cardRateLimit(cardId)) {
    return c.json({ error: "Too many requests for this card. Try again later." }, 429);
  }

  const server = createMcpServer(cardId);
  // Stateless mode: fresh Server + Transport per HTTP request. sessionIdGenerator
  // is intentionally omitted — a per-request Mcp-Session-Id would be meaningless
  // since the Server instance (and its "initialized" state) doesn't survive past
  // this handler, so a stateful session ID would break subsequent calls like
  // tools/list with "Server not initialized".
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

export default mcp;
