import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { tokenAndHash } from "./helpers.js";

export const create = mutation({
  args: { authId: v.string(), name: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const authId = args.authId.trim();
    const email = args.email.trim().toLowerCase();

    // 1) Prefer lookup by authId.
    const existingByAuth = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (existingByAuth !== null) {
      throw new Error(`User already exists.`);
    }

    // 1.5 then lookup by email.
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existingByEmail !== null) {
      throw new Error(`User already exists.`);
    }

    // 2) Generate a new salt
    const { token: salt, tokenHash: teamSalt } = await tokenAndHash();

    // 3) Create user
    const newUserId = await ctx.db.insert("users", {
      authId,
      salt,
      tier: "free",
      name: args.name,
      email,
      updatedAt: Date.now(),
    });

    // 4) Create user's team
    const newTeamId = await ctx.db.insert("teams", {
      name: `${args.name.trim()}'s Team`,
      ownerId: newUserId,
      salt: teamSalt,
      lastAction: "created",
      state: "active",
      type: "personal",
      maxMembers: 2,
      updatedAt: Date.now(),
    });

    // 5 add user to team
    await ctx.db.insert("teamMembers", {
      teamId: newTeamId,
      userId: newUserId,
      role: "admin",
      joinedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { newUserId, newTeamId };
  },
});

export const get = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (!user) throw new Error("User not found");
    return user;
  },
});

export const updateUser = mutation({
  args: {
    id: v.id("users"),
    opts: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        tier: v.optional(v.union(v.literal("free"), v.literal("pro"))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    if (!args.opts || Object.keys(args.opts).length === 0) return user;

    const patch: Record<string, unknown> = { ...args.opts };

    if (typeof patch.email === "string") {
      const normalizedEmail = (patch.email as string).trim().toLowerCase();
      // Only check if email is actually changing
      if (normalizedEmail !== user.email) {
        const conflict = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
          .first();
        if (conflict && conflict._id !== user._id) {
          throw new Error("Email already in use");
        }
      }
      patch.email = normalizedEmail;
    }

    // Remove undefined keys so you don't overwrite existing data
    for (const key in patch) {
      // eslint-disable-next-line no-prototype-builtins
      if (
        Object.prototype.hasOwnProperty.call(patch, key) &&
        patch[key] === undefined
      ) {
        delete patch[key];
      }
    }

    patch.updatedAt = Date.now();

    await ctx.db.patch(args.id, patch);

    // Return the updated user (merge view)
    return { ...user, ...patch };
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    // add user to deletedUsers table
    await ctx.db.insert("deletedUsers", {
      userId: user._id,
      authId: user.authId,
      name: user.name,
      email: user.email,
      tier: user.tier,
      createdAt: user._creationTime,
      deletedAt: Date.now(),
    });

    await ctx.db.delete(args.id);

    return user;
  },
});
