import type { $, Kind } from "./kind.ts";
import type { Predicate } from "./predicate.ts";

/**
 * Filterable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#filterable
 *
 * TODO; add refine method
 */
export interface Filterable<U extends Kind> {
  readonly filter: <A>(
    predicate: Predicate<A>,
  ) => <B, C, D>(ta: $<U, [A, B, C, D]>) => $<U, [A, B, C, D]>;
}
