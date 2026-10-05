/**
 * Spawns `next start`, waits for it, runs a target script, then shuts down.
 * Usage: node scripts/with-server.mjs <port> <script> [scriptArgs...]
 */
import { spawn } from "node:child_process";
import { config } from "dotenv";

// Load .env into this process so the spawned suite inherits values such as
// ADMIN_PASSWORD. Next loads .env for the server itself; the test script runs
// as a separate process and would otherwise see nothing.
config();

const [, , portArg, target, ...rest] = process.argv;
const port = Number(portArg ?? 3214);

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  { stdio: ["ignore", "pipe", "pipe"], detached: false },
);

let ready = false;
const onData = (chunk) => {
  const text = chunk.toString();
  if (!ready && /ready in/i.test(text)) {
    ready = true;
    run();
  }
};
server.stdout.on("data", onData);
server.stderr.on("data", onData);

const timeout = setTimeout(() => {
  console.error("Server did not start in time.");
  cleanup(2);
}, 60000);

async function run() {
  clearTimeout(timeout);
  try {
    const { spawn: runChild } = await import("node:child_process");
    const child = runChild(process.execPath, [target, `http://localhost:${port}`, ...rest], {
      stdio: "inherit",
    });
    child.on("exit", (code) => cleanup(code ?? 1));
  } catch (err) {
    console.error(err);
    cleanup(1);
  }
}

function cleanup(code) {
  server.kill("SIGTERM");
  setTimeout(() => {
    try {
      server.kill("SIGKILL");
    } catch {
      // already dead
    }
    process.exit(code);
  }, 1500).unref();
}

process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));