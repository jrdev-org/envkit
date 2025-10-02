"use client";
import { api, useQuery, type Id } from "@envkit/db/env";
import { use } from "react";
import type { Project, Variable } from "../../page";
import LoadingPage from "@/components/loading-page";
import { toast } from "sonner";
import { useState } from "react";
import { Copy, CopyIcon, LucideEye } from "lucide-react";

export default function ProjectPage({
  params,
}: {
  params: Promise<{
    projectId: string;
  }>;
}) {
  const projectId = use(params).projectId.split("-")[1] as Id<"projects">;
  const project = useQuery(api.projects.get, {
    projectId,
  }) as unknown as Project;
  if (!project) return <LoadingPage />;

  return (
    <main className="flex min-h-screen flex-col bg-[#f9f9f9] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">{project.name}</h1>
          <p className="text-sm text-[#555555]">
            Stage: {project.stage} | Team ID: {project.teamId}
          </p>
          <p className="text-xs text-[#888888]">
            Created at: {new Date(project._creationTime).toLocaleString()}
          </p>
        </div>
        <button
          className="rounded-md bg-[#222222] px-4 py-2 text-sm font-medium text-[#fff] transition-colors hover:bg-[#333333]"
          onClick={() => toast("Add Variable clicked")}
        >
          Add Variable
        </button>
      </div>

      {/* Variables List */}
      <ProjectVariablesList variables={project.variableSummary} />
    </main>
  );
}

function ProjectVariablesList({
  variables,
}: {
  variables: { name: string; updatedAt: number }[];
}) {
  const [copyAllLoading, setCopyAllLoading] = useState(false);

  const handleCopyAll = () => {
    setCopyAllLoading(true);
    const allVars = variables.map((v) => `${v.name}: <value>`).join("\n");
    navigator.clipboard.writeText(allVars);
    toast.success("All variables copied!");
    setCopyAllLoading(false);
  };

  const handleCopy = ({ v }: { v: { name: string; updatedAt: number } }) => {
    navigator.clipboard.writeText(`${v.name}: <value>`);
    toast.success(`Copied ${v.name}`);
  };

  const handlePeek = ({ v }: { v: { name: string; updatedAt: number } }) => {
    toast(`Peek ${v.name}: <value>`);
  };

  if (variables.length === 0) {
    return (
      <div className="rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm">
        <p className="text-sm text-[#555555]">No variables defined yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#222222]">Variables</h2>
        <button
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#5f5d5d] px-5 py-2 text-xs font-medium text-[#fff] transition-colors hover:bg-[#333333]"
          onClick={handleCopyAll}
          disabled={copyAllLoading}
        >
          <CopyIcon className="h-6 w-6" />
          {copyAllLoading ? "Copying..." : "Copy All"}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {variables.map((v) => (
          <li
            key={v.name}
            className="flex items-center justify-between rounded-md border border-[#e0e0e0] bg-[#f9f9f9] px-3 py-2"
          >
            <span className="text-sm text-[#222222]">{v.name}</span>
            <div className="flex gap-2">
              <button
                className="cursor-pointer rounded bg-[#222222] px-4 py-2 text-xs text-[#fff] hover:bg-[#333333]"
                onClick={() => handlePeek({ v })}
                title="Peek"
              >
                <LucideEye className="h-4 w-4" />
              </button>
              <button
                className="cursor-pointer rounded bg-[#222222] px-4 py-2 text-xs text-[#fff] hover:bg-[#333333]"
                onClick={() => handleCopy({ v })}
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
