import { api, type Id } from "@envkit/db";
import { vValidator } from "@hono/valibot-validator";
import { Hono } from "hono";
import trySafely from "trysafely";
import * as v from "valibot";
import { client } from "../index.js";

export const teams = new Hono()

  // POST /teams/create
  .post(
    "/create",
    vValidator(
      "json",
      v.object({
        name: v.string(),
        ownerId: v.string(),
        maxMembers: v.number(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data: team, err } = await trySafely(() =>
        client.mutation(api.teams.create, {
          name: args.name,
          ownerId: args.ownerId as Id<"users">,
          maxMembers: args.maxMembers,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ team }, 200);
    }
  )

  // POST /teams/create-personal
  .post(
    "/create-personal",
    vValidator(
      "json",
      v.object({
        ownerId: v.string(),
        authName: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data: team, err } = await trySafely(() =>
        client.mutation(api.teams.createPersonal, {
          ownerId: args.ownerId as Id<"users">,
          authName: args.authName,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ team }, 200);
    }
  )

  // GET /teams/:teamId
  .get(
    "/:teamId",
    vValidator("param", v.object({ teamId: v.string() })),
    async (c) => {
      const args = c.req.valid("param");
      const { data: team, err } = await trySafely(() =>
        client.query(api.teams.get, { teamId: args.teamId as Id<"teams"> })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ team }, 200);
    }
  )

  // GET /teams/:teamId/with-projects/:callerId
  .get(
    "/:teamId/with-projects/:callerId",
    vValidator("param", v.object({ teamId: v.string(), callerId: v.string() })),
    async (c) => {
      const args = c.req.valid("param");
      const { data, err } = await trySafely(() =>
        client.query(api.teams.getTeamAndProjects, {
          teamId: args.teamId as Id<"teams">,
          callerId: args.callerId as Id<"users">,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ team: data.team, projects: data.projects }, 200);
    }
  )

  // GET /teams/deleted/:userId
  .get(
    "/deleted/:userId",
    vValidator("param", v.object({ userId: v.string() })),
    async (c) => {
      const args = c.req.valid("param");
      const { data: teamsList, err } = await trySafely(() =>
        client.query(api.teams.getDeleted, {
          userId: args.userId as Id<"users">,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ teams: teamsList }, 200);
    }
  )

  // PATCH /teams/update
  .patch(
    "/update",
    vValidator(
      "json",
      v.object({
        id: v.string(),
        callerId: v.string(),
        name: v.optional(v.string()),
        maxMembers: v.optional(v.number()),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.teams.update, {
          id: args.id as Id<"teams">,
          callerId: args.callerId as Id<"users">,
          name: args.name,
          maxMembers: args.maxMembers,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ updatedTeam: data.updatedTeam }, 200);
    }
  )

  // DELETE /teams/remove
  .delete(
    "/remove",
    vValidator(
      "json",
      v.object({
        id: v.string(),
        callerId: v.string(),
        purge: v.boolean(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.teams.remove, {
          id: args.id as Id<"teams">,
          callerId: args.callerId as Id<"users">,
          purge: args.purge,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ result: data }, 200);
    }
  )

  // POST /teams/invite
  .post(
    "/invite",
    vValidator(
      "json",
      v.object({
        teamId: v.string(),
        callerId: v.string(),
        role: v.picklist(["admin", "member", "viewer"]),
        allowedProjects: v.array(v.string()),
        email: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.teams.invite, {
          teamId: args.teamId as Id<"teams">,
          callerId: args.callerId as Id<"users">,
          role: args.role,
          allowedProjects: args.allowedProjects as Id<"projects">[],
          email: args.email,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ invitationCode: data.invitationCode }, 200);
    }
  )

  // POST /teams/accept-invite
  .post(
    "/accept-invite",
    vValidator(
      "json",
      v.object({
        invitationCode: v.string(),
        email: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.teams.acceptInvitation, args)
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ team: data.team }, 200);
    }
  )

  // DELETE /teams/remove-member
  .delete(
    "/remove-member",
    vValidator(
      "json",
      v.object({
        memberId: v.string(),
        callerId: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.teams.removeMember, {
          memberId: args.memberId as Id<"teamMembers">,
          callerId: args.callerId as Id<"users">,
        })
      );
      if (err) return c.json({ error: err.message }, 500);
      return c.json({ team: data.team }, 200);
    }
  );

export default teams;
