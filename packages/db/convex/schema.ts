import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- Core ---
  users: defineTable({
    authId: v.string(), // from auth provider
    name: v.string(),
    email: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"]),

  deletedUsers: defineTable({
    userId: v.id("users"),
    authId: v.string(),
    name: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    email: v.string(),
    createdAt: v.number(),
    deletedAt: v.number(),
  }).index("by_authId", ["authId"]),

  teams: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    lastAction: v.optional(v.string()),
    state: v.union(
      v.literal("active"),
      v.literal("deleted"),
      v.literal("suspended"),
      v.literal("full") // free-tier limit reached
    ),
    deletedAt: v.optional(v.number()),
    type: v.union(v.literal("personal"), v.literal("organization")),
    maxMembers: v.optional(v.number()), // use for tier limits (unlimited if undefined)
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_name", ["ownerId", "name"]),

  salts: defineTable({
    teamId: v.id("teams"),
    salt: v.string(),
  }).index("by_team", ["teamId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    removedAt: v.optional(v.number()),
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_and_user", ["teamId", "userId"]),

  // --- Projects ---
  projects: defineTable({
    name: v.string(),
    stage: v.string(),
    teamId: v.id("teams"), // always owned by a team
    // snapshot: just names and maybe last updated time
    variableSummary: v.array(
      v.object({
        name: v.string(),
        updatedAt: v.number(), // epoch millis
      })
    ),
    lastAction: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_and_name_and_stage", ["teamId", "name", "stage"]),

  variables: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    value: v.string(), // encrypted
    branch: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_name", ["projectId", "name"]),

  // --- Devices + CLI Sessions ---
  devices: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    platform: v.string(),
    arch: v.string(),
    username: v.string(),
    nodeVersion: v.string(),
    cliVersion: v.string(),
    lastUsedAt: v.number(),
    lastAction: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_deviceId", ["userId", "deviceId"])
    .index("by_deviceId", ["deviceId"]),

  cliSessions: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    permanentToken: v.optional(v.string()),
    tempToken: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("authenticated"),
      v.literal("revoked")
    ),
    revokedAt: v.optional(v.number()),
    expiresAt: v.number(),
    lastUsedAt: v.number(),
    lastAction: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_temp_token", ["tempToken"])
    .index("by_permanent_token", ["permanentToken"]),
});
