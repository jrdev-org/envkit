export default async function ProjectPage({
  params,
}: {
  params: Promise<{
    projectId: string;
  }>;
}) {
  const { projectId } = await params;
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-center">Project {projectId}</h1>
    </div>
  );
}
