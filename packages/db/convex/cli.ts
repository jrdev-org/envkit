import { mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { getCaller } from "./helpers.js";

export const init = mutation({
  args: {
    deviceId: v.id("devices"),
    authTokenHash: v.string(),
    userAgent: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { deviceId, authTokenHash, userAgent, expiresAt } = args;
    const device = await ctx.db.get(deviceId);
    if (!device) throw new Error("Device not found!");
    await ctx.db.insert("cliSessions", {
      deviceId,
      authTokenHash,
      status: "pending",
      userAgent,
      expiresAt,
    });
    await ctx.db.insert("activities", {
      entityType: "device",
      entityId: device._id,
      userId: device.ownerId,
      activity: "Initialized CLI session",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const authenticate = mutation({
  args: {
    authTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const { authTokenHash } = args;
    const session = await ctx.db
      .query("cliSessions")
      .withIndex("by_authTokenHash", (q) =>
        q.eq("authTokenHash", authTokenHash)
      )
      .unique();
    if (!session) throw new Error("Session not found!");
    if (session.status === "authenticated")
      throw new Error("Session already authenticated");
    if (session.status === "revoked") throw new Error("Session revoked");
    const device = await ctx.db.get(session.deviceId);
    if (!device) throw new Error("Device not found!");
    await ctx.db.patch(session._id, {
      status: "authenticated",
    });
    await ctx.db.insert("activities", {
      entityType: "cliSession",
      entityId: session._id,
      userId: device.ownerId,
      activity: "Authenticated CLI session",
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

export const revoke = mutation({
  args: {
    authTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const { authTokenHash } = args;
    const session = await ctx.db
      .query("cliSessions")
      .withIndex("by_authTokenHash", (q) =>
        q.eq("authTokenHash", authTokenHash)
      )
      .unique();
    if (!session) throw new Error("Session not found!");
    if (session.status === "revoked")
      throw new Error("Session already revoked");
    const device = await ctx.db.get(session.deviceId);
    if (!device) throw new Error("Device not found!");
    await ctx.db.patch(session._id, {
      status: "revoked",
      revokedAt: Date.now(),
    });
    await ctx.db.insert("activities", {
      entityType: "cliSession",
      entityId: session._id,
      userId: device.ownerId,
      activity: "Revoked CLI session",
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

export const removeRevoked = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const user = await getCaller({ callerId: userId, ctx });
    const devices = await ctx.db
      .query("devices")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const device of devices) {
      const revokedSessions = await ctx.db
        .query("cliSessions")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
        .filter((q) => q.eq(q.field("status"), "revoked"))
        .filter((q) => q.neq(q.field("revokedAt"), undefined))
        .collect();

      for (const session of revokedSessions) {
        await ctx.db.delete(session._id).catch((e) => {
          console.error(e);
        });
      }
    }
    return { success: true };
  },
});
