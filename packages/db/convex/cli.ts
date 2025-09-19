// convex/cli.ts - Updated with proper auth flow
import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

// Initialize CLI session (called when CLI starts auth process)
export const init = mutation({
  args: {
    deviceId: v.string(),
    userId: v.id("users"),
    userAgent: v.optional(v.string()),
    tempToken: v.string(),
  },
  async handler(ctx, args) {
    //get the userId
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Clean up any existing pending sessions for this device
    const existingSessions = await ctx.db
      .query("cliSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("deviceId"), args.deviceId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.patch(session._id, {
        status: "revoked",
        revokedAt: Date.now(),
      });
    }

    const sessionId = await ctx.db.insert("cliSessions", {
      tempToken: args.tempToken,
      deviceId: args.deviceId,
      userId: user._id,
      lastUsedAt: Date.now(),
      lastAction: "init",
      userAgent: args.userAgent,
      status: "pending",
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes for auth completion
    });

    const initialized = await ctx.db.get(sessionId);
    return { initialized, tempToken: args.tempToken };
  },
});

// Complete authentication (called from your web app after user signs in)
export const completeAuth = mutation({
  args: {
    sessionId: v.id("cliSessions"),
    userId: v.id("users"),
    tempToken: v.string(),
    permanentToken: v.string(),
  },
  async handler(ctx, args) {
    // Find pending session by deviceId
    const session = await ctx.db
      .query("cliSessions")
      .withIndex("by_temp_token", (q) =>
        q.eq("tempToken", args.tempToken.trim())
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!session || session._id !== args.sessionId) {
      throw new Error(
        "No pending session found for this device. Please try again."
      );
    }

    if (session.revokedAt) {
      await ctx.db.delete(session._id);
      throw new Error("Session revoked. Please try again.");
    }

    if (session.userId !== args.userId) {
      throw new Error("You are not authorized to modify this session!");
    }

    if (session.expiresAt < Date.now()) {
      await ctx.db.patch(session._id, {
        status: "revoked",
        revokedAt: Date.now(),
      });
      throw new Error("Session expired! Please try again.");
    }

    await ctx.db.patch(session._id, {
      userId: session.userId,
      tempToken: undefined,
      permanentToken: args.permanentToken.trim(),
      status: "authenticated",
      lastUsedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const otherSessions = await ctx.db
      .query("cliSessions")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("deviceId"), session.deviceId))
      .filter((q) => q.eq(q.field("status"), "authenticated"))
      .collect();
    for (const s of otherSessions) {
      if (s._id !== session._id) {
        await ctx.db.patch(s._id, {
          status: "revoked",
          revokedAt: Date.now(),
          lastAction: "superseded_by_new_auth",
        });
      }
    }

    const authenticated = await ctx.db.get(session._id);

    if (!authenticated) {
      throw new Error("Error authenticating CLI session. Please try again.");
    }
    return {
      authenticated,
      permanentToken: args.permanentToken,
    };
  },
});

// Validate CLI token for authenticated requests
export const validateToken = mutation({
  args: {
    permanentToken: v.string(),
  },
  async handler(ctx, { permanentToken }) {
    const session = await ctx.db
      .query("cliSessions")
      .withIndex("by_permanent_token", (q) =>
        q.eq("permanentToken", permanentToken)
      )
      .first();

    if (!session || session.status !== "authenticated") {
      return { valid: false, reason: "not_authenticated" };
    }

    if (session.expiresAt < Date.now()) {
      await ctx.db.patch(session._id, {
        status: "revoked",
        revokedAt: Date.now(),
      });
      return { valid: false, reason: "expired" };
    }

    // Update last used
    await ctx.db.patch(session._id, {
      lastUsedAt: Date.now(),
      lastAction: "validate_token",
    });

    return {
      valid: true,
      reason: "valid",
    };
  },
});

// Check session status (polled by CLI)
export const getSessionStatus = query({
  args: {
    sessionId: v.id("cliSessions"),
  },
  async handler(ctx, { sessionId }) {
    const session = await ctx.db.get(sessionId);

    if (!session) {
      return { status: "not_found" };
    }

    if (session.expiresAt < Date.now()) {
      return { status: "expired" };
    }

    if (session.status === "authenticated") {
      return {
        status: "authenticated",
        hasToken: !!session.tempToken,
      };
    }

    return { status: "pending" };
  },
});

// Alternative: Get session status by deviceId (if you prefer this approach)
export const getSessionByDevice = query({
  args: {
    deviceId: v.string(),
    userId: v.id("users"),
  },
  async handler(
    ctx,
    { deviceId, userId }
  ): Promise<{
    status: "not_found" | "expired" | "pending" | "authenticated";
  }> {
    const session = await ctx.db
      .query("cliSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deviceId"), deviceId))
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .first();

    if (!session) {
      return { status: "not_found" };
    }

    if (session.expiresAt < Date.now()) {
      return { status: "expired" };
    }

    if (session.status === "authenticated") {
      return {
        status: "authenticated",
      };
    }

    return { status: "pending" };
  },
});

// Revoke session (logout)
export const revokeSession = mutation({
  args: {
    sessionId: v.id("cliSessions"),
    userId: v.id("users"),
  },
  async handler(ctx, { sessionId, userId }) {
    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    if (session.userId !== userId) {
      throw new Error("You are not authorized to revoke this session!");
    }

    await ctx.db.patch(session._id, {
      status: "revoked",
      lastAction: "logout",
      revokedAt: Date.now(),
    });

    return { success: true };
  },
});

export const claimToken = mutation({
  args: {
    sessionId: v.id("cliSessions"),
    userId: v.id("users"),
  },
  async handler(ctx, { sessionId, userId }) {
    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    if (session.userId !== userId) {
      throw new Error("You are not authorized to claim this token!");
    }
    if (session.status !== "authenticated" || !session.tempToken) {
      throw new Error("No token to claim or session not authenticated.");
    }
    const token = session.tempToken;
    await ctx.db.patch(sessionId, { tempToken: undefined });
    return { token };
  },
});
