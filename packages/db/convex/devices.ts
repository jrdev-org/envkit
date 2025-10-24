import { mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { getCaller } from "./helpers.js";

export const register = mutation({
  args: v.object({
    ownerId: v.id("users"),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    platform: v.string(),
    arch: v.string(),
    username: v.string(),
    nodeVersion: v.string(),
    cliVersion: v.string(),
  }),
  handler: async (ctx, args) => {
    const owner = await getCaller({ callerId: args.ownerId, ctx });
    const newDeviceId = await ctx.db.insert("devices", {
      ...args,
    });
    await ctx.db.insert("activities", {
      entityType: "device",
      entityId: newDeviceId,
      userId: owner._id,
      activity: "created",
      timestamp: Date.now(),
    });

    const device = await ctx.db.get(newDeviceId);
    if (!device) throw new Error("Device not found!");

    return device;
  },
});

export const remove = mutation({
  args: {
    id: v.id("devices"),
    callerId: v.id("users"),
  },
  handler: async (ctx, { id, callerId }) => {
    const caller = await getCaller({ callerId, ctx });
    const device = await ctx.db.get(id);
    if (!device) throw new Error("Device not found!");
    if (device.ownerId !== caller._id) throw new Error("Not authorized!");
    // delete all cli sessions on device
    const sessions = await ctx.db
      .query("cliSessions")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id).catch(() => {});
    }
    await ctx.db.delete(device._id);
    return { success: true };
  },
});
