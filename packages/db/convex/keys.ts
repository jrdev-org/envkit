import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { getCaller, getTeamAuthorized } from "./helpers.js";

// Create or update public key metadata
export const createOrUpdate = mutation({
	args: {
		teamId: v.id("teams"),
		ownerId: v.id("users"),
		publicKey: v.string(),
	},
	handler: async (ctx, args) => {
		const { teamId, publicKey, ownerId } = args;
		const owner = await getCaller({ callerId: ownerId, ctx });
		const existingKey = await ctx.db
			.query("teamKeys")
			.withIndex("by_team", (q) => q.eq("teamId", teamId))
			.unique();
		const now = Date.now();
		if (!existingKey) {
			const keyId = await ctx.db.insert("teamKeys", {
				teamId,
				ownerId: owner._id,
				publicKey,
			});
			await ctx.db.insert("activities", {
				entityType: "team",
				entityId: teamId,
				userId: owner._id,
				activity: "created team key",
				timestamp: now,
			});

			const newkey = await ctx.db.get(keyId);
			if (!newkey) throw new Error(`Team key not found!`);
			return { key: newkey };
		}
		if (existingKey.ownerId !== owner._id)
			throw new Error("You do not have permission to update this team!");
		await ctx.db.patch(existingKey._id, {
			publicKey,
		});
		await ctx.db.insert("activities", {
			entityType: "team",
			entityId: teamId,
			userId: owner._id,
			activity: "updated team key",
			timestamp: now,
		});
		const updatedKey = await ctx.db.get(existingKey._id);
		if (!updatedKey) throw new Error(`Team key not found!`);
		return { key: updatedKey };
	},
});

// Get key metadata (for joining members)

export const get = query({
	args: {
		teamId: v.id("teams"),
	},
	handler: async (ctx, args) => {
		const { teamId } = args;
		const existing = await ctx.db.get(teamId);
		if (!existing) throw new Error(`Team not found!`);
		const key = await ctx.db
			.query("teamKeys")
			.withIndex("by_team", (q) => q.eq("teamId", teamId))
			.unique();
		if (!key) throw new Error(`Team key not found!`);
		return { key };
	},
});

// Delete key metadata
export const remove = mutation({
	args: {
		teamId: v.id("teams"),
		callerId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const { teamId, callerId } = args;
		const { user: caller } = await getTeamAuthorized({
			teamId,
			callerId,
			ctx,
		});
		const now = Date.now();
		const key = await ctx.db
			.query("teamKeys")
			.withIndex("by_team", (q) => q.eq("teamId", teamId))
			.unique();
		if (!key) throw new Error(`Team key not found!`);
		await ctx.db.delete(key._id);
		await ctx.db.insert("activities", {
			entityType: "team",
			entityId: teamId,
			userId: caller._id,
			activity: "deleted team key",
			timestamp: now,
		});
		return { deleted: true, type: "soft" };
	},
});
