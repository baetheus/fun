import type { $, Kind, TypeClass } from "./kind.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";

/**
 * Filterable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#filterable
 *
 * TODO; add refine method
 */
export interface Filterable<U extends Kind> extends TypeClass<U> {
  readonly filter: {
    <A>(
      predicate: Predicate<A>,
    ): <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
    <A, B extends A>(
      refinement: Refinement<A, B>,
    ): <C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
  };
}
