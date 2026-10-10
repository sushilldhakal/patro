import type { ComponentType, PropsWithChildren } from "react";
import { Defs as RawDefs } from "react-native-svg";

/**
 * `<Defs>` re-typed to admit children.
 *
 * `Defs` genuinely takes children on every platform this app ships to — the
 * library's own native typings say so (`Component<PropsWithChildren>`). Bare
 * `tsc` has no platform context, though, and this project's `moduleSuffixes`
 * makes it resolve `react-native-svg`'s `.web` typings first, whose `Defs`
 * (`WebShape`, no children generic) is missing that. Re-exported here once,
 * rather than at each of this app's `<Defs>` call sites.
 */
export const Defs = RawDefs as ComponentType<PropsWithChildren>;
