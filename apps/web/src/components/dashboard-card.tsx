import type {
  Team,
  Project,
  User,
  ShareToken,
  CliSession,
  Device,
  TeamMember,
} from "@/app/dashboard/page";
import { api, useQuery, type Id } from "@envkit/db/env";
import { Folder, Users, Key, Terminal, Cpu } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "./spinner";

const CARD_CONFIG: Record<
  "projects" | "teams" | "tokens" | "cli" | "devices",
  {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  projects: { label: "Projects", href: "/dashboard/projects", icon: Folder },
  teams: { label: "Teams", href: "/dashboard/teams", icon: Users },
  tokens: { label: "Tokens", href: "/dashboard/share-tokens", icon: Key },
  cli: { label: "CLI", href: "/dashboard/cli-sessions", icon: Terminal },
  devices: { label: "Devices", href: "/dashboard/devices", icon: Cpu },
};

function useProjectsData(userId: Id<"users">) {
  const teams = useQuery(api.teams.get, { id: userId }) as Team[] | undefined;
  const team = teams?.find((t) => t.type === "personal")?._id;
  const projects = useQuery(api.projects.list, {
    teamId: team ?? ("skip" as any),
  }) as Project[] | undefined;
  return {
    isLoading: !teams || !projects,
    count: projects?.length ?? 0,
  };
}

function useTeamsData(userId: Id<"users">) {
  const teams = useQuery(api.teams.get, { id: userId }) as Team[] | undefined;
  const personalTeams = teams?.filter((t) => t.type === "personal");
  const organizationTeams = teams?.filter((t) => t.type === "organization");
  return {
    isLoading: !teams,
    personalTeamsCount: personalTeams?.length ?? 0,
    organizationTeamsCount: organizationTeams?.length ?? 0,
  };
}

function useTokensData(userId: Id<"users">) {
  const tokens = useQuery(api.tokens.listByUser, { userId }) as
    | ShareToken[]
    | undefined;
  return {
    isLoading: !tokens,
    count: tokens?.length ?? 0,
  };
}

function useDevicesData(userId: Id<"users">) {
  const devices = useQuery(api.devices.listByUser, { userId }) as
    | Device[]
    | undefined;
  return {
    isLoading: !devices,
    count: devices?.length ?? 0,
  };
}

function useCliSessionsData(userId: Id<"users">) {
  const sessions = useQuery(api.cli.listByUser, { userId }) as
    | CliSession[]
    | undefined;
  return {
    isLoading: !sessions,
    count: sessions?.length ?? 0,
  };
}

export default function DashboardCard({
  type,
  user,
}: {
  type: "projects" | "teams" | "tokens" | "cli" | "devices";
  user: User;
}) {
  const config = CARD_CONFIG[type];
  const Icon = config.icon;

  let isLoading = true;
  let text = "";

  if (type === "projects") {
    const { isLoading: l, count } = useProjectsData(user._id);
    isLoading = l;
    text = `${count} active`;
  }

  if (type === "teams") {
    const {
      isLoading: l,
      personalTeamsCount,
      organizationTeamsCount,
    } = useTeamsData(user._id);
    isLoading = l;
    text = `${personalTeamsCount} personal,${organizationTeamsCount} organization`;
  }

  if (type === "tokens") {
    const { isLoading: l, count } = useTokensData(user._id);
    isLoading = l;
    text = `${count} active`;
  }

  if (type === "cli") {
    const { isLoading: l, count } = useCliSessionsData(user._id);
    isLoading = l;
    text = `${count} active`;
  }

  if (type === "devices") {
    const { isLoading: l, count } = useDevicesData(user._id);
    isLoading = l;
    text = `${count} registered`;
  }

  return (
    <Link
      href={config.href}
      className="flex items-center gap-3 rounded-lg border border-[#e0e0e0] bg-[#fff] p-4 shadow-sm transition-all hover:border-[#c0c0c0] hover:bg-[#f0f0f0]"
    >
      <Icon className="h-5 w-5 text-[#888]" />
      <div>
        <p className="text-sm font-semibold text-[#222]">{config.label}</p>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <p className="text-xs text-[#555]">{text}</p>
        )}
      </div>
    </Link>
  );
}
