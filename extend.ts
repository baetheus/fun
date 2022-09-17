import type { $, Kind, TypeClass } from "./kind.ts";
import type { Functor } from "./functor.ts";

/**
 * Extend
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#extend
 */
export interface Extend<U extends Kind> extends Functor<U>, TypeClass<U> {
  readonly extend: <A, I, B, C, D>(
    ftai: (t: $<U, [A, B, C, D]>) => I,
  ) => (ta: $<U, [A, B, C, D]>) => $<U, [I, B, C, D]>;
}
