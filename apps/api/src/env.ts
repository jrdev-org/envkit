import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import * as v from "valibot";

dotenv.config({
  path: path.join(process.cwd(), ".env.local"),
});

export const env = createEnv({
  server: {
    CONVEX_URL: v.pipe(v.string(), v.url()),
    PORT: v.string(),
  },
  clientPrefix: "CLIENT_",
  client: {
    CLIENT_NODE_ENV: v.picklist(["development", "production"]),
  },
  runtimeEnv: process.env,
});
