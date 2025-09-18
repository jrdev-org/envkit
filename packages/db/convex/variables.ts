import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server.js";
import { Id } from "./_generated/dataModel.js";
import { computeETag } from "./helpers.js";

// Insert or patch project snapshot per branch
async function insertOrPatch(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; branch?: string; etag: string }
) {
  const existing = await ctx.db
    .query("projectSnapshots")
    .withIndex("by_project_and_branch", (q) =>
      q.eq("projectId", args.projectId).eq("branch", args.branch ?? undefined)
    )
    .first();

  if (!existing) {
    return await ctx.db.insert("projectSnapshots", {
      projectId: args.projectId,
      branch: args.branch,
      lastUpdatedAt: Date.now(),
      etag: args.etag,
    });
  }

  await ctx.db.patch(existing._id, {
    lastUpdatedAt: Date.now(),
    etag: args.etag,
    deletedAt: undefined,
  });

  return existing._id;
}

// Update snapshot helper that fetches active vars and upserts project snapshot
async function updateSnapshot(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; branch?: string }
) {
  const allVars = await ctx.db
    .query("variables")
    .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
    .collect();

  const activeVars = allVars.filter(
    (v) =>
      v.deletedAt === undefined && (!args.branch || v.branch === args.branch)
  );

  const etag = await computeETag(activeVars);

  const snapshotId = await insertOrPatch(ctx, {
    projectId: args.projectId,
    branch: args.branch,
    etag,
  });

  return { activeVars, snapshotId };
}

// ------------------ Queries ------------------

// Get all active variables for a project (optionally filtered by branch)
export const get = query({
  args: { projectId: v.id("projects"), branch: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project doesn't exist");

    const branch = args.branch?.trim();

    const vars = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    return vars.filter(
      (v) => v.deletedAt === undefined && (!branch || v.branch === branch)
    );
  },
});

// Get project with its variables
export const getProjectAndVars = query({
  args: { projectId: v.id("projects"), branch: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project doesn't exist");

    const branch = args.branch?.trim();

    const vars = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    const activeVars = vars.filter(
      (v) => v.deletedAt === undefined && (!branch || v.branch === branch)
    );

    return { project, variables: activeVars };
  },
});

// ------------------ Mutations ------------------

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    encryptedValue: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project doesn't exist");

    const name = args.name.trim();
    const branch = args.branch?.trim();

    const existing = await ctx.db
      .query("variables")
      .withIndex("by_project_and_name", (q) =>
        q.eq("projectId", project._id).eq("name", name)
      )
      .filter(
        branch === undefined
          ? (q) => q.eq(q.field("deletedAt"), undefined)
          : (q) => q.eq(q.field("branch"), branch)
      )
      .first();

    if (existing && existing.deletedAt === undefined) {
      throw new Error(`Variable "${name}" already exists`);
    }

    await ctx.db.insert("variables", {
      projectId: project._id,
      name,
      value: args.encryptedValue,
      branch,
    });

    // Update snapshot
    const { activeVars, snapshotId } = await updateSnapshot(ctx, {
      projectId: project._id,
      branch,
    });

    return { activeVars, snapshotId };
  },
});

// Update variable
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    value: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project doesn't exist");
    const { name, branch } = args;
    const existing = await ctx.db
      .query("variables")
      .withIndex("by_project_and_name", (q) =>
        q.eq("projectId", project._id).eq("name", name)
      )
      .filter(
        branch === undefined
          ? (q) => q.eq(q.field("branch"), undefined)
          : (q) => q.eq(q.field("branch"), branch)
      )
      .first();

    if (!existing || existing.deletedAt) {
      throw new Error(`Variable "${name}" does not exist`);
    }

    if (!existing || existing.deletedAt) {
      throw new Error(`Variable "${name}" does not exist`);
    }

    await ctx.db.patch(existing._id, {
      value: args.value, // assume encrypted upstream
      branch,
    });

    // Update snapshot
    const { activeVars, snapshotId } = await updateSnapshot(ctx, {
      projectId: project._id,
      branch,
    });

    return { updatedVar: existing, activeVars, snapshotId };
  },
});

// Soft-delete variable
export const deleteVariable = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project doesn't exist");

    const name = args.name.trim();
    const branch = args.branch?.trim();

    const existing = await ctx.db
      .query("variables")
      .withIndex("by_project_and_name", (q) =>
        q.eq("projectId", project._id).eq("name", name)
      )
      .filter(
        branch === undefined
          ? (q) => q.eq(q.field("branch"), undefined)
          : (q) => q.eq(q.field("branch"), branch)
      )
      .first();

    if (!existing || existing.deletedAt) {
      throw new Error("Variable not found or already deleted");
    }

    await ctx.db.patch(existing._id, { deletedAt: Date.now() });

    // Update snapshot
    const { activeVars, snapshotId } = await updateSnapshot(ctx, {
      projectId: project._id,
      branch,
    });

    return { deletedVar: existing, activeVars, snapshotId };
  },
});
