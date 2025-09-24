import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const addVars = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    vars: v.array(
      v.object({
        name: v.string(),
        value: v.string(),
      })
    ),
  },
  handler: async (ctx, { projectId, callerId, vars }) => {
    const project = await ctx.db.get(projectId);
    if (!project || project.deletedAt) {
      throw new Error("Project not found");
    }

    const user = await ctx.db.get(callerId);
    if (!user) {
      throw new Error("User not found");
    }

    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", project.teamId).eq("userId", callerId)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .filter((q) => q.neq(q.field("role"), "viewer"))
      .collect()
      .then((m) => m.map((m) => m.userId === user._id));

    if (!teamMember) {
      throw new Error("You are not authorized to update this project");
    }

    const projectVars = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    const conflicting = projectVars.filter((v) => v.name in vars);

    const now = Date.now();

    for (const { name, value } of vars) {
      // if conflicting, update value
      const conflictingVar = conflicting.find((v) => v.name === name);
      if (conflictingVar) {
        await ctx.db.patch(conflictingVar._id, {
          value,
        });
      } else {
        await ctx.db.insert("variables", {
          projectId,
          name,
          value,
        });
      }
    }

    await ctx.db.patch(project._id, {
      lastAction: `updated by ${user.name}`,
      updatedAt: now,
    });

    return await ctx.db.get(projectId);
  },
});

export const create = mutation({
  args: { name: v.string(), stage: v.string(), teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    const name = args.name.trim();
    const stage = args.stage.trim();

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_team_and_name_and_stage", (q) =>
        q.eq("teamId", team._id).eq("name", name).eq("stage", stage)
      )
      .first();

    if (existing && existing.deletedAt === undefined) {
      throw new Error(`Project already exists.`);
    }

    const newProjectId = await ctx.db.insert("projects", {
      name,
      stage,
      teamId: team._id,
      lastAction: "created",
      updatedAt: Date.now(),
    });

    return await ctx.db.get(newProjectId);
  },
});

export const list = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    const teamProjects = await ctx.db
      .query("projects")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    return teamProjects
      .filter((p) => p.deletedAt === undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.deletedAt) {
      throw new Error("Project not found");
    }
    return project;
  },
});

/**
 * Rename a project (owner-only).
 * Ensures uniqueness by ownerId + name (same as create).
 */
export const rename = mutation({
  args: {
    userId: v.id("users"),
    teamId: v.id("teams"),
    stage: v.string(),
    projectId: v.id("projects"),
    newName: v.string(),
  },
  handler: async (ctx, { userId, teamId, stage, projectId, newName }) => {
    // 1. Fetch project first
    const project = await ctx.db.get(projectId);
    if (!project || project.deletedAt) throw new Error("Project not found!");

    // 2. Fetch team membership for user
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", userId)
      )
      .first();

    if (!teamMember) throw new Error("You are not a member of this team");

    if (teamMember.role !== "admin") {
      throw new Error("You must be an admin to rename this project");
    }

    // 3. Optional: Ensure the project belongs to this team
    if (project.teamId !== teamId) {
      throw new Error("Project does not belong to this team");
    }

    const normalizedName = newName.trim();
    const normalizedStage = stage.trim();
    const conflict = await ctx.db
      .query("projects")
      .withIndex("by_team_and_name_and_stage", (q) =>
        q
          .eq("teamId", teamId)
          .eq("name", normalizedName)
          .eq("stage", normalizedStage)
      )
      .first();
    if (
      conflict &&
      conflict._id !== project._id &&
      conflict.deletedAt === undefined
    ) {
      throw new Error("Another project with this name already exists");
    }

    // 4. Patch project with new name and update timestamp
    const now = Date.now();
    await ctx.db.patch(project._id, {
      name: normalizedName,
      lastAction: "renamed",
      updatedAt: now,
    });

    return {
      ...project,
      name: normalizedName,
      lastAction: "renamed",
      updatedAt: now,
    };
  },
});

/**
 * Remove a project (owner-only).
 * If variables exist and force=false -> throws.
 * If force=true -> deletes variables first, then deletes the project.
 */
export const remove = mutation({
  args: {
    userId: v.id("users"),
    teamId: v.id("teams"),
    projectId: v.id("projects"),
    force: v.boolean(),
  },
  handler: async (ctx, { userId, teamId, projectId, force }) => {
    // 1. Fetch project first
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    if (project.deletedAt) throw new Error("Project already deleted");

    // 2. Ensure project belongs to this team
    if (project.teamId !== teamId) {
      throw new Error("Project does not belong to this team");
    }

    // fetch team membership for user
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", userId)
      )
      .first();

    if (!teamMember) throw new Error("You are not a member of this team");

    if (teamMember.role !== "admin") {
      throw new Error("You must be an admin to delete this project");
    }

    // 3. Ensure project has no variables
    const vars = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    if (vars.length > 0 && !force) {
      throw new Error(
        `Project has ${vars.length} variables. Re-run with force=true to delete.`
      );
    }

    // Delete variables (if any)
    for (const vdoc of vars) {
      await ctx.db.patch(vdoc._id, {
        deletedAt: Date.now(),
      });
    }

    // Finally delete the project
    await ctx.db.patch(project._id, {
      deletedAt: Date.now(),
      lastAction: "project_deleted",
    });

    // Cleanup related snapshots for this project
    const snapshots = await ctx.db
      .query("projectSnapshots")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    for (const snap of snapshots) {
      await ctx.db.patch(snap._id, { deletedAt: Date.now() });
    }

    return { success: true, project };
  },
});

// an internal query that fetches both project and team salt
export const getProjectAndTeamSalt = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) return { project: null, teamSalt: null };
    const teamSalt = await ctx.db
      .query("salts")
      .filter((q) => q.eq(q.field("teamId"), project.teamId))
      .first()
      .then((row) => {
        if (row === null) {
          throw new Error("Team salt not found");
        }
        return row.salt;
      });

    return { project, teamSalt };
  },
});
