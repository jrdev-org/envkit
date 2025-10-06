"use client";

import { useEffect, useState } from "react";
import LoadingPage from "@/components/loading-page";
import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { api, useMutation } from "@envkit/db/env";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const { isLoaded, user, isSignedIn } = useUser();
  const createUser = useMutation(api.users.create);
  const [created, setCreated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || created) return;

    async function initUser() {
      try {
        if (!isLoaded || !isSignedIn || created) return;
        await createUser({
          authId: user.id,
          name: user.fullName ?? user.firstName ?? "User",
          email: user.primaryEmailAddress?.emailAddress ?? "user@example.com",
        });
        setCreated(true);
      } catch (err) {
        console.error("User creation failed:", err);
      }
    }

    void initUser();
  }, [isLoaded, isSignedIn, user, created, createUser]);

  // redirect after success
  useEffect(() => {
    if (created) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [created, router]);

  if (!isLoaded) return <LoadingPage />;
  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/dashboard/onboarding`,
    });
  }

  if (!created) return <LoadingPage />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-4xl font-bold text-[#222222]">
        Onboarding Complete
      </h1>
      <p className="text-gray-700">
        You can now head to your{" "}
        <Link
          href="/dashboard"
          className="font-semibold text-[#131313] hover:underline"
        >
          Dashboard
        </Link>
        .
      </p>
    </div>
  );
}
