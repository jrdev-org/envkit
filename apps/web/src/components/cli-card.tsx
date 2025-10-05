import type { CliSession } from "@/app/dashboard/page";
import type { Id } from "@envkit/db/env";
import {
  Terminal,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Key,
  Activity,
} from "lucide-react";

export default function CliSessionCard({
  cliSession,
}: {
  cliSession: CliSession;
}) {
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

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Check if session is expired
  const isExpired = cliSession.expiresAt < Date.now();
  const isRevoked = cliSession.revokedAt !== undefined;
  const isPending = cliSession.status === "pending";
  const isAuthenticated = cliSession.status === "authenticated";

  // Get status config
  const getStatusConfig = () => {
    if (isRevoked) {
      return {
        label: "Revoked",
        icon: ShieldAlert,
        bgColor: "bg-red-100",
        textColor: "text-red-700",
        iconColor: "text-red-500",
        borderColor: "border-red-200",
        cardBg: "bg-red-50/30",
      };
    }
    if (isExpired) {
      return {
        label: "Expired",
        icon: AlertCircle,
        bgColor: "bg-gray-100",
        textColor: "text-gray-700",
        iconColor: "text-gray-500",
        borderColor: "border-gray-200",
        cardBg: "bg-gray-50/30",
      };
    }
    if (isPending) {
      return {
        label: "Pending",
        icon: Shield,
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
        iconColor: "text-yellow-500",
        borderColor: "border-yellow-200",
        cardBg: "bg-yellow-50/30",
      };
    }
    return {
      label: "Active",
      icon: ShieldCheck,
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      iconColor: "text-green-500",
      borderColor: "border-green-200",
      cardBg: "bg-green-50/30",
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`relative rounded-xl border ${statusConfig.borderColor} overflow-hidden bg-white transition-all duration-200 hover:shadow-lg`}
    >
      {/* Status Accent Bar */}
      <div className={`h-1 ${statusConfig.bgColor}`}></div>

      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${statusConfig.cardBg} border ${statusConfig.borderColor}`}
            >
              <Terminal className={`h-5 w-5 ${statusConfig.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  CLI Session
                </h3>
              </div>
              <p className="truncate font-mono text-xs text-gray-500">
                {cliSession.deviceId.slice(0, 16)}...
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${statusConfig.bgColor} flex-shrink-0`}
          >
            <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.iconColor}`} />
            <span className={`text-xs font-medium ${statusConfig.textColor}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* User Agent */}
        {cliSession.userAgent && (
          <div className="mb-4 rounded-lg bg-gray-50 p-2.5">
            <p className="truncate text-xs text-gray-600">
              {cliSession.userAgent}
            </p>
          </div>
        )}

        {/* Session Details */}
        <div className="space-y-2.5">
          {/* Last Used */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <Activity className="h-3.5 w-3.5" />
              <span>Last active</span>
            </div>
            <span className="font-medium text-gray-700">
              {formatRelativeTime(cliSession.lastUsedAt)}
            </span>
          </div>

          {/* Expiry */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{isExpired ? "Expired" : "Expires"}</span>
            </div>
            <span
              className={`font-medium ${isExpired ? "text-red-600" : "text-gray-700"}`}
            >
              {formatDate(cliSession.expiresAt)}
            </span>
          </div>

          {/* Token Type */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <Key className="h-3.5 w-3.5" />
              <span>Token type</span>
            </div>
            <span className="font-medium text-gray-700">
              {cliSession.permanentToken ? "Permanent" : "Temporary"}
            </span>
          </div>

          {/* Revoked At */}
          {isRevoked && (
            <div className="border-t border-gray-100 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-red-600">Revoked</span>
                <span className="text-red-600">
                  {cliSession.revokedAt
                    ? formatDate(cliSession.revokedAt)
                    : "Never"}
                </span>
              </div>
            </div>
          )}

          {/* Last Action */}
          {cliSession.lastAction && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs">
                <span className="mb-1 block text-gray-500">Last action:</span>
                <code className="block truncate rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">
                  {cliSession.lastAction}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Created */}
        <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
          Created {formatDate(cliSession._creationTime)}
        </div>
      </div>
    </div>
  );
}
