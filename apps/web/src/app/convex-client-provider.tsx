"use client";
import { ConvexProvider, ConvexReactClient } from "@envkit/db/env";
import { type ReactNode } from "react";

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set");
}

const convex = new ConvexReactClient(process.env.CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
