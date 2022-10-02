import type { $, Kind, TypeClass } from "./kind.ts";
import type { Functor } from "./functor.ts";

/**
 * Extend
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#extend
 */
export interface Extend<U extends Kind> extends Functor<U>, TypeClass<U> {
  readonly extend: <A, I, B, C, D, E>(
    ftai: (t: $<U, [A, B, C], [D], [E]>) => I,
  ) => (ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]>;
}
