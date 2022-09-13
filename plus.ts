import type { $, Kind } from "./kind.ts";
import type { Alt } from "./alt.ts";

/**
 * Plus
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#plus
 */
export type Plus<U extends Kind> = Alt<U> & {
  readonly zero: <A, B, C, D>() => $<U, [A, B, C, D]>;
};
