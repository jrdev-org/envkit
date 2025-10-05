import type { ShareToken } from "@/app/dashboard/page";
import {
  Link2,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Timer,
  Copy,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { useState } from "react";

export default function ShareTokenCard({ token }: { token: ShareToken }) {
  const [copied, setCopied] = useState(false);

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

  // Calculate time until expiry
  const getExpiryStatus = () => {
    const now = Date.now();
    const timeUntilExpiry = token.expiresAt - now;
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600000);
    const daysUntilExpiry = Math.floor(timeUntilExpiry / 86400000);

    if (timeUntilExpiry < 0) {
      return { label: "Expired", urgent: true };
    }
    if (hoursUntilExpiry < 24) {
      return { label: `Expires in ${hoursUntilExpiry}h`, urgent: true };
    }
    if (daysUntilExpiry < 7) {
      return { label: `Expires in ${daysUntilExpiry}d`, urgent: true };
    }
    return { label: `Expires ${formatDate(token.expiresAt)}`, urgent: false };
  };

  const isExpired = token.expiresAt < Date.now();
  const isUsed = token.usedAt !== undefined;
  const isActive = !isExpired && !isUsed;
  const expiryStatus = getExpiryStatus();

  // Copy token hash
  const handleCopy = () => {
    navigator.clipboard.writeText(token.tokenHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get status config
  const getStatusConfig = () => {
    if (isUsed) {
      return {
        label: "Used",
        icon: CheckCircle2,
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
        iconColor: "text-blue-500",
        borderColor: "border-blue-200",
        cardBg: "bg-blue-50/50",
        accentBar: "bg-gradient-to-r from-blue-400 to-blue-600",
      };
    }
    if (isExpired) {
      return {
        label: "Expired",
        icon: AlertCircle,
        bgColor: "bg-gray-100",
        textColor: "text-gray-700",
        iconColor: "text-gray-500",
        borderColor: "border-gray-300",
        cardBg: "bg-gray-50",
        accentBar: "bg-gray-400",
      };
    }
    return {
      label: "Active",
      icon: KeyRound,
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      iconColor: "text-green-500",
      borderColor: "border-green-200",
      cardBg: "bg-gradient-to-br from-green-50 to-emerald-50",
      accentBar: "bg-gradient-to-r from-green-400 to-emerald-500",
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`relative rounded-xl border ${statusConfig.borderColor} group overflow-hidden bg-white transition-all duration-200 hover:shadow-xl`}
    >
      {/* Status Accent Bar with Animation */}
      <div
        className={`h-1.5 ${statusConfig.accentBar} transition-all duration-300`}
      ></div>

      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${statusConfig.cardBg} border-2 ${statusConfig.borderColor} transition-transform group-hover:scale-105`}
            >
              <Link2 className={`h-5 w-5 ${statusConfig.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Share Token
                </h3>
                {token.singleUse && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Single Use
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="truncate font-mono text-xs text-gray-500">
                  {token.tokenHash.slice(0, 20)}...
                </p>
                <button
                  onClick={handleCopy}
                  className="rounded p-1 transition-colors hover:bg-gray-100"
                  title="Copy token"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${statusConfig.bgColor} flex-shrink-0 shadow-sm`}
          >
            <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.iconColor}`} />
            <span className={`text-xs font-semibold ${statusConfig.textColor}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Token Details */}
        <div className="space-y-3">
          {/* Link Access */}
          {token.allowLink !== undefined && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2.5">
              <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="text-xs text-gray-700">
                {token.allowLink
                  ? "Link sharing enabled"
                  : "Link sharing disabled"}
              </span>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {/* Created */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Created</span>
              </div>
              <p className="text-xs font-medium text-gray-900">
                {formatRelativeTime(token.createdAt)}
              </p>
            </div>

            {/* Expiry */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Timer className="h-3.5 w-3.5" />
                <span>Expiry</span>
              </div>
              <p
                className={`text-xs font-medium ${expiryStatus.urgent ? "text-orange-600" : "text-gray-900"}`}
              >
                {expiryStatus.label}
              </p>
            </div>
          </div>

          {/* Usage Status */}
          {isUsed ? (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Consumed by</span>
                </div>
                <span className="ml-2 truncate font-medium text-gray-900">
                  {`${token.consumedBy?.slice(0, 10)}...` || "Unknown user"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Used at</span>
                <span className="font-medium text-gray-700">
                  {token.usedAt ? formatDate(token.usedAt) : "Never"}
                </span>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-3">
              {token.lastAccessedAt ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Last accessed</span>
                  <span className="font-medium text-gray-700">
                    {formatRelativeTime(token.lastAccessedAt)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Never accessed</span>
                </div>
              )}
            </div>
          )}

          {/* Expiry Warning */}
          {isActive && expiryStatus.urgent && !isUsed && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
              <p className="text-xs text-orange-700">
                This token will expire soon. Share it quickly!
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
          <span>Project: {token.projectId.slice(-8)}</span>
          <span>ID: {token._id.slice(-8)}</span>
        </div>
      </div>

      {/* Subtle shine effect on hover */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
      )}
    </div>
  );
}
