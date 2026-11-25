#!/usr/bin/env node
// `npm start` / `npm run start:dev-client`: Expo against the Rust server on this Mac
// (apps/rust/scripts/dev-local.sh, port 8000), so local Surya/Drik data and the Moshier
// fallbacks can be tested. The app gets this Mac's LAN address, which a simulator and a phone
// on the same Wi-Fi both reach. `npm run start:prod` keeps the production API.
//
// Only `expo start` reads this; EAS builds and `eas update` never run it.
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const port = process.env.PATRO_LOCAL_API_PORT || "8000";
const lan = Object.values(networkInterfaces())
  .flat()
  .find((a) => a && a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254."));
const host = lan?.address ?? "127.0.0.1";
const env = { ...process.env };
if (!env.EXPO_PUBLIC_API_BASE_URL) env.EXPO_PUBLIC_API_BASE_URL = `http://${host}:${port}`;
console.log(`API: ${env.EXPO_PUBLIC_API_BASE_URL}  (start it with apps/rust/scripts/dev-local.sh)`);

const child = spawn("npx", ["expo", "start", ...process.argv.slice(2)], { stdio: "inherit", env });
child.on("exit", (code, signal) => (signal ? process.kill(process.pid, signal) : process.exit(code ?? 0)));
