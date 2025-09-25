"use client";
import { Button } from "@/components/ui/button";

function BranchingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto mb-6 h-14 w-14 text-gray-700"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
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
      className="mx-auto mb-6 h-14 w-14 text-gray-700"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="3" y="4" width="18" height="4" />
      <rect x="3" y="10" width="18" height="4" />
      <rect x="3" y="16" width="18" height="4" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto mb-6 h-14 w-14 text-gray-700"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <circle cx="12" cy="16" r="3" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main
      className="flex min-h-screen flex-col font-serif text-gray-800"
      style={{
        backgroundImage: "url('/image(1).png')",
        backgroundRepeat: "repeat",
        // backgroundSize: "800px 800px",
      }}
    >
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-10 flex items-center justify-between border-b border-gray-400 px-8 py-3 backdrop-blur-sm">
        <div className="text-xl font-extrabold tracking-wide text-gray-800 uppercase">
          envkit
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <a href="/docs" className="hover:underline">
            Docs
          </a>
          <a href="https://github.com/" className="hover:underline">
            GitHub
          </a>
          <a href="/pricing" className="hover:underline">
            Pricing
          </a>
          <Button
            asChild
            className="rounded-none border border-gray-700 bg-[#f8f6f1] px-4 py-1 text-sm font-semibold text-gray-900 hover:bg-[#e0dbd0]"
          >
            <a href="/signup">Sign Up</a>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-6 text-5xl font-black tracking-tight text-gray-900 md:text-6xl">
          Stop Emailing Envs
        </h1>
        <p className="mb-8 max-w-xl text-lg leading-relaxed text-gray-700">
          Manage environment variables without friction. Sync, branch, and stage
          with a single CLI.
        </p>
        <pre className="mb-10 w-full max-w-2xl border border-gray-500 p-4 text-left text-sm text-gray-800 shadow-md">
          {`$ envkit vars pull --stage prod
✔ Environment variables synced`}
        </pre>
        <div className="flex gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-none border border-gray-700 bg-[#f8f6f1] px-6 py-2 font-bold text-gray-900 hover:bg-[#e0dbd0]"
          >
            <a href="/signup">Sign Up Free</a>
          </Button>
          <a
            href="/docs"
            className="mt-2 text-sm text-gray-700 underline hover:text-gray-900"
          >
            Read the Docs
          </a>
        </div>
      </section>

      {/* Team Collaboration */}
      <section className="px-8 py-20 text-center">
        <TeamIcon />
        <h2 className="mb-4 text-xl font-bold tracking-wide text-gray-900 uppercase">
          Built for teams
        </h2>
        <p className="mx-auto max-w-2xl leading-relaxed text-gray-700">
          Share environment variables securely across your team. No more manual
          syncs or outdated <code>.env</code> files.
        </p>
      </section>

      {/* Branching */}
      <section className="border-y border-gray-400 px-8 py-20 text-center">
        <BranchingIcon />
        <h2 className="mb-4 text-xl font-bold tracking-wide text-gray-900 uppercase">
          Branch your configs
        </h2>
        <p className="mx-auto max-w-2xl leading-relaxed text-gray-700">
          Create isolated environments per feature branch. Keep dev, staging,
          and production configs aligned but independent.
        </p>
      </section>

      {/* Staging Support */}
      <section className="px-8 py-20 text-center">
        <StagingIcon />
        <h2 className="mb-4 text-xl font-bold tracking-wide text-gray-900 uppercase">
          Staging made simple
        </h2>
        <p className="mx-auto max-w-2xl leading-relaxed text-gray-700">
          Pull exactly what you need for any stage. Switch between environments
          instantly with a single flag.
        </p>
      </section>

      {/* Why envkit */}
      <section className="border-y border-gray-400 px-8 py-20 text-center">
        <h2 className="mb-6 text-xl font-bold tracking-wide text-gray-900 uppercase">
          Why envkit
        </h2>
        <ul className="mx-auto grid max-w-2xl gap-2 text-left font-medium text-gray-800">
          <li>✔ Secure by default</li>
          <li>✔ CLI-first, works in any stack</li>
          <li>✔ Zero config onboarding</li>
        </ul>
      </section>

      {/* Footer Call to Action */}
      <footer className="border-t border-gray-400 px-8 py-20 text-center">
        <h2 className="mb-6 text-2xl font-extrabold tracking-wide text-gray-900">
          Start syncing in seconds
        </h2>
        <Button
          asChild
          size="lg"
          className="rounded-none border border-gray-700 bg-[#f8f6f1] px-6 py-2 font-bold text-gray-900 hover:bg-[#e0dbd0]"
        >
          <a href="/signup">Sign Up Free</a>
        </Button>
        <div className="mt-6 flex justify-center gap-6 text-sm text-gray-700">
          <a href="/docs" className="hover:underline">
            Docs
          </a>
          <a href="https://github.com/" className="hover:underline">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
