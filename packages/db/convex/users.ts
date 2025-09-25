import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const create = mutation({
  args: {
    authId: v.string(),
    name: v.string(),
    email: v.string(),
    salt: v.string(),
  },
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

    // 2) Create user
    const newUserId = await ctx.db.insert("users", {
      authId,
      tier: "free",
      name: args.name,
      email,
      updatedAt: Date.now(),
    });

    // 3) Create user's team
    const newTeamId = await ctx.db.insert("teams", {
      name: `${args.name.trim()}'s Team`,
      ownerId: newUserId,
      lastAction: "created",
      state: "active",
      type: "personal",
      maxMembers: 2,
      updatedAt: Date.now(),
    });

    // 4) create team salt
    await ctx.db.insert("salts", {
      teamId: newTeamId,
      salt: args.salt,
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
  args: {
    id: v.id("users"),
    newOwnerId: v.optional(v.id("users")),
    forceDeleteProjects: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    // TODO: Clean up related entities
    // - Remove from teamMembers
    const teamMemberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .collect();
    for (const teamMembership of teamMemberships) {
      await ctx.db.delete(teamMembership._id);
    }

    // - Handle team ownership transfer or deletion
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    if (args.newOwnerId) {
      // Transfer ownership
      const newOwner = await ctx.db.get(args.newOwnerId);
      if (!newOwner) {
        throw new Error("Invalid new owner");
      }

      for (const team of teams) {
        if (team.ownerId === user._id) {
          // Transfer ownership
          await ctx.db.patch(team._id, {
            ownerId: newOwner._id,
            lastAction: "team_transferred",
            updatedAt: Date.now(),
          });
        } else {
          // delete user projects
          const projects = await ctx.db
            .query("projects")
            .withIndex("by_team", (q) => q.eq("teamId", team._id))
            .collect();

          if (args.forceDeleteProjects) {
            for (const project of projects) {
              await ctx.db.delete(project._id);
            }
          } else {
            for (const project of projects) {
              await ctx.db.patch(project._id, {
                deletedAt: Date.now(),
                lastAction: "project_deleted",
                updatedAt: Date.now(),
              });
            }
          }

          // Delete team
          await ctx.db.patch(team._id, {
            state: "deleted",
            deletedAt: Date.now(),
            lastAction: "team_deleted",
            updatedAt: Date.now(),
          });
          // - Clean up associated salts
          const salts = await ctx.db
            .query("salts")
            .withIndex("by_team", (q) => q.eq("teamId", team._id))
            .collect();
          for (const salt of salts) {
            await ctx.db.delete(salt._id);
          }
        }
      }
    }

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
