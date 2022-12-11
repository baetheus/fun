import type { $, Kind, TypeClass } from "./kind.ts";
import type { Apply } from "./apply.ts";

/**
 * Applicative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#applicative
 */
export interface Applicative<U extends Kind> extends Apply<U>, TypeClass<U> {
  readonly of: <A, B = never, C = never, D = unknown, E = unknown>(
    a: A,
  ) => $<U, [A, B, C], [D], [E]>;
}
