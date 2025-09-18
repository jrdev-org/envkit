import { api } from "../convex/_generated/api.js";
import { type Id } from "../convex/_generated/dataModel.js";
import { ConvexHttpClient } from "convex/browser";
import { env } from "./env.js";

export const convex = new ConvexHttpClient(env.CONVEX_URL);

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
    get: safeCall(async (authId: string) => {
      return await convex.query(api.users.get, { authId });
    }),
    create: safeCall(
      async (authId: string, name: string, email: string, salt: string) => {
        const { newUserId, newTeamId } = await convex.mutation(
          api.users.create,
          {
            authId,
            salt,
            name,
            email,
          }
        );
        return { newUserId, newTeamId };
      }
    ),
    update: safeCall(async (id: Id<"users">, opts: Record<string, unknown>) => {
      return await convex.mutation(api.users.updateUser, { id, opts });
    }),
    remove: safeCall(async (id: Id<"users">) => {
      return await convex.mutation(api.users.remove, { id });
    }),
  },
  teams: {
    get: safeCall(async (id: Id<"users">) => {
      return await convex.query(api.teams.get, { id });
    }),
    getInactive: safeCall(async (ownerId: Id<"users">) => {
      return await convex.query(api.teams.getInactive, { ownerId });
    }),
    getByName: safeCall(async (ownerId: Id<"users">, name: string) => {
      return await convex.query(api.teams.getByName, { ownerId, name });
    }),
    create: safeCall(
      async (name: string, ownerId: Id<"users">, salt: string) => {
        return await convex.mutation(api.teams.create, { name, ownerId, salt });
      }
    ),
    update: safeCall(async (id: Id<"teams">, name: string) => {
      return await convex.mutation(api.teams.update, { id, name });
    }),
    remove: safeCall(async (id: Id<"teams">, ownerId: Id<"users">) => {
      return await convex.mutation(api.teams.remove, { id, ownerId });
    }),
    restore: safeCall(async (id: Id<"teams">, ownerId: Id<"users">) => {
      return await convex.mutation(api.teams.restore, { id, ownerId });
    }),
    getMembers: safeCall(async (id: Id<"teams">) => {
      return await convex.query(api.teams.getMembers, { id });
    }),
    addMember: safeCall(
      async (
        id: Id<"teams">,
        email: string,
        role: "admin" | "member" | "viewer"
      ) => {
        return await convex.mutation(api.teams.addMember, { id, email, role });
      }
    ),
    removeMember: safeCall(
      async (
        id: Id<"teams">,
        userId: Id<"users">,
        actingUserId: Id<"users">
      ) => {
        return await convex.mutation(api.teams.removeMember, {
          id,
          userId,
          actingUserId,
        });
      }
    ),
  },
  projects: {
    create: safeCall(
      async (name: string, stage: string, teamId: Id<"teams">) => {
        return await convex.mutation(api.projects.create, {
          name,
          stage,
          teamId,
        });
      }
    ),
    list: safeCall(async (teamId: Id<"teams">) => {
      return await convex.query(api.projects.list, { teamId });
    }),
    get: safeCall(async (id: Id<"projects">) => {
      return await convex.query(api.projects.get, { projectId: id });
    }),
    rename: safeCall(
      async (
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
      }
    ),
    remove: safeCall(
      async (
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
      }
    ),
  },
  variables: {
    get: safeCall(async (projectId: Id<"projects">, branch?: string) => {
      return await convex.query(api.variables.get, { projectId, branch });
    }),
    getProjectAndVars: safeCall(
      async (projectId: Id<"projects">, branch?: string) => {
        return await convex.query(api.variables.getProjectAndVars, {
          projectId,
          branch,
        });
      }
    ),
    create: safeCall(
      async (
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
      }
    ),
    update: safeCall(
      async (
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
      }
    ),
    delete: safeCall(
      async (projectId: Id<"projects">, name: string, branch?: string) => {
        return await convex.mutation(api.variables.deleteVariable, {
          projectId,
          name,
          branch,
        });
      }
    ),
  },
  devices: {
    get: safeCall(async (deviceId: string, userId: Id<"users">) => {
      return await convex.query(api.devices.get, { deviceId, userId });
    }),
    remove: safeCall(async (deviceId: string, userId: Id<"users">) => {
      return await convex.mutation(api.devices.remove, { deviceId, userId });
    }),
    register: safeCall(
      async (args: {
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
      }
    ),
    listWithSessions: safeCall(async (userId: Id<"users">) => {
      return await convex.query(api.devices.listWithSessions, { userId });
    }),
  },
  cli: {
    init: safeCall(
      async (args: {
        deviceId: string;
        userId: Id<"users">;
        userAgent: string;
      }) => {
        return await convex.mutation(api.cli.init, args);
      }
    ),
    completeAuth: safeCall(
      async (args: {
        sessionId: Id<"cliSessions">;
        userId: Id<"users">;
        token: string;
      }) => {
        return await convex.mutation(api.cli.completeAuth, args);
      }
    ),
    getSessionStatus: safeCall(async (sessionId: Id<"cliSessions">) => {
      return await convex.query(api.cli.getSessionStatus, { sessionId });
    }),
    getSessionByDevice: safeCall(
      async (deviceId: string, userId: Id<"users">) => {
        return await convex.query(api.cli.getSessionByDevice, {
          deviceId,
          userId,
        });
      }
    ),
    validateToken: safeCall(async (token: string) => {
      return await convex.mutation(api.cli.validateToken, { token });
    }),
    revokeSession: safeCall(
      async (sessionId: Id<"cliSessions">, userId: Id<"users">) => {
        return await convex.mutation(api.cli.revokeSession, {
          sessionId,
          userId,
        });
      }
    ),
    claimToken: safeCall(
      async (sessionId: Id<"cliSessions">, userId: Id<"users">) => {
        return await convex.mutation(api.cli.claimToken, { sessionId, userId });
      }
    ),
  },
};

export { dbApi, typeSafeCall };
