/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as cli from "../cli.js";
import type * as devices from "../devices.js";
import type * as helpers from "../helpers.js";
import type * as projects from "../projects.js";
import type * as teams from "../teams.js";
import type * as users from "../users.js";
import type * as variables from "../variables.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  cli: typeof cli;
  devices: typeof devices;
  helpers: typeof helpers;
  projects: typeof projects;
  teams: typeof teams;
  users: typeof users;
  variables: typeof variables;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
