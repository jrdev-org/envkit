"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Clock, Users, Cpu, Key, Terminal, Folder } from "lucide-react";
import { toast } from "sonner";
import { api, useQuery } from "@envkit/db/env";
import { type Doc } from "@envkit/db/types";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/spinner";
import DashboardCard from "@/components/dashboard-card";

export type Project = Doc<"projects">;
export type User = Doc<"users">;
export type Device = Doc<"devices">;
export type CliSession = Doc<"cliSessions">;
export type Variable = Doc<"variables">;
export type Salt = Doc<"salts">;
export type Team = Doc<"teams">;
export type ShareToken = Doc<"shareTokens">;
export type TeamMember = Doc<"teamMembers">;

export default function DashboardPage() {
  const { isLoaded, user, isSignedIn } = useUser();
  const dbUser = useQuery(api.users.get, {
    authId: user ? user.id : "skip",
  }) as User | undefined;
  if (!isLoaded)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  if (!isSignedIn) return <div>Not signed in</div>;
  if (!dbUser) return <div>Loading user...</div>;
  // Mock recent activities
  const recentActivities = [
    {
      id: 1,
      type: "project",
      title: "E-commerce Platform",
      action: "Updated",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "team",
      title: "Sarah Chen joined",
      action: "Team update",
      time: "5 hours ago",
    },
    {
      id: 3,
      type: "device",
      title: "MacBook Pro",
      action: "Registered",
      time: "1 day ago",
    },
    {
      id: 4,
      type: "cli",
      title: "CLI Session started",
      action: "Authentication",
      time: "2 days ago",
    },
    {
      id: 5,
      type: "project",
      title: "Mobile App v2",
      action: "Created",
      time: "3 days ago",
    },
  ];

  // Mock stats
  const stats = [
    { label: "Projects Created This Month", value: 3 },
    { label: "Active CLI Sessions", value: 2 },
    { label: "Devices Registered This Week", value: 1 },
    { label: "Variables Stored", value: 42 },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9] py-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between px-6">
        <div>
          <h1 className="text-3xl font-bold text-[#222222]">
            Hi, {user.fullName}!
          </h1>
          <p className="mt-1 text-sm text-[#555555]">
            Welcome back to your dashboard
          </p>
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

      <main className="px-6">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm"
            >
              <p className="text-2xl font-bold text-[#222222]">{stat.value}</p>
              <p className="text-xs text-[#555555]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Links - Compact Cards */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-[#222222]">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DashboardCard type="projects" user={dbUser} />
              <DashboardCard type="devices" user={dbUser} />
              <DashboardCard type="cli" user={dbUser} />
              <DashboardCard type="tokens" user={dbUser} />
              <DashboardCard type="teams" user={dbUser} />
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[#222222]">
              Recent Activity
            </h2>
            <div className="rounded-lg border border-[#e0e0e0] bg-[#ffffff] shadow-sm">
              <div className="divide-y divide-[#f0f0f0]">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-[#f0f0f0]"
                  >
                    <div className="mt-1 rounded-full bg-[#f5f5f5] p-2">
                      <Clock className="h-3 w-3 text-[#888888]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#222222]">
                        {activity.title}
                      </p>
                      <p className="text-xs text-[#555555]">
                        {activity.action}
                      </p>
                      <p className="mt-1 text-xs text-[#777777]">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#e0e0e0] p-3 text-center">
                <Link
                  href="/dashboard/activity"
                  className="text-xs text-[#555555] hover:text-[#222222]"
                >
                  View all activity →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
