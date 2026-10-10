/**
 * The client-only, code-split entry point for the सौरमान/चान्द्रमान scene.
 *
 * Two things stand between an article and a Three.js canvas. The article shell
 * is prerendered, and a WebGL canvas has nothing to say to `renderToString` —
 * so the scene waits for a mount before it exists at all. And three.js plus
 * this scene is a large chunk that every other Learn article would otherwise
 * carry for nothing, so it is a dynamic import: the reader who opens *this*
 * article pays for it, and nobody else does.
 *
 * The placeholder holds the canvas's height either way, so the article does
 * not jump when the chunk lands.
 */

import { lazy, Suspense, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { importWithRetry } from "@/lib/lazy-route";

const Study = lazy(() =>
  importWithRetry(() => import("./TwoSystemsStudy")).then((m) => ({ default: m.TwoSystemsStudy })),
);

function Placeholder() {
  const { t } = useTranslation();
  return (
    <div
      className="mt-5 grid place-items-center rounded-2xl border border-[var(--tm-border)] bg-[color-mix(in_srgb,var(--tm-teal)_6%,transparent)] text-sm text-[var(--tm-ink-faint)]"
      style={{ height: "clamp(340px, 52vh, 560px)" }}
    >
      {t("learn.diagrams.scene_loading")}
    </div>
  );
}

/**
 * Client-only, said the way React wants it heard: the server snapshot is
 * `false` and the client snapshot is `true`, so hydration matches the
 * prerendered placeholder and then swaps. Nothing ever subscribes, hence the
 * no-op subscribe.
 */
const noopSubscribe = () => () => {};

export function TwoSystemsDiagram() {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <Placeholder />;
  return (
    <Suspense fallback={<Placeholder />}>
      <Study />
    </Suspense>
  );
}

export default TwoSystemsDiagram;
