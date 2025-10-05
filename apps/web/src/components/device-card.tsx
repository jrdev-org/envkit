import type { Device } from "@/app/dashboard/page";
import type { Id } from "@envkit/db/env";
import {
  Monitor,
  Laptop,
  Smartphone,
  HardDrive,
  Cpu,
  Terminal,
  Clock,
} from "lucide-react";

export default function DeviceCard({ device }: { device: Device }) {
  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    const iconClass = "w-5 h-5";
    switch (platform?.toLowerCase()) {
      case "darwin":
      case "macos":
        return <Laptop className={iconClass} />;
      case "win32":
      case "windows":
        return <Monitor className={iconClass} />;
      case "linux":
        return <Terminal className={iconClass} />;
      case "android":
      case "ios":
        return <Smartphone className={iconClass} />;
      default:
        return <HardDrive className={iconClass} />;
    }
  };

  // Get platform display name
  const getPlatformName = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "darwin":
        return "macOS";
      case "win32":
        return "Windows";
      case "linux":
        return "Linux";
      default:
        return platform || "Unknown";
    }
  };

  const isDeleted = device.deletedAt !== undefined;

  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 hover:shadow-lg ${
        isDeleted
          ? "border-red-200 bg-red-50/50"
          : "border-gray-300 bg-neutral-100 hover:border-gray-300"
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                isDeleted
                  ? "bg-red-100"
                  : "bg-gradient-to-br from-blue-500 to-purple-600"
              }`}
            >
              <div className="text-white">
                {getPlatformIcon(device.platform)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-gray-900">
                {device.deviceName || "Unnamed Device"}
              </h3>
              <p className="truncate text-sm text-gray-500">
                {device.username}
              </p>
            </div>
          </div>
          {isDeleted && (
            <span className="flex-shrink-0 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
              Deleted
            </span>
          )}
        </div>

        {/* Device Info Grid */}
        <div className="space-y-3">
          {/* Platform & Architecture */}
          <div className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="text-gray-600">
              {getPlatformName(device.platform)} • {device.arch}
            </span>
          </div>

          {/* Versions */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              Node {device.nodeVersion}
            </span>
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              CLI v{device.cliVersion}
            </span>
          </div>

          {/* Last Used */}
          <div className="flex items-center gap-2 border-t border-gray-100 pt-2 text-sm">
            <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="text-xs text-gray-500">
              Last used: {formatDate(device.lastUsedAt)}
            </span>
          </div>

          {/* Last Action */}
          {device.lastAction && (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">Last action:</span>{" "}
              {device.lastAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
