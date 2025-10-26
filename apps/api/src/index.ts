import { serve } from "@hono/node-server";
import { ConvexHttpClient } from "convex/browser";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { env } from "./env.js";
import cli from "./routes/cli.js";
import devices from "./routes/devices.js";
import projects from "./routes/projects.js";
import teams from "./routes/teams.js";
import tokens from "./routes/tokens.js";
import users from "./routes/users.js";

export const client = new ConvexHttpClient(env.CONVEX_URL);
const app = new Hono().basePath("/api/v1");
env.CLIENT_NODE_ENV === "development" && app.use(logger());

const routes = app
  .route("/projects", projects)
  .route("/users", users)
  .route("/tokens", tokens)
  .route("/teams", teams)
  .route("/devices", devices)
  .route("/cli", cli);

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
