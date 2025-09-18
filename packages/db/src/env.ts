import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";
import dotenv from "dotenv";
export {
  ConvexProvider,
  ConvexReactClient,
  useQuery,
  useMutation,
  useAction,
} from "convex/react";
export { api } from "@/convex/_generated/api.js";
export { type Id } from "@/convex/_generated/dataModel.js";
dotenv.config();

enum Env {
  Development = "development",
  Production = "production",
}

const envName = process.env.NODE_ENV as Env;

if (envName === Env.Development) {
  console.log("Running in development mode");
} else if (envName === Env.Production) {
  console.log("Running in production mode");
} else {
  throw new Error(`Unknown environment: ${envName}`);
}

export const env = createEnv({
  server: {
    CONVEX_URL: v.pipe(v.string(), v.url()),
    NODE_ENV: v.enum(Env),
    ENCRYPTION_PEPPER: v.string(),
  },
  runtimeEnv: {
    CONVEX_URL: process.env.CONVEX_URL,
    NODE_ENV: process.env.NODE_ENV,
    ENCRYPTION_PEPPER: process.env.ENCRYPTION_PEPPER,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_VALIDATION,
});
