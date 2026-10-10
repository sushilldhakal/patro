/**
 * The client-only, code-split entry point for the "what is a day" playground.
 *
 * Same two reasons as {@link ./TwoSystemsDiagram}: a WebGL canvas has nothing
 * to say to `renderToString`, so the scene waits for a mount; and three.js
 * plus this scene is a large chunk no other Learn article should carry, so it
 * is a dynamic import. The placeholder holds the canvas height either way, so
 * the article does not jump when the chunk lands.
 */

import { lazy, Suspense, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { importWithRetry } from "@/lib/lazy-route";

import type { PlaygroundConfig } from "@/lib/learn/playground-config";

const Study = lazy(() =>
  importWithRetry(() => import("./DayPlaygroundStudy")).then((m) => ({
    default: m.DayPlaygroundStudy,
  })),
);

function Placeholder() {
  const { t } = useTranslation();
  return (
    <div
      className="mt-5 grid place-items-center rounded-2xl border border-[var(--tm-border)] bg-[color-mix(in_srgb,var(--tm-teal)_6%,transparent)] text-sm text-[var(--tm-ink-faint)]"
      style={{ height: "clamp(380px, 58vh, 620px)" }}
    >
      {t("learn.diagrams.scene_loading")}
    </div>
  );
}

const noopSubscribe = () => () => {};

export function DayPlaygroundDiagram({
  slug,
  config,
}: {
  slug: string;
  config: PlaygroundConfig;
}) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <Placeholder />;
  return (
    <Suspense fallback={<Placeholder />}>
      <Study slug={slug} config={config} />
    </Suspense>
  );
}

export default DayPlaygroundDiagram;
