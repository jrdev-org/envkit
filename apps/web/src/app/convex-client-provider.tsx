"use client";
import { env } from "@/env.js";
import { ConvexProvider, ConvexReactClient } from "@envkit/db";
import { type ReactNode } from "react";

const convex = new ConvexReactClient(env.CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
