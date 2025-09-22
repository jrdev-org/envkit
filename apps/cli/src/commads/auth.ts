#!/usr/bin/env node
import {
  clearAuthToken,
  getStoredAuthToken,
  isAuthenticated,
  startAuthServer,
  storeAuthToken,
} from "@/lib/auth.js";
import { getDeviceInfo } from "@/lib/device.js";
import { log } from "@/lib/logger.js";
import { dbApi } from "@envkit/db";
import { confirm } from "@inquirer/prompts";
import { env } from "@/lib/env.js";
import { type Id } from "@envkit/db/env";
import { Command } from "commander";
import { pickAvailablePort } from "@/lib/port.js";
import open from "open";
import * as crypto from "crypto";

const authCmd = new Command("auth")
  .alias("login")
  .description("Authenticate with envkit")
  .action(async () => {
    // ensure user isn't already logged in
    const existing = await getStoredAuthToken();
    if (existing) {
      log.info(
        "You are already logged in. Please run `envkit auth logout` to log out."
      );
      process.exit(0);
    }

    const deviceInfo = await getDeviceInfo();
    const port = await pickAvailablePort();

    const prompt = await confirm({
      message: "Press Enter to authenticate with your browser",
      default: true,
    });

    if (!prompt) {
      log.error("Authentication cancelled");
      process.exit(0);
    }

    // helper to stop auth server if present
    let authServerStop: (() => void) | undefined;

    // spinner for waiting on browser auth
    const authSpinner = log.task("Starting authentication process...");

    // spinner for storing token & completing server-side calls
    const storeSpinner = log.task("Storing auth token...");

    try {
      authSpinner.start();

      const authPromise = startAuthServer(port, env.PUBLIC_WEB_APP_URL);

      // give server a moment to bind
      await new Promise((r) => setTimeout(r, 500));

      const authUrl = `${env.PUBLIC_WEB_APP_URL}/cli/auth/${deviceInfo.deviceId}?port=${port}`;
      await open(authUrl);

      // Wait for completion from auth server
      const { userId, stop, userAgent } = await authPromise;
      authServerStop = stop;

      // success for the auth spinner
      authSpinner.succeed("Authentication successful!");

      // register/update device
      try {
        const deviceState = await dbApi.devices.getById(deviceInfo.deviceId);
        if (deviceState === "found") {
          return;
        }
        if (deviceState === "not_found") {
          const res = await dbApi.devices.register({
            userId: userId as Id<"users">,
            ...deviceInfo,
          });
          if (res.updated) log.bold("Updated your device Info");
          log.success("Device Info stored successfully");
        }
      } catch (e) {
        e instanceof Error
          ? log.error(
              e.message.includes("fetch failed") ? "Network error" : e.message
            )
          : log.error("Error registering your device");
      }

      // now handle session lookup and token persistence
      storeSpinner.start();

      // init session
      const { initialized, tempToken } = await dbApi.cli.init({
        deviceId: deviceInfo.deviceId,
        userId: userId as unknown as Id<"users">,
        userAgent: userAgent,
        tempToken: crypto.randomBytes(32).toString("hex"),
      });

      if (!initialized) {
        storeSpinner.fail("Session initialization failed! Please try again.");
        process.exit(1);
      }

      const { authenticated, permanentToken } = await dbApi.cli.completeAuth({
        sessionId: initialized._id,
        userId: initialized.userId,
        tempToken,
        permanentToken: crypto.randomBytes(32).toString("hex"),
      });

      if (!authenticated) {
        storeSpinner.fail("Authentication failed! Please try again.");
        process.exit(1);
      }

      await storeAuthToken({
        token: permanentToken,
        userId: authenticated.userId,
        deviceId: authenticated.deviceId,
        sessionId: authenticated._id,
        expiresAt: authenticated.expiresAt,
        createdAt: authenticated._creationTime,
      });

      storeSpinner.succeed("Auth token stored successfully");
      log.success(
        "run envkit pull, envkit push or envkit --help to get started!"
      );

      // Everything succeeded — return out of the handler (caller can exit if needed)
      return;
    } catch (err) {
      // Ensure whichever spinner is active gets failed
      try {
        if (authSpinner.isSpinning) authSpinner.fail("Authentication failed");
      } catch {
        /* ignore */
      }
      try {
        if (storeSpinner.isSpinning) storeSpinner.fail("Authentication failed");
      } catch {
        /* ignore */
      }

      // Make sure auth server is stopped
      try {
        if (authServerStop) authServerStop();
      } catch {
        /* ignore */
      }

      // Throw/log error consistently — using log.throw will throw an Error
      // so we catch it here to call process.exit(1) just once.
      const message =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      log.error(`Authentication failed: ${message}`);
      process.exit(1);
    }
  });

const logoutCmd = new Command("logout")
  .alias("bye")
  .description("Log out of the current session")
  .action(async () => {
    const loggedIn = await isAuthenticated();
    if (!loggedIn) {
      return log.info("No auth token found, please login!");
    } else {
      await clearAuthToken();
      log.success("Logged out successfully!");
    }
    process.exit(0);
  });

export { authCmd, logoutCmd };
