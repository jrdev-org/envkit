import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const get = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    return await ctx.db
      .query("salts")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
  },
});

export const create = mutation({
  args: { teamId: v.id("teams"), callerId: v.id("users"), salt: v.string() },
  handler: async (ctx, { teamId, callerId, salt }) => {
    const caller = await ctx.db.get(callerId);
    if (!caller) {
      throw new Error("Caller not found");
    }
    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.ownerId !== caller._id) {
      throw new Error("Unauthorized! Caller is not the owner of the team");
    }
    return await ctx.db.insert("salts", {
      teamId,
      salt,
    });
  },
});
