import type { Team } from "@/app/dashboard/page";
import {
  Users,
  Crown,
  Building2,
  User,
  Shield,
  AlertTriangle,
  Ban,
  UserX,
  MoreVertical,
  Settings,
  Clipboard,
  Trash2,
} from "lucide-react";
import { useState } from "react";

export default function TeamCard({
  team,
  role,
  members,
}: {
  team: Team;
  role: string;
  members: number;
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get state configuration
  const getStateConfig = () => {
    switch (team.state) {
      case "active":
        return {
          label: "Active",
          bgColor: "bg-green-100",
          textColor: "text-green-700",
          iconColor: "text-green-500",
          borderColor: "border-green-200",
          dotColor: "bg-green-500",
        };
      case "suspended":
        return {
          label: "Suspended",
          bgColor: "bg-orange-100",
          textColor: "text-orange-700",
          iconColor: "text-orange-500",
          borderColor: "border-orange-200",
          dotColor: "bg-orange-500",
        };
      case "full":
        return {
          label: "Full",
          bgColor: "bg-blue-100",
          textColor: "text-blue-700",
          iconColor: "text-blue-500",
          borderColor: "border-blue-200",
          dotColor: "bg-blue-500",
        };
      case "deleted":
        return {
          label: "Deleted",
          bgColor: "bg-red-100",
          textColor: "text-red-700",
          iconColor: "text-red-500",
          borderColor: "border-red-200",
          dotColor: "bg-red-500",
        };
      default:
        return {
          label: "Unknown",
          bgColor: "bg-gray-100",
          textColor: "text-gray-700",
          iconColor: "text-gray-500",
          borderColor: "border-gray-200",
          dotColor: "bg-gray-500",
        };
    }
  };

  const stateConfig = getStateConfig();
  const isOwner = role.includes("owner");
  const isAdmin = role.includes("admin");
  const isPersonal = team.type === "personal";
  const isDeleted = team.state === "deleted";
  const isFull = team.state === "full";

  // Get state icon
  const getStateIcon = () => {
    switch (team.state) {
      case "suspended":
        return <Ban className="h-4 w-4" />;
      case "full":
        return <UserX className="h-4 w-4" />;
      case "deleted":
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div
      className={`group relative rounded-xl border ${stateConfig.borderColor} bg-white transition-all duration-200 hover:shadow-lg ${isDeleted ? "opacity-60" : ""}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {/* Team Icon */}
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${
                isDeleted
                  ? "bg-gray-100"
                  : "bg-gradient-to-br from-neutral-100 to-neutral-200"
              } shadow-md`}
            >
              {isPersonal ? (
                <User className="h-6 w-6 text-black" />
              ) : (
                <Building2 className="h-6 w-6 text-black" />
              )}
            </div>

            {/* Team Info */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-gray-900">
                  {team.name}
                </h3>
                {isOwner && (
                  <Crown
                    className="h-4 w-4 flex-shrink-0 text-amber-500"
                    xlinkTitle="Owner"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500 capitalize">
                  {isPersonal ? "Personal" : "Organization"}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-gray-500 capitalize">{role}</span>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-2 opacity-0 transition-colors group-hover:opacity-100 hover:bg-gray-100"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                {isOwner && (
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                    Delete Team
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          {/* Description */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <Clipboard className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm font-semibold text-gray-900">
                {team.description ?? "No description"}
              </p>
            </div>
          </div>
          {/* Members */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <Users className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Members</p>
              <p className="text-lg font-semibold text-gray-900">
                {members}
                {team.maxMembers && (
                  <span className="text-sm font-normal text-gray-500">
                    /{team.maxMembers}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* State */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${stateConfig.bgColor} border ${stateConfig.borderColor}`}
            >
              <div className={stateConfig.iconColor}>{getStateIcon()}</div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${stateConfig.dotColor} animate-pulse`}
                ></div>
                <p className={`text-sm font-semibold ${stateConfig.textColor}`}>
                  {stateConfig.label}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {isFull && !isDeleted && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <p className="text-xs text-blue-700">
              Team has reached maximum capacity. Remove members or upgrade to
              add more.
            </p>
          </div>
        )}

        {team.state === "suspended" && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
            <Ban className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
            <p className="text-xs text-orange-700">
              This team has been suspended. Contact support for more
              information.
            </p>
          </div>
        )}

        {/* Last Action */}
        {team.lastAction && !isDeleted && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <p className="mb-1 text-xs text-gray-500">Last action:</p>
            <code className="font-mono text-xs text-gray-800">
              {team.lastAction}
            </code>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="text-xs text-gray-400">
            {isDeleted && team.deletedAt ? (
              <span>Deleted {formatDate(team.deletedAt)}</span>
            ) : (
              <span>Created {formatDate(team._creationTime)}</span>
            )}
          </div>
          {team.updatedAt && (
            <div className="text-xs text-gray-400">
              Updated {formatDate(team.updatedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Hover overlay for active teams */}
      {!isDeleted && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-5" />
      )}
    </div>
  );
}
