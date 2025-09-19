import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

export const env = createEnv({
  server: {
    CONVEX_URL: v.pipe(v.string(), v.url()),
    NODE_ENV: v.string(),
    ENCRYPTION_PEPPER: v.string(),
  },
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_WEB_APP_URL: v.pipe(v.string(), v.url()),
  },
  runtimeEnv: {
    CONVEX_URL: process.env.CONVEX_URL,
    PUBLIC_WEB_APP_URL: process.env.PUBLIC_WEB_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    ENCRYPTION_PEPPER: process.env.ENCRYPTION_PEPPER,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_VALIDATION,
});
