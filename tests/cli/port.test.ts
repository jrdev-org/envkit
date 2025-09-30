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
   const server = http.createServer();
   await new Promise<void>((resolve) => {
     server.listen(usedPort, resolve);
   });

    try {
      const port = await pickAvailablePort();
      expect(port).not.toBe(usedPort);
    } finally {
     await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
