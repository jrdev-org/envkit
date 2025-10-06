"use client";
import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { api, useQuery, type Id } from "@envkit/db/env";
import type { Team, User } from "../page";
import { toast } from "sonner";
import TeamCard from "@/components/team-card";
import LoadingPage from "@/components/loading-page";
import Link from "next/link";

export default function TeamsPage() {
  const { isLoaded, user, isSignedIn } = useUser();

  const dbUser = useQuery(
    api.users.get,
    user ? { authId: user.id } : "skip",
  ) as unknown as User;

  const ownedTeams = useQuery(
    api.teams.listByOwner,
    dbUser?._id ? { userId: dbUser._id } : "skip",
  ) as unknown as {
    team: Team;
    role: string;
    members: number;
  }[];

  const memberTeams = useQuery(
    api.teams.listByMembership,
    dbUser?._id ? { userId: dbUser._id } : "skip",
  ) as unknown as {
    team: Team;
    role: string;
    members: number;
  }[];

  if (!isLoaded || !user || !dbUser || !ownedTeams || !memberTeams) {
    return <LoadingPage />;
  }

  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/dashboard/teams`,
    });
  }

  const hasOwnedTeams = ownedTeams.length > 0;
  const hasMemberTeams = memberTeams.length > 0;

  return (
    <main className="flex min-h-screen flex-col gap-8 p-4">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between px-6 pt-6">
        <h1 className="text-3xl font-bold text-[#222222]">Teams</h1>
        <Link
          href={`/dashboard/teams/new?ownerId=${dbUser._id}`}
          className="cursor-pointer rounded-md bg-[#131313] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#353535]"
        >
          Create New Team
        </Link>
      </header>

      {/* Owned Teams Section */}
      <section className="px-6">
        <h2 className="mb-3 text-xl font-semibold text-[#1e1e1e]">
          Your Teams
        </h2>
        {hasOwnedTeams ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {ownedTeams.map((team) => (
              <TeamCard
                key={team.team._id}
                team={team.team}
                role="Owner"
                members={team.members}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            You don’t own any teams yet.{" "}
            <Link
              href={`/dashboard/teams/new?ownerId=${dbUser._id}`}
              className="text-[#131313] underline hover:text-[#353535]"
            >
              Create one
            </Link>{" "}
            to get started.
          </p>
        )}
      </section>

      {/* Member Teams Section */}
      <section className="px-6">
        <h2 className="mb-3 text-xl font-semibold text-[#1e1e1e]">
          Teams You’re In
        </h2>
        {hasMemberTeams ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberTeams.map((item) => (
              <TeamCard
                key={item.team._id}
                team={item.team}
                role={item.role}
                members={item.members}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            You’re not part of any other teams yet.
          </p>
        )}
      </section>
    </main>
  );
}
