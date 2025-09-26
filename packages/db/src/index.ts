import { api } from "../convex/_generated/api.js";
import { type Id } from "../convex/_generated/dataModel.js";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
dotenv.config();

export const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

type Ok<T> = { data: T };
type Err = { error: string };
type Result<T> = Ok<T> | Err;

function typeSafeCall<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<Result<TReturn>> {
  return async (...args: TArgs): Promise<Result<TReturn>> => {
    try {
      const data = await fn(...args);
      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  };
}

export function safeCall<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>> | { error: string }> => {
    try {
      return await fn(...args);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  };
}

const dbApi = {
  users: {
    get: async (authId: string) => {
      return await convex.query(api.users.get, { authId });
    },
    create: async (
      authId: string,
      name: string,
      email: string,
      salt: string
    ) => {
      const { newUserId, newTeamId } = await convex.mutation(api.users.create, {
        authId,
        salt,
        name,
        email,
      });
      return { newUserId, newTeamId };
    },
    update: async (id: Id<"users">, opts: Record<string, unknown>) => {
      return await convex.mutation(api.users.updateUser, { id, opts });
    },
    remove: async (id: Id<"users">) => {
      return await convex.mutation(api.users.remove, { id });
    },
  },
  teams: {
    get: async (id: Id<"users">) => {
      return await convex.query(api.teams.get, { id });
    },
    getInactive: async (ownerId: Id<"users">) => {
      return await convex.query(api.teams.getInactive, { ownerId });
    },
    getByName: async (ownerId: Id<"users">, name: string) => {
      return await convex.query(api.teams.getByName, { ownerId, name });
    },
    create: async (name: string, ownerId: Id<"users">, salt: string) => {
      return await convex.mutation(api.teams.create, { name, ownerId, salt });
    },
    update: async (id: Id<"teams">, name: string) => {
      return await convex.mutation(api.teams.update, { id, name });
    },
    remove: async (id: Id<"teams">, ownerId: Id<"users">) => {
      return await convex.mutation(api.teams.remove, { id, ownerId });
    },
    restore: async (id: Id<"teams">, ownerId: Id<"users">) => {
      return await convex.mutation(api.teams.restore, { id, ownerId });
    },
    getMembers: async (id: Id<"teams">) => {
      return await convex.query(api.teams.getMembers, { id });
    },
    addMember: async (
      id: Id<"teams">,
      email: string,
      role: "admin" | "member" | "viewer"
    ) => {
      return await convex.mutation(api.teams.addMember, { id, email, role });
    },
    removeMember: async (
      id: Id<"teams">,
      userId: Id<"users">,
      actingUserId: Id<"users">
    ) => {
      return await convex.mutation(api.teams.removeMember, {
        id,
        userId,
        actingUserId,
      });
    },
  },
  projects: {
    getVars: async (
      projectId: Id<"projects">,
      localHash: string,
      branch?: string
    ) => {
      return await convex.query(api.projects.getVars, {
        projectId,
        branch,
        localHash,
      });
    },
    addVars: async (
      projectId: Id<"projects">,
      callerId: Id<"users">,
      vars: Array<{
        name: string;
        value: string;
      }>
    ) => {
      return await convex.mutation(api.projects.addVars, {
        projectId,
        callerId,
        vars,
      });
    },
    create: async (name: string, stage: string, teamId: Id<"teams">) => {
      return await convex.mutation(api.projects.create, {
        name,
        stage,
        teamId,
      });
    },
    list: async (teamId: Id<"teams">) => {
      return await convex.query(api.projects.list, { teamId });
    },
    get: async (id: Id<"projects">) => {
      return await convex.query(api.projects.get, { projectId: id });
    },
    rename: async (
      userId: Id<"users">,
      teamId: Id<"teams">,
      stage: string,
      projectId: Id<"projects">,
      newName: string
    ) => {
      return await convex.mutation(api.projects.rename, {
        userId,
        teamId,
        stage,
        projectId,
        newName,
      });
    },
    remove: async (
      userId: Id<"users">,
      teamId: Id<"teams">,
      projectId: Id<"projects">,
      force: boolean
    ) => {
      return await convex.mutation(api.projects.remove, {
        userId,
        teamId,
        projectId,
        force,
      });
    },
  },
  variables: {
    create: async (
      projectId: Id<"projects">,
      name: string,
      encrypted: string,
      branch?: string
    ) => {
      return await convex.mutation(api.variables.create, {
        projectId,
        name,
        encryptedValue: encrypted,
        branch,
      });
    },
    update: async (
      projectId: Id<"projects">,
      name: string,
      value: string,
      branch?: string
    ) => {
      return await convex.mutation(api.variables.update, {
        projectId,
        name,
        value,
        branch,
      });
    },
    delete: async (
      projectId: Id<"projects">,
      name: string,
      branch?: string
    ) => {
      return await convex.mutation(api.variables.deleteVariable, {
        projectId,
        name,
        branch,
      });
    },
  },
  devices: {
    get: async (deviceId: string, userId: Id<"users">) => {
      return await convex.query(api.devices.get, { deviceId, userId });
    },
    getById: async (deviceId: string) => {
      return await convex.query(api.devices.getById, { deviceId });
    },
    remove: async (deviceId: string, userId: Id<"users">) => {
      return await convex.mutation(api.devices.remove, { deviceId, userId });
    },
    register: async (args: {
      userId: Id<"users">;
      deviceId: string;
      deviceName: string;
      platform: string;
      arch: string;
      username: string;
      nodeVersion: string;
      cliVersion: string;
    }) => {
      return await convex.mutation(api.devices.registerDevice, args);
    },
    listWithSessions: async (userId: Id<"users">) => {
      return await convex.query(api.devices.listWithSessions, { userId });
    },
  },
  cli: {
    init: async (args: {
      deviceId: string;
      userId: Id<"users">;
      userAgent?: string;
      tempToken: string;
    }) => {
      return await convex.mutation(api.cli.init, args);
    },
    completeAuth: async (args: {
      sessionId: Id<"cliSessions">;
      userId: Id<"users">;
      tempToken: string;
      permanentToken: string;
    }) => {
      return await convex.mutation(api.cli.completeAuth, args);
    },
    getSessionStatus: async (sessionId: Id<"cliSessions">) => {
      return await convex.query(api.cli.getSessionStatus, { sessionId });
    },
    getSessionByDevice: async (deviceId: string, userId: Id<"users">) => {
      return await convex.query(api.cli.getSessionByDevice, {
        deviceId,
        userId,
      });
    },
    validateToken: async (permanentToken: string) => {
      return await convex.mutation(api.cli.validateToken, { permanentToken });
    },
    revokeSession: async (
      sessionId: Id<"cliSessions">,
      userId: Id<"users">
    ) => {
      return await convex.mutation(api.cli.revokeSession, {
        sessionId,
        userId,
      });
    },
    claimToken: async (sessionId: Id<"cliSessions">, userId: Id<"users">) => {
      return await convex.mutation(api.cli.claimToken, { sessionId, userId });
    },
  },
};

export function createConvexClient(convexUrl: string) {
  return new ConvexHttpClient(convexUrl);
}

export { dbApi, typeSafeCall, ConvexHttpClient };
