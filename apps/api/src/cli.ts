import { Hono } from "hono";
import * as v from "valibot";
import { vValidator } from "@hono/valibot-validator";
import { api, Id } from "@envkit/db";
import trySafely from "trysafely";
import { client } from "./index.js";

export const cli = new Hono();

// POST /init
cli.post(
  "/init",
  vValidator(
    "json",
    v.object({
      deviceId: v.string(),
      authTokenHash: v.string(),
      userAgent: v.optional(v.string()),
      expiresAt: v.number(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.cli.init, {
        ...args,
        deviceId: args.deviceId as Id<"devices">,
      })
    );
    if (err) return c.json({ error: err.message });
    return c.json({ result: data }, 200);
  }
);

// POST /authenticate
cli.post(
  "/authenticate",
  vValidator("json", v.object({ authTokenHash: v.string() })),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.cli.authenticate, args)
    );
    if (err) return c.json({ error: err.message });
    return c.json({ result: data }, 200);
  }
);

// POST /revoke
cli.post(
  "/revoke",
  vValidator("json", v.object({ authTokenHash: v.string() })),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.cli.revoke, args)
    );
    if (err) return c.json({ error: err.message });
    return c.json({ result: data }, 200);
  }
);

// POST /remove-revoked
cli.post(
  "/remove-revoked",
  vValidator("json", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.cli.removeRevoked, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) return c.json({ error: err.message });
    return c.json({ result: data }, 200);
  }
);

export default cli;
