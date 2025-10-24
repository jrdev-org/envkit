import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env.local"),
});

export const env = createEnv({
  server: {
    CONVEX_URL: v.pipe(v.string(), v.url()),
    PORT: v.string(),
  },
  runtimeEnv: process.env,
});
