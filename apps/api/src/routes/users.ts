import { api, type Id } from "@envkit/db";
import { vValidator } from "@hono/valibot-validator";
import { Hono } from "hono";
import trySafely from "trysafely";
import * as v from "valibot";
import { client } from "../index.js";

const users = new Hono()

  // POST /create
  .post(
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
  )

  // GET /:userId
  .get(
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
  )

  // POST /upgrade
  .post(
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
  )

  // DELETE /remove
  .delete(
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
  )

  // GET /:userId/share-tokens
  .get(
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
  )

  // GET /:userId/devices
  .get(
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
  )

  // GET /:userId/cli-sessions
  .get(
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
  )

  // GET /:userId/personal-team
  .get(
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
  )

  // GET /:userId/owned-teams
  .get(
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
  )

  // GET /:userId/owned-projects
  .get(
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
  )

  // GET /:userId/member-teams
  .get(
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
  )

  // GET /:userId/member-projects
  .get(
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
  )

  // GET /:userId/owned-devices
  .get(
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
