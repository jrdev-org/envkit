"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Clock, Users, Cpu, Key, Terminal, Folder } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { isLoaded, user, isSignedIn } = useUser();

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
    { label: "Active Projects", value: "12" },
    { label: "Team Members", value: "8" },
    { label: "Devices", value: "5" },
    { label: "CLI Sessions", value: "3" },
  ];

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Not signed in</div>;

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
              <Link
                href="/dashboard/projects"
                className="flex items-center gap-3 rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm transition-all hover:border-[#c0c0c0] hover:bg-[#f0f0f0]"
              >
                <Folder className="h-5 w-5 text-[#888888]" />
                <div>
                  <p className="text-sm font-semibold text-[#222222]">
                    Projects
                  </p>
                  <p className="text-xs text-[#555555]">12 active</p>
                </div>
              </Link>

              <Link
                href="/dashboard/teams"
                className="flex items-center gap-3 rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm transition-all hover:border-[#c0c0c0] hover:bg-[#f0f0f0]"
              >
                <Users className="h-5 w-5 text-[#888888]" />
                <div>
                  <p className="text-sm font-semibold text-[#222222]">Teams</p>
                  <p className="text-xs text-[#555555]">8 members</p>
                </div>
              </Link>

              <Link
                href="/dashboard/devices"
                className="flex items-center gap-3 rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm transition-all hover:border-[#c0c0c0] hover:bg-[#f0f0f0]"
              >
                <Cpu className="h-5 w-5 text-[#888888]" />
                <div>
                  <p className="text-sm font-semibold text-[#222222]">
                    Devices
                  </p>
                  <p className="text-xs text-[#555555]">5 registered</p>
                </div>
              </Link>

              <Link
                href="/dashboard/share-tokens"
                className="flex items-center gap-3 rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm transition-all hover:border-[#c0c0c0] hover:bg-[#f0f0f0]"
              >
                <Key className="h-5 w-5 text-[#888888]" />
                <div>
                  <p className="text-sm font-semibold text-[#222222]">Tokens</p>
                  <p className="text-xs text-[#555555]">Manage</p>
                </div>
              </Link>

              <Link
                href="/dashboard/cli-sessions"
                className="flex items-center gap-3 rounded-lg border border-[#e0e0e0] bg-[#ffffff] p-4 shadow-sm transition-all hover:border-[#c0c0c0] hover:bg-[#f0f0f0]"
              >
                <Terminal className="h-5 w-5 text-[#888888]" />
                <div>
                  <p className="text-sm font-semibold text-[#222222]">CLI</p>
                  <p className="text-xs text-[#555555]">3 sessions</p>
                </div>
              </Link>
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
