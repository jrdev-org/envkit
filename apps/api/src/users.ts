import { vValidator } from "@hono/valibot-validator";
import { Hono } from "hono";
import * as v from "valibot";
import { client } from "./index.js";
import { api } from "@envkit/db";
import { Id } from "@envkit/db";
import trySafely from "trysafely";

const users = new Hono();

// POST /create
users.post(
  "/create",
  vValidator(
    "json",
    v.object({
      email: v.pipe(v.string(), v.rfcEmail("Invalid email address format.")),
      tier: v.picklist(["free", "pro"]),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.users.create, args)
    );
    if (err) {
      console.error(err);
      if (err.message.includes("not found"))
        return c.json({ error: "User not found" }, 404);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ user: data }, 201);
  }
);

// GET /:userId
users.get(
  "/:userId",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const userId = args.userId as Id<"users">;
    const { data, err } = await trySafely(() =>
      client.query(api.users.get, { userId })
    );
    if (err) {
      console.error(err);
      if (err.message.includes("not found"))
        return c.json({ error: "User not found" }, 404);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ user: data }, 200);
  }
);

// POST /upgrade
users.post(
  "/upgrade",
  vValidator(
    "json",
    v.object({
      email: v.pipe(v.string(), v.rfcEmail("Invalid email address format.")),
    })
  ),
  async (c) => {
    const { email } = c.req.valid("json");
    const { data: user, err } = await trySafely(() =>
      client.mutation(api.users.upgrade, { email })
    );
    if (err) {
      console.error(err);
      if (err.message.includes("not found"))
        return c.json({ error: "User not found" }, 404);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ user }, 200);
  }
);

// DELETE /remove
users.delete(
  "/remove",
  vValidator(
    "json",
    v.object({
      userId: v.string(),
      purge: v.boolean(),
    })
  ),
  async (c) => {
    const args = c.req.valid("json");
    const { data, err } = await trySafely(() =>
      client.mutation(api.users.remove, {
        userId: args.userId as Id<"users">,
        purge: args.purge,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ result: data }, 200);
  }
);

// GET /:userId/share-tokens
users.get(
  "/:userId/share-tokens",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data, err } = await trySafely(() =>
      client.query(api.users.getShareTokens, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ shareTokens: data }, 200);
  }
);

// GET /:userId/devices
users.get(
  "/:userId/devices",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: devices, err } = await trySafely(() =>
      client.query(api.users.getDevices, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ devices }, 200);
  }
);

// GET /:userId/cli-sessions
users.get(
  "/:userId/cli-sessions",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: sessions, err } = await trySafely(() =>
      client.query(api.users.getCliSessions, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ sessions }, 200);
  }
);

// GET /:userId/personal-team
users.get(
  "/:userId/personal-team",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: team, err } = await trySafely(() =>
      client.query(api.users.getPersonalTeam, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }

    return c.json({ team }, 200);
  }
);

// GET /:userId/owned-teams
users.get(
  "/:userId/owned-teams",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: teams, err } = await trySafely(() =>
      client.query(api.users.getOwnedTeams, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ teams }, 200);
  }
);

// GET /:userId/owned-projects
users.get(
  "/:userId/owned-projects",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: projects, err } = await trySafely(() =>
      client.query(api.users.getOwnedProjects, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ projects }, 200);
  }
);

// GET /:userId/member-teams
users.get(
  "/:userId/member-teams",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: teams, err } = await trySafely(() =>
      client.query(api.users.getMemberTeams, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ teams }, 200);
  }
);

// GET /:userId/member-projects
users.get(
  "/:userId/member-projects",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: projects, err } = await trySafely(() =>
      client.query(api.users.getMemberProjects, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ projects }, 200);
  }
);

// GET /:userId/owned-devices
users.get(
  "/:userId/owned-devices",
  vValidator("param", v.object({ userId: v.string() })),
  async (c) => {
    const args = c.req.valid("param");
    const { data: devices, err } = await trySafely(() =>
      client.query(api.users.getOwnedDevices, {
        userId: args.userId as Id<"users">,
      })
    );
    if (err) {
      console.error(err);
      return c.json({ error: err.message }, 500);
    }
    return c.json({ devices }, 200);
  }
);

export default users;
