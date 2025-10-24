import { v } from "convex/values";
import { mutation } from "./_generated/server.js";
import { getCaller, getProjectAuthorized } from "./helpers.js";

export const create = mutation({
  args: {
    creatorId: v.id("users"),
    projectId: v.id("projects"),
    tokenHash: v.string(),
    stage: v.union(
      v.literal("development"),
      v.literal("production"),
      v.literal("staging")
    ),
    allowLink: v.boolean(),
    expiresAt: v.number(),
    singleUse: v.boolean(),
  },
  handler: async (
    ctx,
    { creatorId, projectId, tokenHash, allowLink, expiresAt, singleUse, stage }
  ) => {
    const { user: creator, project } = await getProjectAuthorized({
      callerId: creatorId,
      projectId,
      ctx,
    });
    await ctx.db.insert("shareTokens", {
      createdBy: creator._id,
      projectId: project._id,
      tokenHash,
      stage,
      allowLink,
      expiresAt,
      singleUse,
    });
    return { success: true };
  },
});

export const retrieve = mutation({
  args: {
    callerId: v.id("users"),
    tokenHash: v.string(),
  },
  handler: async (ctx, { callerId, tokenHash }) => {
    const caller = await getCaller({
      callerId,
      ctx,
    });
    const token = await ctx.db
      .query("shareTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (!token) throw new Error("Token doesn't exist!");
    if (token.expiresAt > Date.now()) {
      await ctx.db.delete(token._id);
      throw new Error("Token has expired!");
    }

    const variables = await ctx.db
      .query("variables")
      .withIndex("by_project", (q) => q.eq("projectId", token.projectId))
      .filter((q) => q.eq(q.field("stage"), token.stage))
      .collect();

    if (token.singleUse) {
      await ctx.db.delete(token._id);
    } else {
      await ctx.db.insert("activities", {
        entityType: "token",
        entityId: token._id,
        userId: caller._id,
        activity: `token used by ${caller.email}`,
        timestamp: Date.now(),
      });
    }

    return { variables, allowLink: token.allowLink };
  },
});

export const update = mutation({
  args: {
    callerId: v.id("users"),
    tokenHash: v.string(),
    allowLink: v.boolean(),
  },
  handler: async (ctx, { callerId, tokenHash, allowLink }) => {
    const caller = await getCaller({
      callerId,
      ctx,
    });
    const token = await ctx.db
      .query("shareTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (!token) throw new Error("Token doesn't exist!");
    if (token.expiresAt > Date.now()) {
      await ctx.db.delete(token._id);
      throw new Error("Token has expired!");
    }
    if (token.createdBy !== caller._id) throw new Error("Unauthorized!");

    await ctx.db.patch(token._id, {
      allowLink,
    });

    return { success: true };
  },
});

export const revoke = mutation({
  args: {
    callerId: v.id("users"),
    tokenHash: v.string(),
  },
  handler: async (ctx, { callerId, tokenHash }) => {
    const caller = await getCaller({
      callerId,
      ctx,
    });
    const token = await ctx.db
      .query("shareTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (!token) throw new Error("Token doesn't exist!");
    if (token.expiresAt > Date.now()) {
      await ctx.db.delete(token._id);
      throw new Error("Token has expired!");
    }
    if (token.createdBy !== caller._id) throw new Error("Unauthorized!");

    await ctx.db.delete(token._id);

    return { success: true };
  },
});
