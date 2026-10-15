import type { ShellKit } from "../contract";
import { StatCard } from "./StatCard";

export { StatCard };
export type { StatCardProps, ShellKit } from "../contract";

export const shellKit = { StatCard } satisfies ShellKit;
