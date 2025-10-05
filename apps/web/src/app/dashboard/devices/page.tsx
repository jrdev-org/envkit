"use client";
import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { api, useQuery, type Id } from "@envkit/db/env";
import type { Device, User } from "../page";
import DeviceCard from "@/components/device-card";
import LoadingSpinner from "@/components/spinner";

export default function DevicesPage() {
  const { isLoaded, user, isSignedIn } = useUser();

  const dbUser = useQuery(
    api.users.get,
    user ? { authId: user.id } : "skip",
  ) as unknown as User;

  const devices = useQuery(
    api.devices.listByUser,
    dbUser?._id ? { userId: dbUser._id } : "skip",
  ) as unknown as Device[];

  // Handle loading state
  if (!isLoaded || !user || !devices || dbUser === undefined) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/dashboard/devices`,
    });
  }

  const hasDevices = devices.length > 0;

  return (
    <main className="flex min-h-screen flex-col gap-6 p-4">
      {/* Header */}
      <div className="my-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Your Devices</h1>
        <p className="text-gray-600">
          Manage and monitor your connected devices
        </p>
      </div>
      {/* Content */}
      <div className="px-6">
        {/* Devices List */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-[#222222]">Devices</h2>
          {hasDevices ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <DeviceCard key={device._id} device={device} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-500">
                No devices yet. Create your first device to get started!
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
