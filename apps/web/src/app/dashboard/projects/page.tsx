"use client";
import { useUser } from "@clerk/nextjs";
import { api, useQuery } from "@envkit/db/env";
import type { Project, Team, User } from "../page";
import { toast } from "sonner";
import ProjectCard from "@/components/project-card";
import LoadingPage from "@/components/loading-page";

export default function ProjectsPage() {
  const { isLoaded, user, isSignedIn } = useUser();
  const dbUser = useQuery(api.users.get, {
    authId: user ? user.id : "skip",
  }) as User | undefined;
  const data = useQuery(api.projects.listByUser, {
    userId: dbUser?._id ?? ("skip" as any),
  }) as unknown as
    | { personalProjects: Project[]; organizationProjects: Project[] }
    | undefined;
  const userTeams = useQuery(api.teams.get, {
    id: dbUser?._id ?? ("skip" as any),
  }) as unknown as Team[] | undefined;

  if (!isLoaded || !dbUser || !data || !userTeams) return <LoadingPage />;

  if (!isSignedIn) return <div>Not signed in</div>;

  const { personalProjects, organizationProjects } = data;

  const hasPersonalProjects = personalProjects.length > 0;
  const hasOrgProjects = organizationProjects.length > 0;

  return (
    <main className="flex min-h-screen flex-col gap-6 p-4">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between px-6 pt-6">
        <div>
          <h1 className="text-3xl font-bold text-[#222222]">Projects</h1>
        </div>
        <button
          className="cursor-pointer rounded-md bg-[#131313] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#353535]"
          onClick={() => {
            toast("Project created successfully!", {
              action: {
                label: "Undo",
                onClick: () => toast.dismiss(),
              },
            });
          }}
        >
          Create New Project
        </button>
      </header>

      {/* Content */}
      <div className="px-6">
        {/* Personal Projects Section */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-[#222222]">
            Personal Projects
          </h2>
          {hasPersonalProjects ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personalProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  userTeams={userTeams}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-500">
                No personal projects yet. Create your first project to get
                started!
              </p>
            </div>
          )}
        </section>

        {/* Organization Projects Section */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[#222222]">
            Organization Projects
          </h2>
          {hasOrgProjects ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizationProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  userTeams={userTeams}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-500">
                No organization projects yet. Create or join an organization to
                collaborate!
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
