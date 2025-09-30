"use client";
import { ConvexProvider, ConvexReactClient } from "@envkit/db/env";
import { env } from "@/env";
import { type ReactNode } from "react";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
