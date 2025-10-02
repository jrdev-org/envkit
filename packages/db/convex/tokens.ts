import { v } from "convex/values";
import { query } from "./_generated/server.js";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const tokens = await ctx.db
      .query("shareTokens")
      .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
      .collect();
    return tokens;
  },
});
