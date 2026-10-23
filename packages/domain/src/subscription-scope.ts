/**
 * Owns a set of native subscriptions (sensor streams, listeners) whose creation
 * is asynchronous, so that tearing the owner down *while one is still being
 * created* cannot leave it running.
 *
 * The bug this exists for: a React effect starts `await watchHeadingAsync(...)`,
 * the component unmounts before the promise resolves, the effect's cleanup runs
 * with nothing to remove yet, and the subscription then arrives with no one left
 * to stop it. A scope makes the late arrival remove itself.
 */
export type Removable = { remove: () => void };

export type SubscriptionScope = {
  /** True once {@link close} has run; async callbacks should bail out when they see it. */
  readonly closed: boolean;
  /**
   * Hands a subscription to the scope. Returns `true` if it is now owned.
   * If the scope is already closed the subscription is removed immediately
   * and `false` is returned — the caller should stop starting more.
   */
  add: (sub: Removable) => boolean;
  /** Removes everything owned so far and rejects anything added later. Idempotent. */
  close: () => void;
};

export function createSubscriptionScope(): SubscriptionScope {
  let closed = false;
  const owned: Removable[] = [];
  const safeRemove = (sub: Removable) => {
    try {
      sub.remove();
    } catch {
      /* already gone (native side torn down first) */
    }
  };
  return {
    get closed() {
      return closed;
    },
    add(sub) {
      if (closed) {
        safeRemove(sub);
        return false;
      }
      owned.push(sub);
      return true;
    },
    close() {
      if (closed) return;
      closed = true;
      for (const sub of owned.splice(0)) safeRemove(sub);
    },
  };
}
