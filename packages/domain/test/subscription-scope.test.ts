import assert from "node:assert/strict";
import test from "node:test";
import { createSubscriptionScope, type Removable } from "../src/subscription-scope.ts";

const fake = () => {
  const s = { removed: 0, remove() { s.removed += 1; } };
  return s satisfies Removable & { removed: number };
};

test("close removes everything that was added", () => {
  const scope = createSubscriptionScope();
  const a = fake();
  const b = fake();
  assert.equal(scope.add(a), true);
  assert.equal(scope.add(b), true);
  scope.close();
  assert.deepEqual([a.removed, b.removed], [1, 1]);
  assert.equal(scope.closed, true);
});

test("RACE: a subscription that finishes starting after close removes itself", async () => {
  const scope = createSubscriptionScope();
  const late = fake();
  let resolveStart!: (s: Removable) => void;
  const starting = new Promise<Removable>((r) => (resolveStart = r));

  const run = (async () => {
    const sub = await starting; // watchHeadingAsync still pending…
    scope.add(sub);
  })();

  scope.close(); // …effect cleanup runs now, with nothing to remove yet
  resolveStart(late);
  await run;

  assert.equal(late.removed, 1, "the late arrival must be stopped, not left running");
});

test("add reports ownership so the caller can stop starting more sensors", () => {
  const scope = createSubscriptionScope();
  scope.close();
  const heading = fake();
  assert.equal(scope.add(heading), false);
  assert.equal(heading.removed, 1);
});

test("close is idempotent and each subscription is removed exactly once", () => {
  const scope = createSubscriptionScope();
  const a = fake();
  scope.add(a);
  scope.close();
  scope.close();
  assert.equal(a.removed, 1);
});

test("a subscription whose native side is already gone does not break teardown of the rest", () => {
  const scope = createSubscriptionScope();
  const ok = fake();
  scope.add({ remove() { throw new Error("native module already released"); } });
  scope.add(ok);
  assert.doesNotThrow(() => scope.close());
  assert.equal(ok.removed, 1);
});

test("Strict Mode style churn: many open/close cycles with late arrivals leave nothing running", async () => {
  const live = new Set<Removable>();
  const start = (scope: ReturnType<typeof createSubscriptionScope>, delayMs: number) =>
    new Promise<void>((resolve) =>
      setTimeout(() => {
        const sub: Removable = { remove: () => live.delete(sub) };
        live.add(sub);
        scope.add(sub);
        resolve();
      }, delayMs),
    );
  const pending: Promise<void>[] = [];
  for (let i = 0; i < 20; i += 1) {
    const scope = createSubscriptionScope();
    pending.push(start(scope, i % 3));
    if (i % 2 === 0) scope.close(); // torn down before it started
    else setTimeout(() => scope.close(), 5); // torn down after
  }
  await Promise.all(pending);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(live.size, 0);
});
