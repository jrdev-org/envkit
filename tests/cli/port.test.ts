import { describe, it, expect } from "vitest";
import { pickAvailablePort } from "../../apps/cli/src/lib/port";
import http from "http";

describe("pickAvailablePort", () => {
  it("should return an available port", async () => {
    const port = await pickAvailablePort();
    expect(port).toBeGreaterThan(0);
  });

  it("should return a different port if the default one is in use", async () => {
    const usedPort = 52000;
    const server = http.createServer().listen(usedPort);

    try {
      const port = await pickAvailablePort();
      expect(port).not.toBe(usedPort);
    } finally {
      server.close();
    }
  });
});
