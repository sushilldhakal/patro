/**
 * The one translator both apps use.
 *
 * Copy lives in `strings.ts` and is generated into `ne.json` / `en.json`; this
 * module looks keys up in those bundles, fills `{{name}}` values, and holds the
 * current UI language. It has no React and no platform code — the React hooks
 * are in `./react`, and each app only decides where the chosen language is
 * stored (localStorage on the website, SecureStore in the app).
 *
 * Behaviour follows what the website had with i18next, so nothing on screen
 * changes: a missing key gives `defaultValue` or the key itself, a missing
 * `{{value}}` becomes empty, a missing English string falls back to Nepali,
 * and `returnObjects` hands back lists (the SEO FAQ blocks) with their values
 * filled in.
 */

export type Lang = "ne" | "en";

export const LANGUAGES: readonly Lang[] = ["ne", "en"];

/** New visitors read Nepali; it is also the fallback for missing English copy. */
export const FALLBACK_LANGUAGE: Lang = "ne";

type Bundle = Record<string, unknown>;

export type TranslateOptions = {
  /** Language to read, instead of the current one. */
  lng?: string;
  /** Returned when the key is missing. */
  defaultValue?: string;
  /** Return a list/object value as is (with values filled in) instead of the key. */
  returnObjects?: boolean;
  /** Values for `{{name}}` placeholders. */
  [value: string]: unknown;
};

/** The `t` both apps call. `returnObjects` values come back typed as the caller asks. */
export type TFunction = {
  (key: string, options?: TranslateOptions): string;
  <T>(key: string, options: TranslateOptions & { returnObjects: true }): T;
};

const bundles: Partial<Record<Lang, Bundle>> = {};

/** English is code-split on the website; this fetches it the first time it is needed. */
let loadBundle: ((lang: Lang) => Promise<Bundle>) | null = null;
const loading: Partial<Record<Lang, Promise<void>>> = {};

/** Normalize any language code ("en-US", "NE", undefined) to a supported language. */
export function toLang(code: string | null | undefined): Lang {
  return (code ?? "").slice(0, 2).toLowerCase() === "en" ? "en" : "ne";
}

// ─── Bundles ─────────────────────────────────────────────────────────────────

/** Bumped whenever a bundle arrives, so hooks re-render even when the language itself did not change. */
let version = 0;

export function registerBundle(lang: Lang, bundle: Bundle): void {
  bundles[lang] = bundle;
  version++;
  emit();
}

export function hasBundle(lang: Lang): boolean {
  return bundles[lang] !== undefined;
}

/** How to fetch a bundle that was not registered up front (the website's English). */
export function setBundleLoader(loader: (lang: Lang) => Promise<Bundle>): void {
  loadBundle = loader;
}

/** Make sure a language's bundle is present; resolves at once when it already is. */
export function ensureBundle(lang: Lang): Promise<void> {
  if (hasBundle(lang)) return Promise.resolve();
  if (!loadBundle) return Promise.resolve();
  loading[lang] ??= loadBundle(lang).then((bundle) => registerBundle(lang, bundle));
  return loading[lang]!;
}

// ─── Current language ────────────────────────────────────────────────────────

let requested: Lang = FALLBACK_LANGUAGE;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of [...listeners]) listener();
}

/**
 * The language the UI is actually in. When English is chosen but its bundle is
 * still loading the UI is genuinely Nepali, so that is what this reports —
 * otherwise a value memoized in that window would stay Nepali under an English
 * label.
 */
export function getLanguage(): Lang {
  return hasBundle(requested) ? requested : FALLBACK_LANGUAGE;
}

/** Changes on any language or bundle change — what the React hooks watch. */
export function getStateKey(): string {
  return `${getLanguage()}:${version}`;
}

/** The language the reader picked, even while its bundle is loading. */
export function getRequestedLanguage(): Lang {
  return requested;
}

export async function setLanguage(code: string): Promise<void> {
  const next = toLang(code);
  const changed = next !== requested;
  requested = next;
  if (changed) emit();
  await ensureBundle(next);
}

/** Called whenever the language or a bundle changes. Returns the unsubscribe. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ─── Lookup ──────────────────────────────────────────────────────────────────

function lookup(bundle: Bundle | undefined, key: string): unknown {
  let node: unknown = bundle;
  for (const segment of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

/** Fill `{{name}}` from `values`. A value that was not passed becomes empty, as with i18next. */
export function interpolate(template: string, values?: Record<string, unknown>): string {
  return template.replace(/\{\{\s*-?\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const value = values?.[name];
    return value === undefined || value === null ? "" : String(value);
  });
}

function fill(value: unknown, values: Record<string, unknown>): unknown {
  if (typeof value === "string") return interpolate(value, values);
  if (Array.isArray(value)) return value.map((item) => fill(item, values));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, values)]));
  }
  return value;
}

/** Raw catalogue value in a language, falling back to Nepali. */
export function lookupKey(lang: Lang, key: string): unknown {
  return lookup(bundles[lang], key) ?? (lang === FALLBACK_LANGUAGE ? undefined : lookup(bundles[FALLBACK_LANGUAGE], key));
}

/** Catalogue lookup in a given language. */
export function translate(lang: Lang, key: string, options?: TranslateOptions): string;
export function translate<T>(lang: Lang, key: string, options: TranslateOptions & { returnObjects: true }): T;
export function translate(lang: Lang, key: string, options: TranslateOptions = {}): unknown {
  const value = lookupKey(options.lng ? toLang(options.lng) : lang, key);
  if (typeof value === "string") return interpolate(value, options);
  if (value !== undefined && options.returnObjects) return fill(value, options);
  return options.defaultValue ?? key;
}

/** Read a key that holds a list (the SEO FAQ blocks); empty when missing. */
export function translateList<T>(lang: Lang, key: string): T[] {
  const value = lookupKey(lang, key);
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Catalogue lookup in a language the caller names — a component told to show
 * English by its props or URL. If that language's bundle is not loaded yet it
 * is fetched (hooks re-render when it lands) and Nepali shows meanwhile.
 * `undefined` means the current language.
 */
export function tFor(code: string | null | undefined, key: string, options?: TranslateOptions): string {
  const lang = code ? toLang(code) : getLanguage();
  if (!hasBundle(lang)) void ensureBundle(lang);
  return translate(lang, key, options);
}

const translators = new Map<Lang, TFunction>();

/** A `t` bound to one language. The same function is returned each time, so it is safe in deps. */
export function getT(lang: Lang = getLanguage()): TFunction {
  let t = translators.get(lang);
  if (!t) {
    t = ((key: string, options?: TranslateOptions) => translate(lang, key, options)) as TFunction;
    translators.set(lang, t);
  }
  return t;
}

/** `t` in the current language — for code outside React (SEO head, helpers). */
export const t: TFunction = ((key: string, options?: TranslateOptions) =>
  translate(getLanguage(), key, options)) as TFunction;
