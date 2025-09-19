import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

// Get device info by deviceId
export const get = query({
  args: {
    deviceId: v.string(),
    userId: v.id("users"),
  },
  async handler(ctx, { deviceId, userId }) {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
      .first();
    if (!device || device.deletedAt) {
      throw new Error("Device not found or deleted");
    }
    if (device.userId !== userId) {
      throw new Error("You are not authorized to view this device info!");
    }
    return device;
  },
});

export const getById = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
      .first();
    if (!device) {
      return "not_found";
    }
    if (device.deletedAt) {
      return "deleted";
    }
    return "found";
  },
});

export const remove = mutation({
  args: {
    deviceId: v.string(),
    userId: v.id("users"),
  },
  async handler(ctx, { deviceId, userId }) {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
      .first();
    if (!device || device.deletedAt) {
      throw new Error("Device not found or deleted!");
    }
    if (device.userId !== userId) {
      throw new Error("You are not authorized to delete this device!");
    }

    await ctx.db.patch(device._id, {
      deletedAt: Date.now(),
      lastAction: "deleted_device",
    });

    return { success: true };
  },
});

// Register device after authentication
export const registerDevice = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    platform: v.string(),
    arch: v.string(),
    username: v.string(),
    nodeVersion: v.string(),
    cliVersion: v.string(),
  },
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (existing && existing.deletedAt) {
      throw new Error("Device has been deleted");
    }

    const now = Date.now();

    if (existing) {
      // Update existing device
      await ctx.db.patch(existing._id, {
        ...args,
        lastAction: "updated",
        lastUsedAt: now,
      });
      return { deviceId: existing._id, updated: true };
    }

    // Create new device
    const newDeviceId = await ctx.db.insert("devices", {
      ...args,
      lastAction: "created",
      lastUsedAt: now,
    });

    return { deviceId: newDeviceId, updated: false };
  },
});

// List user's authenticated devices
export const listWithSessions = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, { userId }) {
    const devices = await ctx.db
      .query("devices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get active sessions for each device
    const userSessions = await ctx.db
      .query("cliSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "authenticated"))
      .collect();

    const sessionsByDevice = new Map<string, (typeof userSessions)[number]>();
    for (const session of userSessions) {
      if (
        !sessionsByDevice.has(session.deviceId) ||
        (sessionsByDevice.get(session.deviceId)?.lastUsedAt ?? 0) <
          session.lastUsedAt
      ) {
        sessionsByDevice.set(session.deviceId, session);
      }
    }

    const devicesWithSessions = devices.map((device) => {
      const activeSession = sessionsByDevice.get(device.deviceId);
      return {
        ...device,
        hasActiveSession: !!activeSession,
        lastSessionActivity: activeSession?.lastUsedAt,
      };
    });

    return devicesWithSessions;
  },
});
