import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

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
      .filter((q) => q.eq(q.field("branch"), branch))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return vars;
  },
});

// Get project with its variables
export const getProjectAndVars = query({
  args: { projectId: v.id("projects"), branch: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project doesn't exist");

    const branch = args.branch?.trim();

    const query = ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    const activeVars = await (branch
      ? query.filter((q) => q.eq(q.field("branch"), branch))
      : query
    ).collect();

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
      .filter((q) => q.eq(q.field("branch"), branch))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing) {
      throw new Error(`Variable "${name}" already exists`);
    }

    const now = Date.now();
    await ctx.db.insert("variables", {
      projectId: project._id,
      name,
      value: args.encryptedValue,
      branch,
      updatedAt: now,
    });

    const newSummaryEntry = { name, updatedAt: now };
    const existingSummary = project.variableSummary.find((s) => s.name === name);
    const newSummary = existingSummary
      ? project.variableSummary.map((s) =>
          s.name === name ? newSummaryEntry : s
        )
      : [...project.variableSummary, newSummaryEntry];

    await ctx.db.patch(project._id, {
      variableSummary: newSummary,
      updatedAt: now,
    });

    return await ctx.db.get(project._id);
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
      .filter((q) => q.eq(q.field("branch"), branch))
      .first();

    if (!existing || existing.deletedAt) {
      throw new Error(`Variable "${name}" does not exist`);
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      value: args.value, // assume encrypted upstream
      branch,
      updatedAt: now,
    });

    const updatedSummaryEntry = { name, updatedAt: now };
    const newSummary = project.variableSummary.map((s) =>
      s.name === name ? updatedSummaryEntry : s
    );

    await ctx.db.patch(project._id, {
      variableSummary: newSummary,
      updatedAt: now,
    });

    return {
      updatedVar: { ...existing, value: args.value, updatedAt: now },
      project: await ctx.db.get(project._id),
    };
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
      .filter((q) => q.eq(q.field("branch"), branch))
      .first();

    if (!existing || existing.deletedAt) {
      throw new Error("Variable not found or already deleted");
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, { deletedAt: now });

    const newSummary = project.variableSummary.filter((s) => s.name !== name);
    await ctx.db.patch(project._id, {
      variableSummary: newSummary,
      updatedAt: now,
    });

    return {
      deletedVar: { ...existing, deletedAt: now },
      project: await ctx.db.get(project._id),
    };
  },
});
