/** Base autoplay interval at 1× (ms per day step). */
export const WHEEL_PLAY_BASE_MS = 900;

export const WHEEL_MAX_PLAY_SPEED = 32;

export function wheelPlayTickMs(speed: number): number {
  return Math.max(33, Math.round(WHEEL_PLAY_BASE_MS / speed));
}

export function wheelDaysPerSecond(speed: number): number {
  return 1000 / wheelPlayTickMs(speed);
}

/**
 * Human rate for the year-wheel HUD, e.g. "2 weeks / 1 sec" or "1 day / 0.9 sec".
 */
export function formatWheelPlaybackRate(
  speed: number,
  formatNum: (n: number) => string,
  pick: (ne: string, en: string) => string,
): string {
  const daysPerSec = wheelDaysPerSecond(speed);
  const fmt = (n: number) => formatNum(n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

  if (daysPerSec >= 7) {
    const weeks = daysPerSec / 7;
    return pick(`${fmt(weeks)} हप्ता / १ सेके`, `${fmt(weeks)} weeks / 1 sec`);
  }
  if (daysPerSec >= 1) {
    return pick(`${fmt(daysPerSec)} दिन / १ सेके`, `${fmt(daysPerSec)} days / 1 sec`);
  }
  const secPerDay = 1 / daysPerSec;
  return pick(`१ दिन / ${fmt(secPerDay)} सेके`, `1 day / ${fmt(secPerDay)} sec`);
}
