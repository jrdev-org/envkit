"use client";
import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { api, useQuery, type Id } from "@envkit/db/env";
import LoadingSpinner from "@/components/spinner";
import type { ShareToken, User } from "../page";
import ShareTokenCard from "@/components/token-card";

export default function ShareTokensPage() {
  const { isLoaded, user, isSignedIn } = useUser();

  const dbUser = useQuery(
    api.users.get,
    user ? { authId: user.id } : "skip",
  ) as unknown as User;

  const shareTokens = useQuery(
    api.tokens.listByUser,
    dbUser?._id ? { userId: dbUser._id } : "skip",
  ) as unknown as ShareToken[];

  // Handle loading state
  if (!isLoaded || !shareTokens || dbUser === undefined) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/dashboard/share-tokens`,
    });
  }
  return (
    <main className="flex min-h-screen flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Share Tokens</h1>
      <div className="flex flex-col gap-4">
        {shareTokens.map((token) => (
          <ShareTokenCard key={token._id} token={token} />
        ))}
      </div>
    </main>
  );
}
