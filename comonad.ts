import type { $, Kind } from "./kind.ts";
import type { Extend } from "./extend.ts";

/**
 * Comonad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#comonad
 */
export interface Comonad<U extends Kind> extends Extend<U> {
  readonly extract: <A, B, C, D>(ta: $<U, [A, B, C, D]>) => A;
}
