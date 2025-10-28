import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { getCaller, getTeamAuthorized } from "./helpers.js";

export const createPersonal = mutation({
	args: {
		ownerId: v.id("users"),
		authName: v.string(),
	},
	handler: async (ctx, args) => {
		const { ownerId, authName } = args;
		const owner = await getCaller({
			callerId: ownerId,
			ctx,
		});
		const name = `${authName}'s Team`;
		const existing = await ctx.db
			.query("teams")
			.withIndex("by_owner_and_name", (q) =>
				q.eq("ownerId", owner._id).eq("name", name),
			)
			.unique();
		if (existing) throw new Error(`Team named ${name} already exists!`);
		const now = Date.now();

		const teamId = await ctx.db.insert("teams", {
			name,
			ownerId: owner._id,
			state: "active",
			type: "personal",
			maxMembers: 1,
			updatedAt: now,
		});
		await ctx.db.insert("activities", {
			entityType: "team",
			entityId: teamId,
			userId: owner._id,
			activity: "team created",
			timestamp: now,
		});

		const newTeam = await ctx.db.get(teamId);
		if (!newTeam) throw new Error(`Team not found!`);

		// add user to team
		await ctx.db.insert("teamMembers", {
			teamId: teamId,
			userId: owner._id,
			role: "admin",
			allowedProjects: [],
			joinedAt: Date.now(),
			updatedAt: Date.now(),
		});
		return newTeam;
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		ownerId: v.id("users"),
		maxMembers: v.number(),
	},
	handler: async (ctx, args) => {
		const { name, ownerId, maxMembers } = args;
		const owner = await ctx.db.get(ownerId);
		if (!owner) throw new Error(`User not found!`);
		const existing = await ctx.db
			.query("teams")
			.withIndex("by_owner_and_name", (q) =>
				q.eq("ownerId", owner._id).eq("name", name),
			)
			.unique();
		if (existing) throw new Error(`Team named ${name} already exists!`);

		const now = Date.now();
		const teamId = await ctx.db.insert("teams", {
			name,
			ownerId: owner._id,
			state: "active",
			type: "personal",
			maxMembers,
			updatedAt: now,
		});
		await ctx.db.insert("activities", {
			entityType: "team",
			entityId: teamId,
			userId: owner._id,
			activity: "team created",
			timestamp: now,
		});

		const newTeam = await ctx.db.get(teamId);
		if (!newTeam) throw new Error(`Team ${teamId} not found!`);

		// add user to team
		await ctx.db.insert("teamMembers", {
			teamId: teamId,
			userId: owner._id,
			role: "admin",
			allowedProjects: [],
			joinedAt: Date.now(),
			updatedAt: Date.now(),
		});
		return newTeam;
	},
});

export const get = query({
	args: {
		teamId: v.id("teams"),
	},
	handler: async (ctx, args) => {
		const { teamId: id } = args;
		const existing = await ctx.db.get(id);
		if (!existing) throw new Error(`Team not found!`);
		return existing;
	},
});

export const getTeamAndProjects = query({
	args: {
		teamId: v.id("teams"),
		callerId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const { teamId: id, callerId } = args;
		const caller = await getCaller({
			callerId,
			ctx,
		});
		const existing = await ctx.db.get(id);
		if (!existing) throw new Error(`Team not found!`);
		const membership = await ctx.db
			.query("teamMembers")
			.withIndex("by_team_and_user", (q) =>
				q.eq("teamId", existing._id).eq("userId", caller._id),
			)
			.unique();
		if (!membership) throw new Error(`User not authorized!`);
		const projects = await ctx.db
			.query("projects")
			.withIndex("by_team", (q) => q.eq("teamId", existing._id))
			.collect();
		return { team: existing, projects };
	},
});

export const getDeleted = query({
	args: {
		userId: v.id("users"),
	},
	async handler(ctx, { userId }) {
		const owner = await getCaller({
			callerId: userId,
			ctx,
		});
		const deletedTeams = await ctx.db
			.query("teams")
			.withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
			.filter((q) => q.neq(q.field("deletedAt"), undefined))
			.collect();

		return deletedTeams;
	},
});

export const remove = mutation({
	args: {
		id: v.id("teams"),
		callerId: v.id("users"),
		purge: v.boolean(),
	},
	handler: async (ctx, args) => {
		const { id, purge, callerId } = args;
		const { user: caller, team: existing } = await getTeamAuthorized({
			teamId: id,
			callerId,
			ctx,
		});
		const now = Date.now();
		if (!purge) {
			await ctx.db.patch(existing._id, {
				deletedAt: now,
				state: "deleted",
				updatedAt: now,
			});
			await ctx.db.insert("activities", {
				entityType: "team",
				entityId: existing._id,
				userId: caller._id,
				activity: "team deleted",
				timestamp: now,
			});
			return { deleted: true, type: "soft" };
		}

		// delete team's projects
		const projects = await ctx.db
			.query("projects")
			.withIndex("by_team", (q) => q.eq("teamId", existing._id))
			.collect();
		for (const project of projects) {
			await ctx.db.delete(project._id);
		}
		// remove team's members
		const members = await ctx.db
			.query("teamMembers")
			.withIndex("by_team", (q) => q.eq("teamId", existing._id))
			.collect();
		for (const member of members) {
			await ctx.db.delete(member._id);
		}
		// remove team's keys
		const keys = await ctx.db
			.query("teamKeys")
			.withIndex("by_team", (q) => q.eq("teamId", existing._id))
			.collect();
		for (const key of keys) {
			await ctx.db.delete(key._id);
		}
		await ctx.db.delete(existing._id);

		return { deleted: true, type: "purge" };
	},
});

