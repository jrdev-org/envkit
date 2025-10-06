"use client";
import { use, useState } from "react";
import {
  Building2,
  User,
  Users,
  Shield,
  Check,
  AlertCircle,
} from "lucide-react";
import * as v from "valibot";
import { api, useMutation } from "@envkit/db/env";
import { useUser } from "@clerk/nextjs";
import LoadingPage from "@/components/loading-page";
import type { Id } from "@envkit/db/types";
import type { Team } from "../../page";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function safeCall<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>> | { error: string }> => {
    try {
      return await fn(...args);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  };
}

// Valibot Schema
const createTeamSchema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(3, "Team name must be at least 3 characters"),
    v.maxLength(50, "Team name must not exceed 50 characters"),
    v.regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Team name can only contain letters, numbers, spaces, hyphens, and underscores",
    ),
  ),
  type: v.picklist(["personal", "organization"], "Please select a team type"),
  maxMembers: v.optional(
    v.pipe(
      v.number(),
      v.minValue(1, "Must have at least 1 member"),
      v.maxValue(1000, "Cannot exceed 1000 members"),
    ),
  ),
  description: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, "Description must not exceed 500 characters"),
    ),
  ),
});

type CreateTeamForm = v.InferOutput<typeof createTeamSchema>;

export default function CreateTeamPage({
  params,
  searchParams,
}: {
  params: {};
  searchParams: Promise<{
    ownerId: string;
  }>;
}) {
  const { user, isLoaded } = useUser();
  const ownerId = use(searchParams).ownerId as Id<"users">;
  const [formData, setFormData] = useState<Partial<CreateTeamForm>>({
    name: "",
    type: "organization",
    maxMembers: 10,
    description: "",
  });
  const createTeam = useMutation(api.teams._new);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const router = useRouter();

  if (!isLoaded) return <LoadingPage />;

  // Handle input change
  const handleChange = (field: keyof CreateTeamForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    try {
      v.parse(createTeamSchema, formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof v.ValiError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const path = issue.path?.[0]?.key as string;
          if (path) {
            newErrors[path] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    const saltRes = await fetch("/api/salt", {
      method: "GET",
    });
    const { salt } = (await saltRes.json()) as { salt: string };
    const res = await safeCall(
      async () =>
        (await createTeam({
          name: formData.name ?? "Unnamed Team",
          ownerId,
          salt,
          type: formData.type ?? "organization",
          maxMembers: formData.maxMembers,
          description: formData.description,
        })) as Team,
    )();
    if ("error" in res) {
      toast.error(res.error);
      setIsSubmitting(false);
      // setSubmitSuccess(true);
      return;
    }
    toast.success("Team created!");
    setIsSubmitting(false);
    setSubmitSuccess(true);
    router.push(`/dashboard/teams`);
  };

  const teamTypes = [
    {
      value: "personal",
      label: "Personal",
      description: "For individual projects and personal use",
      icon: User,
      features: ["2 members", "Unlimited projects", "Basic support"],
    },
    {
      value: "organization",
      label: "Organization",
      description: "For teams and collaborative work",
      icon: Building2,
      features: [
        "Multiple members",
        "Advanced permissions",
        "Priority support",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Create New Team
          </h1>
          <p className="text-gray-600">
            Set up your team workspace to start collaborating
          </p>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">
                Team created successfully!
              </p>
              <p className="text-sm text-green-700">
                Your new team is ready to use.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="space-y-8 p-8">
            {/* Team Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Team Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full rounded-lg border px-4 py-3 ${
                  errors.name ? "border-red-300 bg-red-50" : "border-gray-300"
                } transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
                placeholder="Enter team name"
              />
              {errors.name && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.name}</span>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                3-50 characters, letters, numbers, spaces, hyphens, and
                underscores only
              </p>
            </div>

            {/* Team Type */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-900">
                Team Type *
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                {teamTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange("type", type.value)}
                      className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"
                      }`}
                    >
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}

                      <div className="mb-3 flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            isSelected ? "bg-indigo-100" : "bg-gray-100"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isSelected ? "text-indigo-600" : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`font-semibold ${
                              isSelected ? "text-indigo-900" : "text-gray-900"
                            }`}
                          >
                            {type.label}
                          </h3>
                          <p
                            className={`text-sm ${
                              isSelected ? "text-indigo-700" : "text-gray-600"
                            }`}
                          >
                            {type.description}
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-1">
                        {type.features.map((feature, idx) => (
                          <li
                            key={idx}
                            className={`flex items-center gap-2 text-xs ${
                              isSelected ? "text-indigo-700" : "text-gray-600"
                            }`}
                          >
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                isSelected ? "bg-indigo-500" : "bg-gray-400"
                              }`}
                            />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              {errors.type && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.type}</span>
                </div>
              )}
            </div>

            {/* Max Members - Only for Organization */}
            {formData.type === "organization" && (
              <div>
                <label
                  htmlFor="maxMembers"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Maximum Members
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="maxMembers"
                    type="range"
                    min="1"
                    max="100"
                    value={formData.maxMembers || 10}
                    onChange={(e) =>
                      handleChange("maxMembers", parseInt(e.target.value))
                    }
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
                  />
                  <div className="flex min-w-[100px] items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span className="font-semibold text-indigo-900">
                      {formData.maxMembers || 10}
                    </span>
                  </div>
                </div>
                {errors.maxMembers && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.maxMembers}</span>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Set the maximum number of members allowed in this team
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={`w-full rounded-lg border px-4 py-3 ${
                  errors.description
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                } resize-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
                placeholder="Describe your team's purpose and goals..."
              />
              {errors.description && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.description}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Help others understand what this team is for
                </p>
                <span
                  className={`text-xs ${
                    (formData.description?.length || 0) > 500
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {formData.description?.length || 0}/500
                </span>
              </div>
            </div>

            {/* Feature Preview */}
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-indigo-900">
                    What you'll get
                  </h4>
                  <ul className="space-y-1 text-sm text-indigo-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>Secure team workspace</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>Role-based access control</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>Team activity tracking</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-8 py-6">
            <button
              type="button"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </span>
              ) : (
                "Create Team"
              )}
            </button>
          </div>
        </form>

        {/* Info Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-1 text-sm font-semibold text-gray-900">
              Flexible Management
            </h4>
            <p className="text-xs text-gray-600">
              Add or remove members anytime
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-1 text-sm font-semibold text-gray-900">
              Secure by Default
            </h4>
            <p className="text-xs text-gray-600">
              Enterprise-grade security included
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-1 text-sm font-semibold text-gray-900">
              Easy Setup
            </h4>
            <p className="text-xs text-gray-600">
              Get started in under a minute
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
