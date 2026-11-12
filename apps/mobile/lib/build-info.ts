import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { APP_VERSION } from "@/lib/store-links";

/**
 * Which build and which over-the-air update is running: version (build) ·
 * channel · update id and publish time, or the bundle the build shipped with.
 * So a tester can tell at a glance whether the latest push has arrived.
 */
export function runningBuildLine(): string {
  const build = `${APP_VERSION} (${Application.nativeBuildVersion ?? "?"})`;
  // Dev and simulator builds report an empty channel; show a dash rather than "· ·".
  const channel = Updates.channel || "—";
  const update =
    Updates.isEmbeddedLaunch || !Updates.updateId
      ? "embedded"
      : [Updates.updateId.slice(0, 8), Updates.createdAt?.toISOString().slice(0, 16).replace("T", " ")]
          .filter(Boolean)
          .join(" · ");
  return `${build} · ${channel} · ${update}`;
}
