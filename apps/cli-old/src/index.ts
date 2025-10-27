// biome-ignore lint/style/useImportType: the imports are used with typeof to get the types
import {
  cli as cliApp,
  devices as devicesApp,
  projects as projectsApp,
  teams as teamsApp,
  tokens as tokensApp,
  users as usersApp,
} from "@envkit/api";
import { hc } from "hono/client";

const teamsClient = hc<typeof teamsApp>("https://localhost:8787/teams");
const cliClient = hc<typeof cliApp>("https://localhost:8787/cli");
const devicesClient = hc<typeof devicesApp>("https://localhost:8787/devices");
const projectsClient = hc<typeof projectsApp>(
  "https://localhost:8787/projects"
);
const tokensClient = hc<typeof tokensApp>("https://localhost:8787/tokens");
const usersClient = hc<typeof usersApp>("https://localhost:8787/users");

const apiClient = {
  teams: teamsClient,
  cli: cliClient,
  devices: devicesClient,
  projects: projectsClient,
  tokens: tokensClient,
  users: usersClient,
};

export const api = apiClient;
