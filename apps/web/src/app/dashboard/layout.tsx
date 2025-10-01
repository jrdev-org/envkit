"use client";

import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import Breadcrumbs from "@/components/breadcrumbs";

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 text-neutral-600">
      {/* Top bar */}
      <div className="border-neural-700 fixed top-0 right-0 left-0 z-10 flex items-center justify-between border-b px-6 py-4 backdrop-blur-2xl">
        <div>
          <Breadcrumbs />
        </div>
        <div>
          <UserButton afterSwitchSessionUrl="/dashboard" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 pt-12">{children}</div>
    </main>
  );
}
