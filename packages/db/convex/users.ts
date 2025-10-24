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
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found!");

    const tokens = await ctx.db
      .query("shareTokens")
      .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
      .collect();

    const tokensWithActivities = await Promise.all(
      tokens.map(async (token) => {
        const activities = await ctx.db
          .query("activities")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "token").eq("entityId", token._id)
          )
          .collect();

        return {
          ...token,
          activities: activities.map((a) => ({
            entityType: a.entityType,
            activity: a.activity,
            timestamp: a.timestamp,
            userId: a.userId,
          })),
        };
      })
    );

    return tokensWithActivities;
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
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found!");

    const devices = await ctx.db
      .query("devices")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const allSessions = [];
    for (const device of devices) {
      const sessions = await ctx.db
        .query("cliSessions")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
        .collect();

      const sessionsWithActivities = await Promise.all(
        sessions.map(async (session) => {
          const activities = await ctx.db
            .query("activities")
            .withIndex("by_entity", (q) =>
              q.eq("entityType", "cliSession").eq("entityId", session._id)
            )
            .collect();

          return {
            ...session,
            activities: activities.map((a) => ({
              entityType: a.entityType,
              activity: a.activity,
              timestamp: a.timestamp,
            })),
          };
        })
      );

      allSessions.push(...sessionsWithActivities);
    }

    return allSessions;
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
    const teamActivities = await db
      .query("activities")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "team").eq("entityId", team._id)
      )
      .collect();

    return {
      ...team,
      activities: teamActivities.map((a) => ({
        entityType: a.entityType,
        activity: a.activity,
        timestamp: a.timestamp,
      })),
    };
  },
});

export const getOwnedTeams = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error(`User not found!`);

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const teamsWithActivities = await Promise.all(
      teams.map(async (team) => {
        const activities = await ctx.db
          .query("activities")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "team").eq("entityId", team._id)
          )
          .collect();

        return {
          ...team,
          activities: activities.map((a) => ({
            entityType: a.entityType,
            activity: a.activity,
            timestamp: a.timestamp,
          })),
        };
      })
    );

    return teamsWithActivities;
  },
});

export const getOwnedProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found!");

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const projectsWithActivities = await Promise.all(
      projects.map(async (project) => {
        const activities = await ctx.db
          .query("activities")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "project").eq("entityId", project._id)
          )
          .collect();

        return {
          ...project,
          activities: activities.map((a) => ({
            entityType: a.entityType,
            activity: a.activity,
            timestamp: a.timestamp,
            userId: a.userId,
          })),
        };
      })
    );

    return projectsWithActivities;
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
      if (team) {
        const teamActivities = await ctx.db
          .query("activities")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "team").eq("entityId", team._id)
          )
          .collect();

        teams.push({
          id: team._id,
          name: team.name,
          role: membership.role,
          projects: membership.allowedProjects,
          activities: teamActivities.map((a) => {
            return {
              entityType: a.entityType,
              activity: a.activity,
              timestamp: a.timestamp,
            };
          }),
          jonedAt: membership.joinedAt,
          updatedAt: team.updatedAt,
        });
      }
    }
    return teams;
  },
});

export const getMemberProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found!");

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const projects: any[] = [];

    for (const membership of memberships) {
      for (const projectId of membership.allowedProjects) {
        const project = await ctx.db.get(projectId);
        if (!project) continue;

        const activities = await ctx.db
          .query("activities")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "project").eq("entityId", project._id)
          )
          .collect();

        projects.push({
          ...project,
          activities: activities.map((a) => ({
            entityType: a.entityType,
            activity: a.activity,
            timestamp: a.timestamp,
          })),
          role: membership.role,
        });
      }
    }

    return projects;
  },
});

export const getOwnedDevices = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await getCaller({ callerId: userId, ctx });

    const devices = await ctx.db
      .query("devices")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const devicesWithActivities = await Promise.all(
      devices.map(async (device) => {
        const activities = await ctx.db
          .query("activities")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "device").eq("entityId", device._id)
          )
          .collect();

        return {
          ...device,
          activities: activities.map((a) => ({
            entityType: a.entityType,
            activity: a.activity,
            timestamp: a.timestamp,
          })),
        };
      })
    );

    return devicesWithActivities;
  },
});
