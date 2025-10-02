import type { Team, Project } from "@/app/dashboard/page";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  userTeams?: Team[];
}

export default function ProjectCard({ project, userTeams }: ProjectCardProps) {
  const teamName =
    userTeams?.find((t) => t._id === project.teamId)?.name ?? "Loading...";

  return (
    <Link
      href={`/dashboard/projects/p-${project._id}`}
      className="rounded border border-gray-400 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex justify-between">
        <h3 className="mb-2 text-lg font-medium text-[#222222]">
          Name: {project.name}
        </h3>
        <p className="text-sm text-gray-600">
          Created at: {new Date(project._creationTime).toLocaleString()}
        </p>
      </div>
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">Stage: {project.stage}</p>
        <p className="text-sm text-gray-600">Team: {teamName}</p>
      </div>
    </Link>
  );
}
