import fs from "fs/promises";
import { CONFIG_DIR, TOKEN_FILE } from "@/constants.js";
import { log } from "./logger.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { dbApi, safeCall } from "@envkit/db";
import { Id } from "@envkit/db/env";

export interface AuthToken {
  token: string;
  userId: string;
  deviceId: string;
  sessionId: string;
  expiresAt: number;
  createdAt: number;
}

export async function requireAuthToken() {
  const token = await getStoredAuthToken();
  if (!token) {
    log.info("No auth token found, please login!");
    process.exit(0);
  }
  return token;
}

export async function getStoredAuthToken(): Promise<AuthToken | null> {
  try {
    const tokenData = await fs.readFile(TOKEN_FILE, "utf8");
    const parsed = JSON.parse(tokenData) as AuthToken;

    if (parsed.expiresAt < Date.now()) {
      await fs.unlink(TOKEN_FILE).catch(() => {});
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function storeAuthToken(authData: AuthToken): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(authData, null, 2));
  await fs.chmod(TOKEN_FILE, 0o600);
}

export async function clearAuthToken(): Promise<void> {
  try {
    await fs.unlink(TOKEN_FILE);
  } catch {}
}

export async function revokeSesion(sessionId: string) {
  const token = await getStoredAuthToken();
  if (!token) {
    return "NO_AUTH: No auth token found, please login!";
  }
  const res = await safeCall(
    async () =>
      await dbApi.cli.revokeSession(
        sessionId as unknown as Id<"cliSessions">,
        token.userId as unknown as Id<"users">
      )
  )();

  if ("error" in res) {
    return `ERR: ${res.error}`;
  }

  if (!res.success) {
    return "ERR: Failed to revoke session";
  }

  await clearAuthToken();

  return "OK: Session revoked";
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredAuthToken();
  return token !== null;
}

export interface AuthServerResult {
  userId: string;
  stop: () => void;
  userAgent: string | undefined;
}

/**
 * Start a temporary local auth server to receive the browser callback.
 * Returns a promise that resolves when the browser posts the auth payload.
 */
export async function startAuthServer(
  port: number,
  publicAppUrl: string
): Promise<AuthServerResult> {
  return new Promise((resolve, reject) => {
    const app = new Hono();
    app.use(
      "*",
      cors({
        origin: publicAppUrl,
        allowMethods: ["GET", "POST", "HEAD", "OPTIONS"],
        allowHeaders: ["Content-Type", "User-Agent"],
      })
    );

    let resolved = false;
    let serverShouldStop = false;

    app.get("/cancel", (c) => {
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          serverShouldStop = true;
          reject(new Error("Authentication cancelled"));
        }
      }, 2000);
      return c.json({ success: true }, { status: 200 });
    });

    app.get("/health", (c) => {
      return c.json({ success: true }, { status: 200 });
    });

    app.post("/auth/:userId", async (c) => {
      const userId = c.req.param("userId");
      const ua = c.req.header("User-Agent");

      if (!resolved) {
        resolved = true;
        serverShouldStop = true;
        resolve({
          userId,
          stop: () => {
            serverShouldStop = true;
            server.close();
          },
          userAgent: ua,
        });
      }
      return c.json({ success: true }, { status: 200 });
    });

    const server = serve({ fetch: app.fetch, port });

    // Timeout handler
    const timeoutId = setTimeout(
      () => {
        if (!resolved) {
          resolved = true;
          serverShouldStop = true;
          server.close();
          reject(new Error("Authentication timeout"));
        }
      },
      5 * 60 * 1000
    );

    // Keep server alive until explicitly stopped
    const keepAlive = async () => {
      while (!serverShouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      // Clean up timeout if server is stopping
      clearTimeout(timeoutId);
      // Give a small delay to ensure response is sent before closing
      setTimeout(() => {
        server.close();
      }, 100);
    };

    // Start the keep-alive loop
    keepAlive();
  });
}
