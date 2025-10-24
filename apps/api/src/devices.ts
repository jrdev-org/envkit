import { Hono } from "hono";
import * as v from "valibot";
import { vValidator } from "@hono/valibot-validator";
import { api, Id } from "@envkit/db";
import trySafely from "trysafely";
import { client } from "./index.js";

export const devices = new Hono();

// POST /register
devices.post(
  "/register",
  vValidator(
    "json",
    v.object({
      ownerId: v.string(),
      deviceId: v.string(),
      deviceName: v.optional(v.string()),
      platform: v.string(),
      arch: v.string(),
      username: v.string(),
      nodeVersion: v.string(),
      cliVersion: v.string(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.devices.register, {
        ...args,
        ownerId: args.ownerId as Id<"users">,
      })
    );
    if (err) return c.json({ error: err.message });
    return c.json({ device: data });
  }
);

// POST /remove
devices.post(
  "/remove",
  vValidator(
    "json",
    v.object({
      id: v.string(),
      callerId: v.string(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.devices.remove, {
        id: args.id as Id<"devices">,
        callerId: args.callerId as Id<"users">,
      })
    );
    if (err) return c.json({ error: err.message });
    return c.json({ result: data }, 200);
  }
);

export default devices;
