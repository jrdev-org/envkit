import LoadingSpinner from "./spinner";

export default function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <LoadingSpinner />
    </div>
  );
}
