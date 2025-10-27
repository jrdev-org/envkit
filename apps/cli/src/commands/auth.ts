#!/usr/bin/env node
import * as crypto from "node:crypto";
import { CLI_VERSION } from "@cli/constants.js";
import { api } from "@cli/index.js";
import {
  getStoredAuthToken,
  requireAuthToken,
  revokeSesion,
  startAuthServer,
  storeAuthToken,
} from "@cli/lib/auth.js";
import { getDeviceInfo } from "@cli/lib/device.js";
import { env } from "@cli/lib/env.js";
import { log } from "@cli/lib/logger.js";
import { pickAvailablePort } from "@cli/lib/port.js";
import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import open from "open";

export async function runAuth() {
  // ensure user isn't already logged in
  const existing = await getStoredAuthToken();
  if (existing) {
    log.info(
      `You are already logged in. Please run ${chalk.bold(
        "envkit auth logout"
      )} to log out.`
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
      const res = await api.users[":userId"].devices.$get({
        param: {
          userId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const { devices } = data;
        const deviceExists = devices.some(
          (d) => d.deviceId === deviceInfo.deviceId
        );
        if (!deviceExists) {
          const res = await api.devices.register.$post({
            json: {
              ...deviceInfo,
              cliVersion: CLI_VERSION,
              ownerId: userId,
            },
          });
          if (res.ok) {
            log.info("Device registered!");
          }
          const err = await res.text();
          log.trace(err);
        }
        const err = await res.text();
        log.trace(err);
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
    const res = await api.cli.init.$post({
      json: {
        deviceId: deviceInfo.deviceId,
        authTokenHash: crypto.randomBytes(32).toString("hex"),
        expiresAt: Date.now() + 3600 * 1000,
      },
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

    // Clean up auth server
    if (authServerStop) authServerStop();

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
}

const authCmd = new Command("auth")
  .alias("login")
  .description("Authenticate with envkit")
  .action(runAuth);

const logoutCmd = new Command("logout")
  .alias("bye")
  .description("Log out of the current session")
  .action(async () => {
    const token = await requireAuthToken();
    const res = await revokeSesion(token.sessionId);
    if (res.includes("NO_AUTH")) {
      log.info("No auth token found, please login!");
    } else if (res.includes("ERR")) {
      log.error(res.split("ERR: ")[1]);
    } else {
      log.success("Logged out successfully!");
    }
    process.exit(0);
  });

const whoamiCmd = new Command("whoami")
  .description("Get information about the current user")
  .action(async () => {
    const token = await requireAuthToken();
    const res = await safeCall(
      async () => await dbApi.users.get(token.userId)
    )();
    if ("error" in res) {
      log.error(res.error);
    } else {
      log.info(`Logged in as ${res.name}`);
    }
    process.exit(0);
  });

export { authCmd, logoutCmd, whoamiCmd };
