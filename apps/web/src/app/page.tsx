// app/page.tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="h-[200%] w-[200%] animate-[pulse_8s_ease-in-out_infinite_alternate] bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.15),transparent_60%)]" />
    </div>
  );
}

function BranchingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto mb-6 h-16 w-16 text-green-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M6 3v12" />
      <circle cx="6" cy="3" r="2" />
      <circle cx="6" cy="15" r="2" />
      <circle cx="18" cy="9" r="2" />
      <path d="M6 9h8" />
    </svg>
  );
}

function StagingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto mb-6 h-16 w-16 text-green-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto mb-6 h-16 w-16 text-green-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <circle cx="12" cy="16" r="3" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-black text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-green-800 bg-gradient-to-r from-black via-gray-900 to-black px-8 py-4">
        <div className="text-2xl font-bold text-green-400">envkit</div>
        <nav className="flex items-center gap-6">
          <a href="/docs" className="text-sm hover:text-green-400">
            Docs
          </a>
          <a
            href="https://github.com/"
            className="text-sm hover:text-green-400"
          >
            GitHub
          </a>
          <a href="/pricing" className="text-sm hover:text-green-400">
            Pricing
          </a>
          <Button
            asChild
            className="bg-green-600 text-black hover:bg-green-500"
          >
            <a href="/signup">Sign Up</a>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-black via-gray-950 to-black px-8 text-center">
        <AnimatedBackground />
        <h1 className="mb-6 bg-gradient-to-r from-green-400 to-green-200 bg-clip-text text-6xl font-extrabold text-transparent md:text-7xl">
          stop emailing envs
        </h1>
        <p className="mb-12 max-w-xl text-xl text-gray-400">
          Manage environment variables without friction. Sync, branch, and stage
          with a single CLI.
        </p>
        <Card className="mb-12 w-full max-w-2xl rounded-xl border border-green-800 bg-black/80 p-6 text-left font-mono text-sm text-green-400 shadow-lg shadow-green-900/30">
          <pre>
            <code>
              $ envkit vars pull --stage prod
              {"\n"}✔ Environment variables synced
            </code>
          </pre>
        </Card>
        <div className="flex gap-4">
          <Button
            asChild
            size="lg"
            className="bg-green-600 text-black hover:bg-green-500"
          >
            <a href="/signup">Sign Up Free</a>
          </Button>
          <a href="/docs" className="mt-2 text-sm text-green-400 underline">
            Read the Docs
          </a>
        </div>
      </section>

      {/* Team Collaboration */}
      <section className="px-8 py-20 text-center">
        <TeamIcon />
        <h2 className="mb-4 text-2xl font-bold text-green-400">
          Built for teams
        </h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Share environment variables securely across your team. No more manual
          syncs or outdated <code>.env</code> files.
        </p>
      </section>

      {/* Branching */}
      <section className="bg-gradient-to-r from-gray-950 via-black to-gray-950 px-8 py-20 text-center">
        <BranchingIcon />
        <h2 className="mb-4 text-2xl font-bold text-green-400">
          Branch your configs
        </h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Create isolated environments per feature branch. Keep dev, staging,
          and production configs aligned but independent.
        </p>
      </section>

      {/* Staging Support */}
      <section className="px-8 py-20 text-center">
        <StagingIcon />
        <h2 className="mb-4 text-2xl font-bold text-green-400">
          Staging made simple
        </h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Pull exactly what you need for any stage. Switch between environments
          instantly with a single flag.
        </p>
      </section>

      {/* Why envkit */}
      <section className="bg-gradient-to-r from-gray-950 via-black to-gray-950 px-8 py-20 text-center">
        <h2 className="mb-8 text-2xl font-bold text-green-400">Why envkit</h2>
        <ul className="mx-auto grid max-w-2xl gap-4 text-gray-300">
          <li>✔ Secure by default</li>
          <li>✔ CLI-first, works in any stack</li>
          <li>✔ Zero config onboarding</li>
        </ul>
      </section>

      {/* Footer Call to Action */}
      <footer className="border-t border-green-800 bg-black px-8 py-20 text-center">
        <h2 className="mb-6 text-3xl font-bold text-green-400">
          Start syncing in seconds
        </h2>
        <Button
          asChild
          size="lg"
          className="bg-green-600 text-black hover:bg-green-500"
        >
          <a href="/signup">Sign Up Free</a>
        </Button>
        <div className="mt-6 flex justify-center gap-6 text-sm text-gray-400">
          <a href="/docs" className="hover:text-green-400">
            Docs
          </a>
          <a href="https://github.com/" className="hover:text-green-400">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
