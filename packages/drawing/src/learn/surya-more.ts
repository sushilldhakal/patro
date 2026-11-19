/**
 * All the extra Surya Siddhanta figures, chapter by chapter, merged into one
 * table that surya-figures.ts registers. copy-ok-file
 */
import { MORE_A, type FigureDef } from "./surya-more-a";
import { MORE_B } from "./surya-more-b";
import { MORE_C } from "./surya-more-c";
import { MORE_D } from "./surya-more-d";

export type { FigureDef } from "./surya-more-a";

export const MORE = { ...MORE_A, ...MORE_B, ...MORE_C, ...MORE_D } satisfies Record<string, FigureDef>;
export type MoreKey = keyof typeof MORE;
