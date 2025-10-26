import { api } from "@envkit/db";
import { vValidator } from "@hono/valibot-validator";
import type { Id } from "convex/_generated/dataModel.js";
import { Hono } from "hono";
import trySafely from "trysafely";
import * as v from "valibot";
import { client } from "../index.js";

const projects = new Hono()
  // POST /create
  .post(
    "/create",
    vValidator(
      "json",
      v.object({
        name: v.string(),
        teamId: v.string(),
        callerId: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.projects.create, {
          name: args.name,
          teamId: args.teamId as Id<"teams">,
          callerId: args.callerId as Id<"users">,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ project: data }, 200);
    }
  )
  // POST /transfer-ownership
  .post(
    "/transfer-ownership",
    vValidator(
      "json",
      v.object({
        callerId: v.string(),
        projectId: v.string(),
        newOwner: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.projects.transferOwnerShip, {
          callerId: args.callerId as Id<"users">,
          projectId: args.projectId as Id<"projects">,
          newOwner: args.newOwner as Id<"users">,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ result: data }, 200);
    }
  )

  // PATCH /update
  .patch(
    "/update",
    vValidator(
      "json",
      v.object({
        projectId: v.string(),
        callerId: v.string(),
        newName: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.projects.update, {
          projectId: args.projectId as Id<"projects">,
          callerId: args.callerId as Id<"users">,
          newName: args.newName,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ project: data }, 200);
    }
  )

  // DELETE /remove
  .delete(
    "/remove",
    vValidator(
      "json",
      v.object({
        projectId: v.string(),
        callerId: v.string(),
        purge: v.boolean(),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.projects.remove, {
          projectId: args.projectId as Id<"projects">,
          callerId: args.callerId as Id<"users">,
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

  // GET /:projectId
  .get(
    "/:projectId",
    vValidator("param", v.object({ projectId: v.string() })),
    async (c) => {
      const args = c.req.valid("param");
      const { data, err } = await trySafely(() =>
        client.query(api.projects.get, {
          projectId: args.projectId as Id<"projects">,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ project: data }, 200);
    }
  )

  // POST /add-variables
  .post(
    "/add-variables",
    vValidator(
      "json",
      v.object({
        projectId: v.string(),
        callerId: v.string(),
        variables: v.array(v.object({ name: v.string(), value: v.string() })),
        stage: v.picklist(["development", "production"]),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.projects.addVariables, {
          projectId: args.projectId as Id<"projects">,
          callerId: args.callerId as Id<"users">,
          variables: args.variables,
          stage: args.stage,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ result: data }, 200);
    }
  )

  // PATCH /update-variables
  .patch(
    "/update-variables",
    vValidator(
      "json",
      v.object({
        projectId: v.string(),
        callerId: v.string(),
        variables: v.array(v.object({ name: v.string(), value: v.string() })),
        stage: v.picklist(["development", "production"]),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.projects.updateVariables, {
          projectId: args.projectId as Id<"projects">,
          callerId: args.callerId as Id<"users">,
          variables: args.variables,
          stage: args.stage,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ result: data }, 200);
    }
  )

  // DELETE /remove-variables
  .delete(
    "/remove-variables",
    vValidator(
      "json",
      v.object({
        projectId: v.string(),
        callerId: v.string(),
        variables: v.array(v.string()),
      })
    ),
    async (c) => {
      const args = c.req.valid("json");
      const { data, err } = await trySafely(() =>
        client.mutation(api.projects.removeVariables, {
          projectId: args.projectId as Id<"projects">,
          callerId: args.callerId as Id<"users">,
          variables: args.variables,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ result: data }, 200);
    }
  )

  // GET /:projectId/variables/:callerId
  .get(
    "/:projectId/variables/:callerId",
    vValidator(
      "param",
      v.object({
        projectId: v.string(),
        callerId: v.string(),
      })
    ),
    async (c) => {
      const args = c.req.valid("param");
      const { data, err } = await trySafely(() =>
        client.query(api.projects.getVariables, {
          projectId: args.projectId as Id<"projects">,
          callerId: args.callerId as Id<"users">,
        })
      );
      if (err) {
        console.error(err);
        return c.json({ error: err.message }, 500);
      }
      return c.json({ variables: data }, 200);
    }
  );

export default projects;
