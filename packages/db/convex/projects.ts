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
        q.eq("teamId", project.teamId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .filter((q) => q.neq(q.field("role"), "viewer"))
      .first();

    if (!teamMember) {
      throw new Error("You are not authorized to update this project");
    }

    const projectVars = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    // build sets
    const incomingNames = new Set(vars.map((x) => x.name));
    const existingNames = new Set(projectVars.map((v) => v.name));

    // classify
    const conflicts = projectVars.filter((v) => incomingNames.has(v.name));
    const additions = vars.filter((v) => !existingNames.has(v.name));
    const removals = projectVars.filter((v) => !incomingNames.has(v.name));

    const now = Date.now();

    // update conflicts
    for (const { name, value } of vars) {
      const existing = conflicts.find((v) => v.name === name);

      if (existing) {
        if (existing.deletedAt) {
          // Reactivate soft-deleted variable
          await ctx.db.patch(existing._id, {
            value, // bring in new value
            deletedAt: undefined,
            updatedAt: now,
          });
        } else if (existing.value !== value) {
          // Only update if changed
          await ctx.db.patch(existing._id, {
            value,
            updatedAt: now,
          });
        }
        // if value is the same and not deleted, no-op
      } else {
        // brand new insertion
        for (const v of additions) {
          await ctx.db.insert("variables", {
            projectId: project._id,
            name: v.name,
            value: v.value,
            updatedAt: now,
          });
        }
      }
    }

    // soft-delete removals (keep audit trail)
    for (const v of removals) {
      await ctx.db.patch(v._id, { deletedAt: now });
    }

    const projectForSummary = await ctx.db.get(project._id);
    if (!projectForSummary) {
      throw new Error("Project not found after updates");
    }

    const summaryMap = new Map<string, number>();
    // Keep existing system variables
    projectForSummary.variableSummary.forEach((v) => {
      if (v.name === "PROJECT_NAME" || v.name === "TEAM_NAME") {
        summaryMap.set(v.name, v.updatedAt);
      }
    });
    // Add/update user variables
    vars.forEach((v) => {
      summaryMap.set(v.name, now);
    });

    const newSummary = Array.from(summaryMap.entries()).map(
      ([name, updatedAt]) => ({ name, updatedAt })
    );

    await ctx.db.patch(project._id, {
      lastAction: `updated by ${user.name}`,
      updatedAt: now,
      variableSummary: newSummary,
    });

    const updatedProject = await ctx.db.get(project._id);
    if (!updatedProject) throw new Error("Project not found");
    return { updatedProject, additions, removals, conflicts };
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
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing) {
      throw new Error(`Project already exists.`);
    }

    const newProjectId = await ctx.db.insert("projects", {
      name,
      stage,
      teamId: team._id,
      variableSummary: [
        {
          name: "PROJECT_NAME",
          updatedAt: Date.now(),
        },
        {
          name: "TEAM_NAME",
          updatedAt: Date.now(),
        },
      ],
      lastAction: "created",
      updatedAt: Date.now(),
    });

    const newProject = await ctx.db.get(newProjectId);
    if (!newProject) throw new Error("Project not found");
    // insert PROJECT_NAME and TEAM_NAME variables
    await Promise.all([
      ctx.db.insert("variables", {
        projectId: newProject._id,
        name: "PROJECT_NAME",
        value: newProject.name,
        updatedAt: Date.now(),
      }),
      ctx.db.insert("variables", {
        projectId: newProject._id,
        name: "TEAM_NAME",
        value: team.name,
        updatedAt: Date.now(),
      }),
    ]);

    return newProject;
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
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    return teamProjects.sort((a, b) => a.name.localeCompare(b.name));
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
      .filter((q) => q.eq(q.field("removedAt"), undefined))
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
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();
    if (conflict && conflict._id !== project._id) {
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
      .filter((q) => q.eq(q.field("removedAt"), undefined))
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
