import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import users from "./users.js";
import projects from "./projects.js";
import tokens from "./tokens.js";
import devices from "./devices.js";
import cli from "./cli.js";
import { ConvexHttpClient } from "convex/browser";
import { env } from "./env.js";

export const client = new ConvexHttpClient(env.CONVEX_URL);
const app = new Hono();
app.use(logger());

const routes = app
  .route("/api/v1/users", users)
  .route("/api/v1/projects", projects)
  .route("/api/v1/tokens", tokens)
  .route("/api/v1/devices", devices)
  .route("/api/v1/cli", cli);

// Start the server once
const server = serve({
  port: Number(env.PORT),
  fetch: app.fetch,
});

// graceful shutdown
process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});

export type AppType = typeof routes;
export default app;
