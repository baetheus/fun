import type { $, Kind } from "./kind.ts";
import type { Apply } from "./apply.ts";

/**
 * Applicative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#applicative
 */
export interface Applicative<U extends Kind> extends Apply<U> {
  readonly of: <A, B, C, D>(a: A) => $<U, [A, B, C, D]>;
}
