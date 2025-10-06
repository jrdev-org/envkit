"use client";

import LoadingPage from "@/components/loading-page";
import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { api, useMutation } from "@envkit/db/env";
import Link from "next/link";

export default function OnboardingPage() {
  const { isLoaded, user, isSignedIn } = useUser();
  const createUser = useMutation(api.users.create);
  if (!isLoaded) return <LoadingPage />;
  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/dashboard/onboarding`,
    });
  }
  const dbUser = createUser({
    authId: user.id,
    name: user.fullName ?? user.firstName ?? "User",
    email: user.primaryEmailAddress?.emailAddress ?? "user@example.com",
  });
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-[#222222]">Onboarding Complete</h1>
      <p>
        You can now head to the
        <Link href={"/dashboard"}>Dashboard</Link>
      </p>
    </div>
  );
}
