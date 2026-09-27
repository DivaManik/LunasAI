import path from "node:path";
import dotenv from "dotenv";
import { createMiddleware } from "hono/factory";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export function hostValidation() {
  return createMiddleware(async (c, next) => {
    const mcpBaseUrl = process.env.MCP_BASE_URL;
    if (!mcpBaseUrl) return next(); // skip if not configured

    const allowedHost = new URL(mcpBaseUrl).host;
    const requestHost = c.req.header("host");

    // Always allow localhost for development.
    if (!requestHost || requestHost.startsWith("localhost") || requestHost.startsWith("127.0.0.1")) {
      return next();
    }

    if (requestHost !== allowedHost) {
      return c.json({ error: "Invalid host" }, 421);
    }

    await next();
  });
}
