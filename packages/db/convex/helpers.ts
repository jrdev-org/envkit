import type { DataModel, Id } from "./_generated/dataModel.js";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";

type Ctx = GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>;

export async function getCaller({
  ctx,
  callerId,
}: {
  ctx: Ctx;
  callerId: Id<"users">;
}) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_id", (q) => q.eq("_id", callerId))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}

export async function getProjectAuthorized({
  ctx,
  callerId,
  projectId,
}: {
  ctx: Ctx;
  callerId: Id<"users">;
  projectId: Id<"projects">;
}) {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_id", (q) => q.eq("_id", projectId))
    .first();
  if (!project) throw new Error("Project not found");
  const user = await getCaller({ ctx, callerId });
  if (!user) throw new Error("User not found");

  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) =>
      q.eq("teamId", project.teamId).eq("userId", user._id)
    )
    .first();
  if (!membership) throw new Error("User not a member of project");

  const allowedProjects = new Set(membership.allowedProjects);
  const authorized =
    membership.role === "admin" ||
    project.ownerId === user._id ||
    allowedProjects.has(projectId);

  if (!authorized) throw new Error("User not authorized");

  return {
    user: {
      ...user,
      role: membership.role,
      owner: project.ownerId === user._id,
    },
    project,
  };
}

export async function getTeamAuthorized({
  ctx,
  callerId,
  teamId,
}: {
  ctx: Ctx;
  callerId: Id<"users">;
  teamId: Id<"teams">;
}) {
  const team = await ctx.db
    .query("teams")
    .withIndex("by_id", (q) => q.eq("_id", teamId))
    .first();
  if (!team) throw new Error("Team not found");
  const user = await getCaller({ ctx, callerId });
  if (!user) throw new Error("User not found");

  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) =>
      q.eq("teamId", teamId).eq("userId", user._id)
    )
    .first();
  if (!membership) throw new Error("User not a member of team");

  const authorized = membership.role === "admin" || team.ownerId === user._id;

  if (!authorized) throw new Error("User not authorized");
  return {
    user: {
      ...user,
      role: membership.role,
      owner: team.ownerId === user._id,
    },
    team,
  };
}
