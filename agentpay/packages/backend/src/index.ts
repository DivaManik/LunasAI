import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import cards from "./routes/cards";
import spendRoutes from "./routes/spend";
import history from "./routes/history";
import auth from "./routes/auth";
import mcp from "./routes/mcp";
import oauth from "./routes/oauth";
import faucet from "./routes/faucet";

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/cards", cards);
app.route("/api/spend", spendRoutes);
app.route("/api/history", history);
app.route("/api/auth", auth);
app.route("/mcp", mcp);
app.route("/", oauth);
app.route("/", faucet);

const PORT = 3001;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[backend] AgentPay backend running on port ${PORT}`);
});
