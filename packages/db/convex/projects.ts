import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { getProjectAuthorized, getTeamAuthorized } from "./helpers.js";

export const create = mutation({
  args: {
    name: v.string(),
    teamId: v.id("teams"),
    callerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { name, teamId, callerId } = args;
    const { team, user: caller } = await getTeamAuthorized({
      teamId,
      callerId,
      ctx,
    });
    const newProjectId = await ctx.db.insert("projects", {
      name,
      teamId: team._id,
      ownerId: caller._id,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("activities", {
      entityType: "project",
      entityId: newProjectId,
      userId: caller._id,
      activity: "created",
      timestamp: Date.now(),
    });

    const newProject = await ctx.db.get(newProjectId);
    if (!newProject) throw new Error("Project not found!");

    return newProject;
  },
});

export const transferOwnerShip = mutation({
  args: {
    callerId: v.id("users"),
    projectId: v.id("projects"),
    newOwner: v.id("users"),
  },
  async handler(ctx, { callerId, projectId, newOwner: newOwnerId }) {
    const { user, project } = await getProjectAuthorized({
      projectId,
      callerId,
      ctx,
    });
    const newOwner = await ctx.db.get(newOwnerId);
    if (!newOwner) throw new Error("New owner not found!");
    await ctx.db.patch(projectId, {
      ownerId: newOwner._id,
    });
    await ctx.db.insert("activities", {
      entityType: "project",
      entityId: project._id,
      userId: user._id,
      activity: "transferred ownership",
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    newName: v.string(),
  },
  async handler(ctx, { callerId, projectId, newName }) {
    const { user: caller, project } = await getProjectAuthorized({
      callerId,
      projectId,
      ctx,
    });
    await ctx.db.patch(project._id, {
      name: newName.trim(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("activities", {
      entityType: "project",
      entityId: project._id,
      userId: caller._id,
      activity: "Updated project name",
      timestamp: Date.now(),
    });

    const updatedProject = await ctx.db.get(project._id);
    if (!updatedProject) throw new Error("Project not found!");
    return updatedProject;
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    purge: v.boolean(),
  },
  async handler(ctx, { callerId, projectId, purge }) {
    const { user, project } = await getProjectAuthorized({
      projectId,
      callerId,
      ctx,
    });
    if (purge) {
      // remove project's variables
      const variables = await ctx.db
        .query("variables")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const variable of variables) {
        await ctx.db.delete(variable._id);
      }

      // remove project's sharetokens
      const shares = await ctx.db
        .query("shareTokens")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const share of shares) {
        await ctx.db.delete(share._id);
      }

      // delete project
      await ctx.db.delete(project._id);
      return { deleted: true, type: "purge" };
    }

    await ctx.db.delete(project._id);
    return { deleted: true, type: "soft" };
  },
});

export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { projectId } = args;
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error(`Project not found!`);
    return project;
  },
});

export const addVariables = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    variables: v.array(v.object({ name: v.string(), value: v.string() })),
    stage: v.union(v.literal("development"), v.literal("production")),
  },
  async handler(ctx, { projectId, callerId, variables, stage }) {
    const { user, project } = await getProjectAuthorized({
      projectId,
      callerId,
      ctx,
    });
    for (const variable of variables) {
      const existing = await ctx.db
        .query("variables")
        .withIndex("by_project_and_name", (q) =>
          q.eq("projectId", project._id).eq("name", variable.name)
        )
        .unique();
      if (existing) throw new Error(`Variable already exists!`);

      await ctx.db.insert("variables", {
        projectId,
        name: variable.name,
        value: variable.value,
        stage,
        previousValue: [],
      });
    }
    await ctx.db.patch(project._id, {
      updatedAt: Date.now(),
    });
    await ctx.db.insert("activities", {
      entityType: "project",
      entityId: project._id,
      userId: user._id,
      activity: "Added variables!",
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

export const updateVariables = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    variables: v.array(v.object({ name: v.string(), value: v.string() })),
    stage: v.union(v.literal("development"), v.literal("production")),
  },
  async handler(ctx, { projectId, callerId, variables, stage }) {
    const { user, project } = await getProjectAuthorized({
      projectId,
      callerId,
      ctx,
    });
    const now = Date.now();
    for (const variable of variables) {
      const existing = await ctx.db
        .query("variables")
        .withIndex("by_project_and_name", (q) =>
          q.eq("projectId", project._id).eq("name", variable.name)
        )
        .unique();
      if (!existing) throw new Error(`Variable not found!`);

      await ctx.db.patch(existing._id, {
        previousValue: [
          {
            updatedBy: user._id,
            value: existing.value,
            updatedAt: now,
          },
        ],
        value: variable.value,
      });
    }
    await ctx.db.patch(project._id, {
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      entityType: "project",
      entityId: project._id,
      userId: user._id,
      activity: "Updated variables",
      timestamp: now,
    });
    return { success: true };
  },
});

export const removeVariables = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    variables: v.array(v.string()),
  },
  async handler(ctx, { projectId, callerId, variables }) {
    const { user, project } = await getProjectAuthorized({
      projectId,
      callerId,
      ctx,
    });
    for (const variable of variables) {
      const existing = await ctx.db
        .query("variables")
        .withIndex("by_project_and_name", (q) =>
          q.eq("projectId", project._id).eq("name", variable)
        )
        .unique();
      if (!existing) throw new Error(`Variable not found!`);

      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

export const getVariables = query({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
  },
  handler: async (ctx, { projectId, callerId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error(`Project not found!`);
    const { user, team } = await getTeamAuthorized({
      teamId: project.teamId,
      callerId,
      ctx,
    });
    const variables = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    if (user.role === "admin" || user.owner) {
      return variables;
    } else if (user.role === "member") {
      return variables.filter((v) => v.stage === "development" || "staging");
    } else {
      return variables.filter((v) => v.stage === "development");
    }
  },
});
