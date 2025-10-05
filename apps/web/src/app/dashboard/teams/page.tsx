"use client";
import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { api, useQuery, type Id } from "@envkit/db/env";
import type { Team, User } from "../page";
import { toast } from "sonner";
import TeamCard from "@/components/team-card";
import LoadingPage from "@/components/loading-page";

export default function TeamsPage() {
  const { isLoaded, user, isSignedIn } = useUser();

  const dbUser = useQuery(
    api.users.get,
    user ? { authId: user.id } : "skip",
  ) as unknown as User;

  const teams = useQuery(
    api.teams.listByMembership,
    dbUser?._id ? { userId: dbUser._id } : "skip",
  ) as unknown as {
    team: Team;
    role: string;
    members: number;
  }[];

  // Handle loading state
  if (!isLoaded || !user || !teams || dbUser === undefined) {
    return <LoadingPage />;
  }

  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/dashboard/teams`,
    });
  }

  const hasTeams = teams.length > 0;

  return (
    <main className="flex min-h-screen flex-col gap-6 p-4">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between px-6 pt-6">
        <div>
          <h1 className="text-3xl font-bold text-[#222222]">Teams</h1>
        </div>
        <button
          className="cursor-pointer rounded-md bg-[#131313] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#353535]"
          onClick={() => {
            toast("Team created successfully!", {
              action: {
                label: "Undo",
                onClick: () => toast.dismiss(),
              },
            });
          }}
        >
          Create New Team
        </button>
      </header>

      {/* Content */}
      {hasTeams ? (
        teams.map((team) => (
          <TeamCard
            key={team.team._id}
            team={team.team}
            role={team.role}
            members={team.members}
          />
        ))
      ) : (
        <div className="px-6">
          <p>You don't have any teams yet. Create one to get started!</p>
        </div>
      )}
    </main>
  );
}
