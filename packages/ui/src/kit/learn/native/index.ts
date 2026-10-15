import type { LearnKit } from "../contract";
import { ArticleBody } from "./ArticleBody";

export type { ArticleBodyProps } from "../contract";
export { ArticleBody };

export const learnKit = { ArticleBody } satisfies LearnKit;