export const update = mutation({
	args: {
		id: v.id("teams"),
		callerId: v.id("users"),
		name: v.optional(v.string()),
		maxMembers: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { id, name, maxMembers, callerId } = args;
		const { user: caller, team: existing } = await getTeamAuthorized({
			teamId: id,
			callerId,
			ctx,
		});
		if (!name && !maxMembers) throw new Error("No changes to update!");
		if (name && existing.name === name) throw new Error("Pass in a new name!");
		if (maxMembers && existing.maxMembers === maxMembers)
			throw new Error("Pass in a new number of members!");

		const now = Date.now();
		await ctx.db.patch(id, {
			name: name ?? existing.name,
			maxMembers: maxMembers ?? existing.maxMembers,
			updatedAt: now,
		});
		await ctx.db.insert("activities", {
			entityType: "team",
			entityId: existing._id,
			userId: caller._id,
			activity: `team updated ${
				(name && "name") || (maxMembers && "maxMembers")
			}`,
			timestamp: now,
		});

		const updatedTeam = await ctx.db.get(existing._id);
		if (!updatedTeam) throw new Error(`Team not found!`);

		return { updatedTeam };
	},
});

export const invite = mutation({
	args: {
		teamId: v.id("teams"),
		callerId: v.id("users"),
		role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
		allowedProjects: v.array(v.id("projects")),
		email: v.string(),
	},
	handler: async (ctx, args) => {
		const { teamId, callerId, email, role, allowedProjects } = args;
		const { user: caller } = await getTeamAuthorized({
			callerId,
			teamId,
			ctx,
		});

		const existingInvitation = await ctx.db
			.query("teamInvitations")
			.withIndex("by_email", (q) => q.eq("email", email))
			.unique();
		if (existingInvitation)
			throw new Error(
				"Invitation already exists! We will resend the invitation email.",
			);

		const invitationToken = await ctx.db.insert("teamInvitations", {
			teamId,
			invitedBy: caller._id,
			allowedProjects,
			email,
			role,
			invitationToken: crypto.getRandomValues(new Uint8Array(16)).toString(),
		});

		const invitation = await ctx.db.get(invitationToken);
		if (!invitation) throw new Error("Invitation not found!");
		return { invitationCode: invitation.invitationToken };
	},
});

export const acceptInvitation = mutation({
	args: {
		invitationCode: v.string(),
		email: v.string(),
	},
	handler: async (ctx, args) => {
		const { invitationCode, email } = args;
		const invitation = await ctx.db
			.query("teamInvitations")
			.withIndex("by_invitation_and_email", (q) =>
				q.eq("invitationToken", invitationCode).eq("email", email),
			)
			.unique();
		if (!invitation) throw new Error(`Invitation not found!`);
		const team = await ctx.db.get(invitation.teamId);
		if (!team) throw new Error(`Team not found!`);
		const teamMembers = await ctx.db
			.query("teamMembers")
			.withIndex("by_team", (q) => q.eq("teamId", team._id))
			.collect();
		if (teamMembers.length >= team.maxMembers)
			throw new Error("Team is full! Please upgrade your plan.");
		const now = Date.now();
		// check if user exists
		let user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", email))
			.unique();
		if (!user) {
			const newUserId = await ctx.db.insert("users", {
				email,
				tier: "free",
				updatedAt: now,
			});
			user = await ctx.db.get(newUserId);
			if (!user) throw new Error(`User not found!`);
		}
		await ctx.db.patch(team._id, {
			updatedAt: now,
		});
		await ctx.db.insert("activities", {
			entityType: "team",
			entityId: team._id,
			userId: invitation.invitedBy,
			activity: `invited new user ${user.email} to team`,
			timestamp: now,
		});

		// delete the invitation
		await ctx.db.delete(invitation._id);

		return { team };
	},
});

export const removeMember = mutation({
	args: {
		memberId: v.id("teamMembers"),
		callerId: v.id("users"),
	},
	handler: async (ctx, { memberId, callerId }) => {
		const membership = await ctx.db.get(memberId);
		if (!membership) throw new Error(`Membership not found!`);
		const member = await ctx.db.get(membership.userId);
		if (!member) throw new Error(`Member not found!`);
		const { team, user: caller } = await getTeamAuthorized({
			callerId,
			teamId: membership.teamId,
			ctx,
		});
		const now = Date.now();
		await ctx.db.delete(memberId);
		await ctx.db.patch(team._id, {
			updatedAt: now,
		});
		await ctx.db.insert("activities", {
			entityType: "team",
			entityId: team._id,
			userId: caller._id,
			activity: `removed member ${member.email} from team`,
			timestamp: now,
		});

		return { team };
	},
});
