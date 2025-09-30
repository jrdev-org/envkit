import { detect } from "detect-port";
import { log } from "./logger.js";

export async function pickAvailablePort(): Promise<number> {
  const ports = [52000, 52001, 52002, 52010, 52100];

  for (const port of ports) {
    const available = await detect(port);
    if (available === port) {
      return port;
    }
  }

  const port = await detect(3001);
  if (port !== 3001) {
    log.warn(`Port 3001 in use, switching to port ${port}`);
    return port;
  }

  return port;
}
