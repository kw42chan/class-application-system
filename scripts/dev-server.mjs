#!/usr/bin/env node
/**
 * Wrapper that keeps `next dev` running and restarts it on crash.
 * Run this instead of `npm run dev` to get automatic restart on failure.
 */
import { spawn } from "node:child_process";
import { EOL } from "node:os";

const PORT = process.env.PORT || 3000;
const MAX_RESTARTS = 10;
const RESTART_DELAY_MS = 2000;

let restartCount = 0;
let lastExitTime = Date.now();
let proc = null;

function start() {
  restartCount += 1;

  // If too many restarts in a short window, give up
  if (restartCount > MAX_RESTARTS) {
    const sinceLastExit = Date.now() - lastExitTime;
    if (sinceLastExit < 30000) {
      console.error(`[dev-wrapper] Too many restarts. Giving up.`);
      process.exit(1);
    }
    // Reset if enough time has passed
    restartCount = 1;
  }

  console.log(`[dev-wrapper] Starting dev server (attempt ${restartCount}) on port ${PORT}`);

  proc = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PORT },
  });

  proc.on("exit", (code, signal) => {
    lastExitTime = Date.now();
    console.error(
      `[dev-wrapper] Server exited (code=${code}, signal=${signal}). Restarting in ${RESTART_DELAY_MS}ms...${EOL}`
    );
    setTimeout(start, RESTART_DELAY_MS);
  });

  proc.on("error", (err) => {
    console.error(`[dev-wrapper] Spawn error: ${err.message}`);
    setTimeout(start, RESTART_DELAY_MS);
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[dev-wrapper] Shutting down...");
  if (proc) proc.kill("SIGTERM");
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (proc) proc.kill("SIGTERM");
  process.exit(0);
});

start();
