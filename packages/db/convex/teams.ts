import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (user === null) {
      throw new Error(`User not found.`);
    }

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .filter((q) => q.eq(q.field("state"), "active"))
      .collect();

    teams.sort((a, b) => a.name.localeCompare(b.name));
    return teams;
  },
});

export const getInactive = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.ownerId);
    if (owner === null) {
      throw new Error(`Owner not found.`);
    }

    const fullTeams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .filter((q) => q.eq(q.field("state"), "full"))
      .collect();

    const suspendedTeams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .filter((q) => q.eq(q.field("state"), "suspended"))
      .collect();

    const deletedTeams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .filter((q) => q.eq(q.field("state"), "deleted"))
      .collect();

    return {
      full: fullTeams,
      suspended: suspendedTeams,
      deleted: deletedTeams,
    };
  },
});

export const getByName = query({
  args: { ownerId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.ownerId);
    if (owner === null) {
      throw new Error(`Owner not found.`);
    }

    const name = args.name.trim();

    const team = await ctx.db
      .query("teams")
      .withIndex("by_owner_and_name", (q) =>
        q.eq("ownerId", owner._id).eq("name", name)
      )
      .first();

    if (team === null || team.state === "deleted") {
      throw new Error(`Team not found.`);
    }
    return team;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    ownerId: v.id("users"),
    salt: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.ownerId);
    if (owner === null) {
      throw new Error(`Owner not found.`);
    }

    // check if team already exists
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_owner_and_name", (q) =>
        q.eq("ownerId", owner._id).eq("name", args.name)
      )
      .first();

    if (existing !== null && existing.state !== "deleted") {
      throw new Error(`Team already exists.`);
    }

    const newTeamId = await ctx.db.insert("teams", {
      name: args.name,
      ownerId: owner._id,
      type: "organization",
      maxMembers: owner.tier === "free" ? 5 : undefined,
      lastAction: "created",
      state: "active",
      updatedAt: Date.now(),
    });

    // create team salt
    await ctx.db.insert("salts", {
      teamId: newTeamId,
      salt: args.salt,
    });

    return await ctx.db.get(newTeamId);
  },
});

export const getSalt = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (team === null) {
      throw new Error(`Team not found.`);
    }

    return await ctx.db
      .query("salts")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .first()
      .then((row) => {
        if (row === null) {
          throw new Error(`Team salt not found.`);
        }
        return row.salt;
      });
  },
});

export const update = mutation({
  args: { id: v.id("teams"), name: v.string() },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (team === null || team.state === "deleted") {
      throw new Error(`Team not found.`);
    }

    const name = args.name.trim();

    await ctx.db.patch(args.id, {
      name,
      lastAction: "updated",
      updatedAt: Date.now(),
    });

    return { ...team, name, lastAction: "updated", updatedAt: Date.now() };
  },
});

export const remove = mutation({
  args: { id: v.id("teams"), ownerId: v.id("users") },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.ownerId);
    if (owner === null) {
      throw new Error("Owner not found.");
    }

    const team = await ctx.db.get(args.id);
    if (team === null) {
      throw new Error("Team not found.");
    }

    if (team.ownerId !== owner._id) {
      throw new Error("Not authorized.");
    }

    // Soft-delete: mark state as deleted
    await ctx.db.patch(team._id, {
      state: "deleted",
      deletedAt: Date.now(),
      lastAction: "team_deleted",
      updatedAt: Date.now(),
    });

    return team;
  },
});

export const restore = mutation({
  args: { id: v.id("teams"), ownerId: v.id("users") },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.ownerId);
    if (owner === null) {
      throw new Error("Owner not found.");
    }

    const team = await ctx.db.get(args.id);
    if (team === null) {
      throw new Error("Team not found.");
    }

    if (team.state !== "deleted") {
      throw new Error("Team is not deleted.");
    }
    if (team.ownerId !== owner._id) {
      throw new Error("Not authorized.");
    }

    await ctx.db.patch(team._id, {
      state: "active",
      lastAction: "team_restored",
      deletedAt: undefined,
      updatedAt: Date.now(),
    });

    return team;
  },
});

export const getMembers = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (team === null) {
      throw new Error("Team not found.");
    }

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();

    return members.filter((m) => m.removedAt === undefined);
  },
});

export const addMember = mutation({
  args: {
    id: v.id("teams"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (team === null) {
      throw new Error("Team not found.");
    }

    const email = args.email.trim().toLowerCase();

    // check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser === null) {
      throw new Error("User doesn't exist.");
    }

    // check if user is already a member of the team
    const existingMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", team._id).eq("userId", existingUser._id)
      )
      .first();

    if (existingMember !== null && existingMember.removedAt === undefined) {
      throw new Error(`User is already ${existingMember.role}.`);
    }

    if (typeof team.maxMembers === "number") {
      const activeCount = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect()
        .then((rows) => rows.filter((m) => m.removedAt === undefined).length);

      if (activeCount >= team.maxMembers) {
        throw new Error("Team member limit reached");
      }
    }

    await ctx.db.insert("teamMembers", {
      teamId: args.id,
      userId: existingUser._id,
      role: args.role,
      joinedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return team;
  },
});

export const removeMember = mutation({
  args: {
    id: v.id("teams"),
    userId: v.id("users"),
    actingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (team === null) {
      throw new Error("Team not found.");
    }

    if (args.actingUserId !== args.userId) {
      const actingUserMember = await ctx.db
        .query("teamMembers")
        .withIndex("by_team_and_user", (q) =>
          q.eq("teamId", args.id).eq("userId", args.actingUserId)
        )
        .first();

      if (!actingUserMember || actingUserMember.role !== "admin") {
        throw new Error("Only admins can remove other members.");
      }
    }

    const teamMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.id).eq("userId", args.userId)
      )
      .first();

    if (teamMember === null) {
      throw new Error("User is not a member of this team.");
    }

    if (teamMember.teamId !== team._id) {
      throw new Error("Membership does not belong to this team.");
    }

    if (teamMember.userId === team.ownerId) {
      throw new Error("You cannot remove the team owner.");
    }

    await ctx.db.patch(teamMember._id, {
      removedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return team;
  },
});
