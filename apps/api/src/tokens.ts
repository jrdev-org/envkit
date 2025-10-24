import { Hono } from "hono";
import * as v from "valibot";
import { vValidator } from "@hono/valibot-validator";
import { api, Id } from "@envkit/db";
import trySafely from "trysafely";
import { client } from "./index.js";

export const shareTokens = new Hono();

// POST /share-tokens/create
shareTokens.post(
  "/create",
  vValidator(
    "json",
    v.object({
      creatorId: v.string(),
      projectId: v.string(),
      tokenHash: v.string(),
      stage: v.union([
        v.literal("development"),
        v.literal("production"),
        v.literal("staging"),
      ]),
      allowLink: v.boolean(),
      expiresAt: v.number(),
      singleUse: v.boolean(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.tokens.create, {
        creatorId: args.creatorId as Id<"users">,
        projectId: args.projectId as Id<"projects">,
        tokenHash: args.tokenHash,
        stage: args.stage,
        allowLink: args.allowLink,
        expiresAt: args.expiresAt,
        singleUse: args.singleUse,
      })
    );
    if (err) return c.json({ error: err.message }, 500);
    return c.json({ result: data }, 200);
  }
);

// POST /share-tokens/retrieve
shareTokens.post(
  "/retrieve",
  vValidator(
    "json",
    v.object({
      callerId: v.string(),
      tokenHash: v.string(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.tokens.retrieve, {
        callerId: args.callerId as Id<"users">,
        tokenHash: args.tokenHash,
      })
    );
    if (err) return c.json({ error: err.message }, 500);
    return c.json(
      { variables: data.variables, allowLink: data.allowLink },
      200
    );
  }
);

// PATCH /share-tokens/update
shareTokens.patch(
  "/update",
  vValidator(
    "json",
    v.object({
      callerId: v.string(),
      tokenHash: v.string(),
      allowLink: v.boolean(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.tokens.update, {
        callerId: args.callerId as Id<"users">,
        tokenHash: args.tokenHash,
        allowLink: args.allowLink,
      })
    );
    if (err) return c.json({ error: err.message }, 500);
    return c.json({ result: data }, 200);
  }
);

// DELETE /share-tokens/revoke
shareTokens.delete(
  "/revoke",
  vValidator(
    "json",
    v.object({
      callerId: v.string(),
      tokenHash: v.string(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.tokens.revoke, {
        callerId: args.callerId as Id<"users">,
        tokenHash: args.tokenHash,
      })
    );
    if (err) return c.json({ error: err.message }, 500);
    return c.json({ result: data }, 200);
  }
);

export default shareTokens;
