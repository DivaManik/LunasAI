import path from "node:path";
import dotenv from "dotenv";
import crypto from "node:crypto";
import { Hono } from "hono";
import { oauthSessions, oauthTokens, type OAuthSession } from "../db";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const MCP_BASE_URL = process.env.MCP_BASE_URL || "http://localhost:3001";
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";

const SESSION_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_SECONDS = 24 * 60 * 60;

const oauth = new Hono();

oauth.get("/.well-known/oauth-authorization-server", (c) => {
  return c.json({
    issuer: MCP_BASE_URL,
    authorization_endpoint: `${MCP_BASE_URL}/oauth/authorize`,
    token_endpoint: `${MCP_BASE_URL}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
  });
});

oauth.get("/oauth/authorize", (c) => {
  const clientId = c.req.query("client_id");
  const redirectUri = c.req.query("redirect_uri");
  const state = c.req.query("state");
  const codeChallenge = c.req.query("code_challenge");

  if (!clientId || !redirectUri || !state) {
    return c.json({ error: "Missing required query params: client_id, redirect_uri, state" }, 400);
  }

  const sessionId = crypto.randomBytes(16).toString("hex");
  oauthSessions.set(sessionId, {
    cardId: clientId,
    redirectUri,
    state,
    codeChallenge,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  const dashboardUrl = new URL(`${DASHBOARD_URL}/oauth/authorize`);
  dashboardUrl.searchParams.set("session", sessionId);
  dashboardUrl.searchParams.set("cardId", clientId);

  return c.redirect(dashboardUrl.toString());
});

oauth.post("/oauth/consent", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  const { sessionId, approved } = body;
  if (!sessionId) return c.json({ error: "Missing required field: sessionId" }, 400);

  const session = oauthSessions.get(sessionId);
  if (!session) return c.json({ error: "Session not found or expired" }, 400);
  if (Date.now() > session.expiresAt) {
    oauthSessions.delete(sessionId);
    return c.json({ error: "Session expired" }, 400);
  }

  if (!approved) {
    const denyUrl = new URL(session.redirectUri);
    denyUrl.searchParams.set("error", "access_denied");
    denyUrl.searchParams.set("state", session.state);
    oauthSessions.delete(sessionId);
    return c.json({ redirectTo: denyUrl.toString() });
  }

  const code = crypto.randomBytes(16).toString("hex");
  session.code = code;
  oauthSessions.set(sessionId, session);

  const successUrl = new URL(session.redirectUri);
  successUrl.searchParams.set("code", code);
  successUrl.searchParams.set("state", session.state);

  return c.json({ redirectTo: successUrl.toString() });
});

oauth.post("/oauth/token", async (c) => {
  const contentType = c.req.header("content-type") || "";
  let code: string | undefined;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formBody = await c.req.parseBody();
    code = typeof formBody.code === "string" ? formBody.code : undefined;
  } else {
    const body = await c.req.json().catch(() => null);
    code = body?.code;
  }

  if (!code) return c.json({ error: "Missing required field: code" }, 400);

  let matchedSessionId: string | undefined;
  let matchedSession: OAuthSession | undefined;
  for (const [sessionId, session] of oauthSessions.entries()) {
    if (session.code === code) {
      matchedSessionId = sessionId;
      matchedSession = session;
      break;
    }
  }

  if (!matchedSession || !matchedSessionId) {
    return c.json({ error: "invalid_grant" }, 400);
  }
  if (Date.now() > matchedSession.expiresAt) {
    oauthSessions.delete(matchedSessionId);
    return c.json({ error: "invalid_grant" }, 400);
  }

  const accessToken = crypto.randomBytes(32).toString("hex");
  oauthTokens.set(accessToken, {
    cardId: matchedSession.cardId,
    accessToken,
    expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
  });

  oauthSessions.delete(matchedSessionId);

  return c.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
  });
});

export default oauth;
