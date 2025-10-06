import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { calculateVariablesHash } from "./variables.js";
import { Doc } from "./_generated/dataModel.js";
import { getHashFromToken, tokenAndHash } from "./helpers.js";

export const getVars = query({
  args: {
    projectId: v.id("projects"),
    localHash: v.string(), // New argument
    callerId: v.id("users"),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project doesn't exist");
    const caller = await ctx.db.get(args.callerId);
    if (!caller) {
      throw new Error("User not found");
    }
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", project.teamId).eq("userId", caller._id)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .filter((q) => q.neq(q.field("role"), "viewer"))
      .first();

    if (!teamMember) {
      throw new Error("You are not authorized to access this project");
    }

    const branch = args.branch?.trim();

    // Calculate server-side hash
    const { hash: serverHash, vars } = await calculateVariablesHash(
      ctx,
      args.projectId,
      branch
    );

    // Compare with localHash if provided
    if (args.localHash.trim() === serverHash) {
      // More ergonomic than throwing
      return { changed: false, hash: serverHash, vars: [] };
    }

    return { changed: true, hash: serverHash, vars };
  },
});

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

    // Authorization check
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
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const incomingNames = new Set(vars.map((x) => x.name));
    const existingNames = new Set(projectVars.map((v) => v.name));

    const conflicts = projectVars.filter((v) => incomingNames.has(v.name));
    const additions = vars.filter((v) => !existingNames.has(v.name));
    const removals = projectVars.filter((v) => !incomingNames.has(v.name));

    const now = Date.now();

    // Update conflicts and insert additions
    for (const { name, value } of vars) {
      const existing = conflicts.find((v) => v.name === name);

      if (existing) {
        if (typeof existing.deletedAt === "number") {
          await ctx.db.patch(existing._id, {
            value,
            deletedAt: undefined,
            updatedAt: now,
          });
        } else if (existing.value !== value) {
          await ctx.db.patch(existing._id, { value, updatedAt: now });
        }
        // unchanged → no-op
      } else {
        await ctx.db.insert("variables", {
          projectId: project._id,
          name,
          value,
          updatedAt: now,
        });
      }
    }

    // Soft delete removals
    for (const v of removals) {
      await ctx.db.patch(v._id, { deletedAt: now });
    }

    // Rebuild variable summary from the current active set
    const activeVars = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const summary = activeVars.map((v) => ({
      name: v.name,
      updatedAt: v.updatedAt ?? now,
    }));

    await ctx.db.patch(project._id, {
      lastAction: `updated by ${user.name}`,
      updatedAt: now,
      variableSummary: summary,
    });

    const updatedProject = await ctx.db.get(project._id);
    if (!updatedProject) throw new Error("Project not found");
    return { updatedProject, additions, removals, conflicts };
  },
});

export const setVar = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    name: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { projectId, callerId, name, value }) => {
    const project = await ctx.db.get(projectId);
    if (!project || project.deletedAt) {
      throw new Error("Project not found");
    }

    // Authorization check
    const caller = await ctx.db.get(callerId);
    if (!caller) {
      throw new Error("User not found");
    }
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", project.teamId).eq("userId", caller._id)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .filter((q) => q.neq(q.field("role"), "viewer"))
      .first();

    if (!teamMember) {
      throw new Error("You are not authorized to update this project");
    }

    // Check if variable exists
    const existing = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .filter((q) => q.eq(q.field("name"), name))
      .first();

    const now = Date.now();
    // TODO: Implement a way to store the old value for auditing and blame
    if (existing) {
      // check if the value has changed
      if (existing.value === value) {
        return { updated: false, updatedProject: project };
      }

      // Update existing variable
      await ctx.db.patch(existing._id, {
        value,
        updatedBy: caller._id,
        updatedAt: now,
      });

      // update variable summary
      const updatedSummary = [];
      for (const v of project.variableSummary) {
        updatedSummary.push(
          v.name === name ? { name: name, updatedAt: now } : v
        );
      }
      await ctx.db.patch(project._id, {
        variableSummary: updatedSummary,
        lastAction: `updated by ${caller.name}`,
        updatedAt: now,
      });
      const updatedProject = await ctx.db.get(project._id);
      if (!updatedProject) throw new Error("Project not found");

      return { updated: true, updatedProject };
    } else {
      await ctx.db.insert("variables", {
        projectId: project._id,
        name,
        value,
        updatedBy: caller._id,
        updatedAt: now,
      });

      const updatedSummary = project.variableSummary;
      // add the new variable to the summary
      updatedSummary.push({ name: name, updatedAt: now });

      await ctx.db.patch(project._id, {
        variableSummary: updatedSummary,
        lastAction: `updated by ${caller.name}`,
        updatedAt: now,
      });

      const updatedProject = await ctx.db.get(project._id);
      if (!updatedProject) throw new Error("Project not found");

      return { updated: false, updatedProject };
    }
  },
});

