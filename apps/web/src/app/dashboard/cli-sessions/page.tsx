"use client";
import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { api, useQuery, type Id } from "@envkit/db/env";
import LoadingSpinner from "@/components/spinner";
import type { CliSession, User } from "../page";
import CliSessionCard from "@/components/cli-card";

export default function CliPage() {
  const { isLoaded, user, isSignedIn } = useUser();

  const dbUser = useQuery(
    api.users.get,
    user ? { authId: user.id } : "skip",
  ) as unknown as User;

  const cliSessions = useQuery(
    api.cli.listByUser,
    dbUser?._id ? { userId: dbUser._id } : "skip",
  ) as unknown as CliSession[];

  // Handle loading state
  if (!isLoaded || !cliSessions || dbUser === undefined) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/dashboard/cli`,
    });
  }
  return (
    <main className="flex min-h-screen flex-col gap-6 p-4">
      {/* Header */}
      <div className="my-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Envkit CLI Sessions
        </h1>
        <p className="text-gray-600">Manage your connected CLI sessions</p>
      </div>
      {/* Content */}
      <div className="px-6">
        {/* Devices List */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Active CLI Sessions
          </h2>
          {cliSessions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cliSessions.map((cliSession) => (
                <CliSessionCard key={cliSession._id} cliSession={cliSession} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-500">
                No active CLI sessions yet. Start a new session to view it here!
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
