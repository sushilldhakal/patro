#!/usr/bin/env node
/**
 * expo-observe calls AppMetrics.getMainSession() on every screen focus. After a long
 * background that native object can already be released, and the throw becomes an
 * unhandled rejection (Sentry PATRO-4). Guard the call. npm ci would wipe a hand edit
 * of node_modules, so postinstall applies this.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const needle = "        const mainSession = AppMetrics.getMainSession();";
const guarded = `        // The native session can already be gone when a focus lands after a long background
        // (Sentry PATRO-4). Metrics for that one focus are skipped; the screen still opens.
        let mainSession;
        try {
            mainSession = AppMetrics.getMainSession();
        } catch (e) {
            return;
        }`;

const candidates = [
  join(root, "node_modules/expo-observe/build/integrations/expo-router/init.js"),
  join(root, "../../node_modules/expo-observe/build/integrations/expo-router/init.js"),
];

for (const file of candidates) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  if (source.includes("Sentry PATRO-4")) continue;
  if (!source.includes(needle)) continue;
  writeFileSync(file, source.replace(needle, guarded));
}
