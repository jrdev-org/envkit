import type { AppType } from "@envkit/api";
import { hc } from "hono/client";

const client = hc<AppType>("https://localhost:8787");

const apiClient = {
  projects: client.api.v1.projects,
  users: client.api.v1.users,
  tokens: client.api.v1.tokens,
  cli: client.api.v1.cli,
  devices: client.api.v1.devices,
  teams: client.api.v1.teams,
};

export const api = apiClient;