export const deleteVar = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, { projectId, callerId, name }) => {
    const project = await ctx.db.get(projectId);
    if (!project || project.deletedAt) {
      throw new Error("Project not found");
    }
    const caller = await ctx.db.get(callerId);
    if (!caller) {
      throw new Error("User not found");
    }

    // Authorization check
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", project.teamId).eq("userId", caller._id)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .filter((q) => q.neq(q.field("role"), "viewer"))
      .first();

    if (!teamMember) {
      throw new Error("You are not authorized to update this project");
    }

    // Check if variable exists
    const existing = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .filter((q) => q.eq(q.field("name"), name))
      .first();
    if (!existing) {
      throw new Error("Variable not found");
    }

    const now = Date.now();
    // TODO: Implement a way to store the old value for auditing and blame
    await ctx.db.patch(existing._id, {
      deletedAt: now,
      updatedBy: caller._id,
      updatedAt: now,
    });

    // update variable summary
    const updatedSummary = project.variableSummary.filter(
      (v) => v.name !== name
    );
    await ctx.db.patch(project._id, {
      variableSummary: updatedSummary,
      lastAction: `deleted by ${caller.name}`,
      updatedAt: now,
    });

    const updatedProject = await ctx.db.get(project._id);
    if (!updatedProject) throw new Error("Project not found");

    return updatedProject;
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
    const caller = await ctx.db.get(userId);
    if (!caller) {
      throw new Error("User not found");
    }
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", caller._id)
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
        `Project has ${vars.length} variables. Re-run with the --force flag to delete them.`
      );
    }

    // Delete variables (if any)
    for (const vdoc of vars) {
      await ctx.db.patch(vdoc._id, {
        deletedAt: Date.now(),
        updatedBy: caller._id,
      });
    }

    // delete share tokens
    const shareTokens = await ctx.db
      .query("shareTokens")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    for (const shareToken of shareTokens) {
      await ctx.db.delete(shareToken._id);
    }

    // Finally delete the project
    await ctx.db.patch(project._id, {
      deletedAt: Date.now(),
      lastAction: `project_deleted by ${caller.name}`,
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

// --- Create Share Link ---
export const createShareToken = mutation({
  args: {
    projectId: v.id("projects"),
    callerId: v.id("users"),
    allowLink: v.optional(v.boolean()), // default false (single-use)
    expiresAt: v.number(), // how long the token is valid
    singleUse: v.optional(v.boolean()), // default false (single-use)
  },
  handler: async (
    ctx,
    { projectId, callerId, allowLink, expiresAt, singleUse }
  ) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    const caller = await ctx.db.get(callerId);
    if (!caller) {
      throw new Error("User not found");
    }

    // Authorization check
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", project.teamId).eq("userId", caller._id)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .filter((q) => q.neq(q.field("role"), "viewer"))
      .first();

    if (!teamMember) {
      throw new Error("You are not authorized to share this project!");
    }

    const now = Date.now();

    const { token, tokenHash } = await tokenAndHash();
    const shareLink = {
      projectId: project._id,
      createdBy: caller._id,
      tokenHash,
      allowLink: allowLink ?? false,
      expiresAt,
      createdAt: now,
      singleUse: singleUse ?? false,
    };

    const id = await ctx.db.insert("shareTokens", shareLink);
    const shareToken = await ctx.db.get(id);
    if (!shareToken || !shareToken.tokenHash)
      throw new Error("Share token not found");
    return { token, expiresAt: shareToken.expiresAt };
  },
});

// --- Consume Share Token ---
export const consumeShareToken = mutation({
  args: {
    token: v.string(),
    consumerDevice: v.string(),
    consumerId: v.optional(v.id("users")),
  },
  handler: async (ctx, { token, consumerDevice, consumerId }) => {
    const tokenHash = await getHashFromToken(token);
    const link = await ctx.db
      .query("shareTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();

    if (!link) throw new Error("Invalid or expired token");
    let user: Doc<"users"> | null = null;
    if (consumerId) {
      user = await ctx.db.get(consumerId);
      if (!user) {
        throw new Error("User not found");
      }
    }

    const now = Date.now();
    if (link.expiresAt < now) {
      // Expired
      await ctx.db.delete(link._id);
      throw new Error("Token expired");
    }

    // Fetch project
    const project = await ctx.db.get(link.projectId);
    if (!project) throw new Error("Project not found");

    // delete token if single-use
    if (link.singleUse) {
      await ctx.db.delete(link._id);
    } else {
      // Audit trail
      const consumedByMessage = consumerId
        ? `user ${consumerId} via ${consumerDevice}`
        : `unknown user via ${consumerDevice}`;
      await ctx.db.patch(link._id, {
        usedAt: now,
        consumedBy: consumedByMessage,
        lastAccessedAt: now,
      });
    }

    return {
      project,
      allowLink: link.allowLink,
      variables: await ctx.db
        .query("variables")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect(),
    };
  },
});

// --- List Share Tokens ---
export const listShareTokens = query({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, { projectId, userId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check authorization
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", project.teamId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .first();

    if (!teamMember) {
      throw new Error("Not authorized to view share tokens");
    }

    const tokens = await ctx.db
      .query("shareTokens")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    // Return formatted list
    return tokens
      .filter((t) => t.tokenHash) // Only active tokens
      .map((t) => ({
        id: t._id,
        tokenPreview: t.tokenHash?.slice(0, 8) + "...", // First 8 chars of hash
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        isExpired: t.expiresAt < Date.now(),
        allowLink: t.allowLink ?? false,
        usedAt: t.usedAt,
        consumedBy: t.consumedBy,
      }))
      .sort((a, b) => b.createdAt - a.createdAt); // Newest first
  },
});

// --- Revoke Share Token ---
export const revokeShareToken = mutation({
  args: {
    tokenId: v.id("shareTokens"),
    userId: v.id("users"),
  },
  handler: async (ctx, { tokenId, userId }) => {
    const token = await ctx.db.get(tokenId);
    if (!token) throw new Error("Token not found");

    const project = await ctx.db.get(token.projectId);
    if (!project) throw new Error("Project not found");

    // Check authorization
    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", project.teamId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .filter((q) => q.neq(q.field("role"), "viewer"))
      .first();

    if (!teamMember) {
      throw new Error("Not authorized to revoke tokens");
    }

    await ctx.db.delete(token._id);

    return { success: true };
  },
});

/**
 * Hard-delete expired or revoked share tokens.
 * Returns { deleted: number }
 */
export const pruneExpiredShareTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired or explicitly revoked tokens (only rows that are safe to delete)
    const expiredOrRevoked = await ctx.db
      .query("shareTokens")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    if (!expiredOrRevoked.length) {
      return { deleted: 0 };
    }

    // Delete each candidate. We restrict deletion to items matching the criteria above.
    let deleted = 0;
    for (const t of expiredOrRevoked) {
      try {
        await ctx.db.delete(t._id);
        deleted++;
      } catch (e) {
        // swallow individual delete errors to allow other deletes to continue
      }
    }

    return { deleted };
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const userTeams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .filter((q) => q.eq(q.field("state"), "active"))
      .collect();
    const personalProjects: Doc<"projects">[] = [];
    const organizationProjects: Doc<"projects">[] = [];
    for (const team of userTeams) {
      const teamProjects = await ctx.db
        .query("projects")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
      if (team.type === "personal") {
        personalProjects.push(...teamProjects);
      } else {
        organizationProjects.push(...teamProjects);
      }
    }

    return { personalProjects, organizationProjects };
  },
});
