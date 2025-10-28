import { client } from "@api/index.js";
import { api, type Id } from "@envkit/db";
import { vValidator } from "@hono/valibot-validator";
import { Hono } from "hono";
import trySafely from "trysafely";
import * as v from "valibot";

const keys = new Hono()
	.post(
		"/create",
		vValidator(
			"json",
			v.object({
				teamId: v.string(),
				ownerId: v.string(),
				publicKey: v.string(),
			}),
		),
		async (c) => {
			const args = c.req.valid("json");
			const { data, err } = await trySafely(() =>
				client.mutation(api.keys.createOrUpdate, {
					teamId: args.teamId as Id<"teams">,
					ownerId: args.ownerId as Id<"users">,
					publicKey: args.publicKey,
				}),
			);
			if (err) {
				if (err.message.includes("not found")) {
					return c.json("Team not found", 404);
				}
				console.error(err);
				return c.json(err.message, 500);
			}

			return c.json(data, 200);
		},
	)
	.get(
		"/:teamId",
		vValidator("param", v.object({ teamId: v.string() })),
		async (c) => {
			const { teamId } = c.req.valid("param");
			const { data, err } = await trySafely(() =>
				client.query(api.keys.get, {
					teamId: teamId as Id<"teams">,
				}),
			);
			if (err) {
				if (err.message.includes("not found")) {
					return c.json("Team not found", 404);
				}
				console.error(err);
				return c.json(err.message, 500);
			}

			return c.json(data, 200);
		},
	)
	.delete(
		"/:teamId/:callerId",
		vValidator("param", v.object({ teamId: v.string(), callerId: v.string() })),
		async (c) => {
			const args = c.req.valid("param");
			const { data, err } = await trySafely(() =>
				client.mutation(api.keys.remove, {
					teamId: args.teamId as Id<"teams">,
					callerId: args.callerId as Id<"users">,
				}),
			);
			if (err) {
				if (err.message.includes("not found")) {
					return c.json("Team not found", 404);
				}
				console.error(err);
				return c.json(err.message, 500);
			}

			return c.json(data, 200);
		},
	);

export default keys;
