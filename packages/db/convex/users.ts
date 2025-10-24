import { mutation, query } from "../convex/_generated/server.js";
import { v } from "convex/values";
import { getCaller } from "./helpers.js";

export const create = mutation({
  args: {
    email: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const { email, tier } = args;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error(`User already exists!`);

    const userId = await ctx.db.insert("users", {
      email,
      tier,
      updatedAt: Date.now(),
    });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found!");
    return user;
  },
});

export const get = query({
  args: {
    userId: v.id("users"),
  },
  async handler({ db }, { userId }) {
    const user = await db.get(userId);
    if (!user) throw new Error("User not found!");
    return user;
  },
});

export const upgrade = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { email } = args;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!existing) throw new Error(`User not found!`);
    if (existing.tier === "pro")
      throw new Error("User already has a pro account!");

    await ctx.db.patch(existing._id, {
      tier: "pro",
      updatedAt: Date.now(),
    });

    const user = await ctx.db.get(existing._id);
    if (!user) throw new Error("User not found!");
    return user;
  },
});

export const remove = mutation({
  args: {
    userId: v.id("users"),
    purge: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, purge } = args;
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error(`User not found!`);

    if (purge) {
      // remove user's teams
      const teams = await ctx.db
        .query("teams")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      for (const team of teams) {
        // remove user's projects
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();
        for (const project of projects) {
          // remove user's variables
          const variables = await ctx.db
            .query("variables")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();
          for (const variable of variables) {
            await ctx.db.delete(variable._id);
          }
          await ctx.db.delete(project._id);
        }
        await ctx.db.delete(team._id);
      }
      // remove user's sharetokens
      const shares = await ctx.db
        .query("shareTokens")
        .withIndex("by_creator", (q) => q.eq("createdBy", userId))
        .collect();
      for (const share of shares) {
        await ctx.db.delete(share._id);
      }
      // remove user's devices
      const devices = await ctx.db
        .query("devices")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      for (const device of devices) {
        // remove user's cli sessions
        const cliSessions = await ctx.db
          .query("cliSessions")
          .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
          .collect();
        for (const cliSession of cliSessions) {
          await ctx.db.delete(cliSession._id);
        }
        await ctx.db.delete(device._id);
      }
      await ctx.db.delete(existing._id);
      return { deleted: true, type: "purge" };
    }

    await ctx.db.insert("deletedUsers", {
      userId: existing._id,
      tier: existing.tier,
      email: existing.email,
      createdAt: existing._creationTime,
      deletedAt: Date.now(),
    });
    return { deleted: true, type: "soft" };
  },
});

export const getShareTokens = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error(`User not found!`);

    const shareTokens = await ctx.db
      .query("shareTokens")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .collect();
    return shareTokens;
  },
});

export const getDevices = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error(`User not found!`);

    const devices = await ctx.db
      .query("devices")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    return devices;
  },
});

export const getCliSessions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error(`User not found!`);

    const devices = await ctx.db
      .query("devices")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const cliSessions = [];
    for (const device of devices) {
      const sessions = await ctx.db
        .query("cliSessions")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
        .collect();
      cliSessions.push(...sessions);
    }
    return cliSessions;
  },
});

export const getPersonalTeam = query({
  args: {
    userId: v.id("users"),
  },
  handler: async ({ db }, { userId }) => {
    const user = await db.get(userId);
    if (!user) throw new Error("User not found!");
    const team = await db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .filter((q) => q.eq(q.field("type"), "personal"))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    if (!team) throw new Error("Team not found!");

    return team;
  },
});

export const getOwnedTeams = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error(`User not found!`);

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    return teams;
  },
});

export const getOwnedProjects = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error(`User not found!`);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return projects;
  },
});

export const getMemberTeams = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error(`User not found!`);

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const teams = [];
    for (const membership of memberships) {
      const team = await ctx.db.get(membership.teamId);
      if (team)
        teams.push({
          id: team._id,
          name: team.name,
          role: membership.role,
          projects: membership.allowedProjects,
          activities: team.activities,
          jonedAt: membership.joinedAt,
          updatedAt: team.updatedAt,
        });
    }
    return teams;
  },
});

export const getMemberProjects = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error(`User not found!`);

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const projects = [];
    for (const membership of memberships) {
      for (const projectId of membership.allowedProjects) {
        const project = await ctx.db.get(projectId);
        if (project)
          projects.push({
            id: project._id,
            name: project.name,
            activities: project.activities,
            updatedAt: project.updatedAt,
            role: membership.role,
          });
      }
    }
    return projects;
  },
});

export const getOwnedDevices = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, { userId }) {
    const user = await getCaller({ callerId: userId, ctx });
    const devices = await ctx.db
      .query("devices")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return devices;
  },
});
