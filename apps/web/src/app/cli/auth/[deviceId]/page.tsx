"use client";
import LoadingPage from "@/components/loading-page";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useUser, RedirectToSignIn, UserButton } from "@clerk/nextjs";
import { api, useMutation } from "@envkit/db/env";
import { Terminal, AlertCircle, CheckCircle } from "lucide-react";
import { use, useState } from "react";

export default function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{
    deviceId: string;
  }>;
  searchParams: Promise<{
    port: string;
  }>;
}) {
  const { deviceId } = use(params);
  const { port } = use(searchParams);
  const { user, isLoaded, isSignedIn } = useUser();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState("null");
  const createUser = useMutation(api.users.create);

  if (!isLoaded) return <LoadingPage />;
  if (!isSignedIn) {
    return RedirectToSignIn({
      redirectUrl: `/cli/auth/${deviceId}?port=${port}`,
    });
  }

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setAuthStatus("null");

    // run health check to ensure auth server is running
    const res = await fetch(`http://localhost:${port}/health`, {
      method: "GET",
    });
    const data = (await res.json()) as { success: boolean };
    console.log("Healh check result: ", data);

    if (!data.success) {
      setIsAuthenticating(false);
      setAuthStatus("failed");
      return;
    }

    // send userId to cli
    const dbUser = await createUser({
      authId: user.id,
      name: user.fullName ?? user.firstName ?? "User",
      email: user.primaryEmailAddress?.emailAddress ?? "user@example.com",
    });
    const userRes = await fetch(
      `http://localhost:${encodeURIComponent(port)}/auth/${encodeURIComponent(dbUser.newUserId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": window.navigator.userAgent,
        },
      },
    );

    const userData = (await userRes.json()) as { success: boolean };
    console.log("User data post result: ", userData);

    if (!userData.success) {
      setIsAuthenticating(false);
      setAuthStatus("failed");
      return;
    }

    setIsAuthenticating(false);
    setAuthStatus("success");
  };

  const handleCancel = async () => {
    setIsAuthenticating(true);
    setAuthStatus("null");

    const res = await fetch(`http://localhost:${port}/cancel`, {
      method: "GET",
    });
    const data = (await res.json()) as { success: boolean };
    console.log("Cancel result: ", data);

    if (!data.success) {
      setIsAuthenticating(false);
      setAuthStatus("failed");
      return;
    }
    setIsAuthenticating(false);
    setAuthStatus("cancelled");
  };

  const resetAuth = () => {
    setAuthStatus("null");
    setIsAuthenticating(false);
  };

  if (authStatus === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-200">
        <Card className="max-w-lg border-red-200 bg-red-50 p-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">
              Authentication Failed
            </CardTitle>
            <CardDescription className="text-red-600">
              EnvKit CLI was unable to authenticate
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <button
              onClick={resetAuth}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authStatus === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-200">
        <Card className="max-w-lg border-green-200 bg-green-50 p-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 stroke-current text-green-600" />
            </div>
            <CardTitle className="text-green-800">
              Authentication Successful!
            </CardTitle>
            <CardDescription className="text-green-600">
              EnvKit CLI has been successfully authenticated
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-sm text-green-700">
              You can now close this window and use envkit commands in your
              terminal
            </p>
            <button
              onClick={() => {
                window.close();
              }}
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
            >
              Done
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authStatus === "cancelled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-200">
        <Card className="w-[300px] border-orange-200 bg-orange-50 p-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-orange-800">
              Authentication Cancelled
            </CardTitle>
            <CardDescription className="text-orange-600">
              The authentication process was cancelled
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <button
              onClick={resetAuth}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white transition-colors hover:bg-orange-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-200">
      <Card className="max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Terminal className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-gray-900">
            Authenticate EnvKit CLI
          </CardTitle>
          <CardDescription className="text-gray-600">
            Connect your local CLI to your EnvKit account to manage environment
            variables
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-center gap-3">
              <UserButton />
              <span className="text-md font-medium text-gray-700">
                Currently logged in as {user.fullName}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 text-sm font-medium text-blue-800">
              What happens next:
            </h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• CLI receives authentication token</li>
              <li>• Ready to manage your environments!</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCancel}
              disabled={isAuthenticating}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Authenticating...
                </>
              ) : (
                "Authenticate"
              )}
            </button>
          </div>

          <p className="pt-2 text-center text-xs text-gray-500">
            Having trouble? Check that your browser allows pop-ups for this site
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
