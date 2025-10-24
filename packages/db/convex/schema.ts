import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- Core ---
  users: defineTable({
    email: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  deletedUsers: defineTable({
    userId: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    email: v.string(),
    createdAt: v.number(),
    deletedAt: v.number(),
  }).index("by_email", ["email"]),

  teams: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    activities: v.array(
      v.object({
        userId: v.id("users"),
        activity: v.string(),
        timestamp: v.number(),
      }),
    ),
    state: v.union(
      v.literal("active"),
      v.literal("deleted"),
      v.literal("suspended"),
      v.literal("full"), // free-tier limit reached
    ),
    deletedAt: v.optional(v.number()),
    type: v.union(v.literal("personal"), v.literal("organization")),
    maxMembers: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_name", ["ownerId", "name"]),

  teamInvitations: defineTable({
    teamId: v.id("teams"),
    invitedBy: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    allowedProjects: v.array(v.id("projects")),
    email: v.string(),
    invitationToken: v.string(),
  })
    .index("by_team", ["teamId"])
    .index("by_invitation_and_email", ["invitationToken", "email"])
    .index("by_email", ["email"]),

  salts: defineTable({
    teamId: v.id("teams"),
    saltHash: v.string(),
  }).index("by_team", ["teamId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    allowedProjects: v.array(v.id("projects")),
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_and_user", ["teamId", "userId"]),

  // --- Projects ---
  projects: defineTable({
    name: v.string(),
    teamId: v.id("teams"), // always owned by a team
    ownerId: v.id("users"),
    activities: v.array(
      v.object({
        userId: v.id("users"),
        activity: v.string(),
        timestamp: v.number(),
      }),
    ),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_owner", ["ownerId"])
    .index("by_team_and_name", ["teamId", "name"]),

  // --- Project Share Tokens ---
  shareTokens: defineTable({
    projectId: v.id("projects"),
    createdBy: v.id("users"), // who issued the share
    stage: v.union(
      v.literal("development"),
      v.literal("production"),
      v.literal("staging"),
    ),
    tokenHash: v.string(), // cleared on use/expiry
    allowLink: v.boolean(), // whether recipients can persist
    expiresAt: v.number(), // when the token expires
    singleUse: v.boolean(), // whether to clear after use
    // helpful for auditing
    lastAccessedBy: v.array(
      v.object({
        userId: v.id("users"),
        timestamp: v.number(),
      }),
    ),
  })
    .index("by_token_hash", ["tokenHash"]) // lookup until cleared
    .index("by_stage", ["stage"])
    .index("by_project", ["projectId"])
    .index("by_creator", ["createdBy"]),

  variables: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    value: v.string(), // encrypted
    stage: v.union(
      v.literal("development"),
      v.literal("production"),
      v.literal("staging"),
    ),
    previousValue: v.array(
      v.object({
        updatedBy: v.id("users"),
        value: v.string(),
        updatedAt: v.number(),
      }),
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_stage", ["projectId", "stage"])
    .index("by_project_and_name", ["projectId", "name"]),

  // --- Devices + CLI Sessions ---
  devices: defineTable({
    ownerId: v.id("users"),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    platform: v.string(),
    arch: v.string(),
    username: v.string(),
    nodeVersion: v.string(),
    cliVersion: v.string(),
    activities: v.array(
      v.object({
        userId: v.id("users"),
        activity: v.string(),
        timestamp: v.number(),
      }),
    ),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_deviceId", ["ownerId", "deviceId"])
    .index("by_deviceId", ["deviceId"]),

  cliSessions: defineTable({
    deviceId: v.id("devices"),
    authTokenHash: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("authenticated"),
      v.literal("revoked"),
    ),
    revokedAt: v.optional(v.number()),
    expiresAt: v.number(),
    userAgent: v.optional(v.string()),
    activities: v.array(
      v.object({
        userId: v.id("users"),
        activity: v.string(),
        timestamp: v.number(),
      }),
    ),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_authTokenHash", ["authTokenHash"]),
});

// TODO: Move activities into a separate entity
